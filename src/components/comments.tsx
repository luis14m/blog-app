"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import TiptapEditor from "@/components/tiptap-editor";
import FileUploader from "@/components/file-uploader";
import { formatDistanceToNow } from "date-fns";
import { createClient } from "@/utils/supabase/client";
import { Loader2, ChevronDown } from "lucide-react";
import { createCommentFromForm } from "@/lib/actions/server";

import { getNewCommentWithAttachments, getPostCommentsPaginated } from "@/lib/actions/client";

interface CommentsProps {
  postId: string;
}

// Definimos nuestro propio tipo para evitar conflictos con el Comment de DOM
interface CommentType {
  id: string;
  content: any;
  created_at: string;
  user_id?: string;
  post_id?: string;
  profiles?: {
    username?: string;
    display_name?: string;
    avatar_url?: string;
  };
  attachments?: Array<{
    id: string;
    file_name: string;
    file_path: string;
    file_type: string;
  }>;
}

// Número de comentarios a cargar por página
const COMMENTS_PER_PAGE = 5;

// Crear un caché global para los comentarios
// Esto persiste entre renderizados pero se limpia al recargar la página
const commentsCache = new Map<string, {
  comments: CommentType[],
  count: number,
  timestamp: number
}>();

// Tiempo de expiración del caché en milisegundos (5 minutos)
const CACHE_EXPIRY = 5 * 60 * 1000;

export default function Comments({ postId }: CommentsProps) {
  const [comments, setComments] = useState<CommentType[]>([]);
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [showUploaderDialog, setShowUploaderDialog] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [totalComments, setTotalComments] = useState(0);

  const supabase = createClient();
  const formRef = useRef<HTMLFormElement>(null);

  // Obtener el usuario actual
  useEffect(() => {
    async function getUser() {
      const { data } = await supabase.auth.getUser();
      setUser(data?.user || null);
    }
    
    getUser();
    
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user || null);
      }
    );
    
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [supabase.auth]);

  // Validar el caché cuando cambie el postId
  const getCachedComments = useCallback((pageToLoad = 0) => {
    const cacheKey = `${postId}-${pageToLoad}`;
    const cachedData = commentsCache.get(cacheKey);
    
    if (!cachedData) return null;
    
    // Comprobar si el caché ha expirado
    const now = Date.now();
    if (now - cachedData.timestamp > CACHE_EXPIRY) {
      commentsCache.delete(cacheKey);
      return null;
    }
    
    return cachedData;
  }, [postId]);
  
  // Guardar en caché
  const setCachedComments = useCallback((comments: CommentType[], count: number, pageToLoad = 0) => {
    const cacheKey = `${postId}-${pageToLoad}`;
    commentsCache.set(cacheKey, {
      comments,
      count,
      timestamp: Date.now()
    });
  }, [postId]);

  // Función para cargar comentarios optimizada con caché
  const loadComments = useCallback(async (pageToLoad = 0, append = false) => {
    try {
      setLoadingMore(pageToLoad > 0);
      
      // Verificar caché primero
      const cachedData = getCachedComments(pageToLoad);
      
      if (cachedData) {
        console.log(`Usando comentarios en caché para la página ${pageToLoad}`);
        
        if (append) {
          setComments(prevComments => [...prevComments, ...cachedData.comments]);
        } else {
          setComments(cachedData.comments);
        }
        
        setTotalComments(cachedData.count);
        setHasMore(pageToLoad * COMMENTS_PER_PAGE + COMMENTS_PER_PAGE < cachedData.count);
        setPage(pageToLoad);
        setIsLoading(false);
        setLoadingMore(false);
        return;
      }
      
      // Si no hay caché, cargar de la base de datos
      console.log(`Cargando comentarios de la base de datos para la página ${pageToLoad}`);
      
      // Calcular el rango para paginación
      const from = pageToLoad * COMMENTS_PER_PAGE;
      const to = from + COMMENTS_PER_PAGE - 1;
      
      const { comments: newComments, count } = await getPostCommentsPaginated(postId, from, to);
      
      // Guardar en caché
      setCachedComments(newComments as CommentType[], count, pageToLoad);
      
      // Añadir los nuevos comentarios a los existentes o reemplazar
      if (append) {
        setComments(prevComments => [...prevComments, ...(newComments as CommentType[])]);
      } else {
        setComments(newComments as CommentType[]);
      }
      
      setTotalComments(count);
      setHasMore(to < count - 1);
      setPage(pageToLoad);
    } catch (error: any) {
      console.error("Error loading comments:", error.message || JSON.stringify(error));
      console.error(`Error al cargar los comentarios: ${error.message || "Error desconocido"}`);
    } finally {
      setIsLoading(false);
      setLoadingMore(false);
    }
  }, [postId, getCachedComments, setCachedComments]);
  
  // Invalidar caché cuando se agrega o elimina un comentario
  const invalidateCache = useCallback(() => {
    // Eliminar todo el caché relacionado con este post
    for (const key of commentsCache.keys()) {
      if (key.startsWith(postId)) {
        commentsCache.delete(key);
      }
    }
  }, [postId]);

  // Cargar comentarios iniciales
  useEffect(() => {
    loadComments();
    
    // Suscripción a cambios en comentarios
    const commentsSubscription = supabase
      .channel("comments-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "comments",
          filter: `post_id=eq.${postId}`,
        },
        (payload) => {
          // Invalidar caché cuando hay cambios
          invalidateCache();
          
          if (payload.eventType === "INSERT") {
            const fetchNewComment = async () => {
              const commentWithAttachments = await getNewCommentWithAttachments(payload.new.id);
              
              if (commentWithAttachments) {
                setComments((prev) => [commentWithAttachments as CommentType, ...prev]);
              }
            };
            
            fetchNewComment();
          } else if (payload.eventType === "DELETE") {
            // Remove deleted comment
            setComments((prev) => 
              prev.filter((comment) => comment.id !== payload.old.id!)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(commentsSubscription);
    };
  }, [postId, supabase, loadComments, invalidateCache]);

  // Cargar más comentarios
  const handleLoadMore = useCallback(() => {
    if (!hasMore || loadingMore) return;
    loadComments(page + 1, true);
  }, [loadComments, page, hasMore, loadingMore]);

  const handleSubmitComment = async (formData: FormData) => {
    if (!user) {
      console.error("Debes iniciar sesión para comentar");
      return;
    }

    setIsSubmitting(true);

    const localComment: CommentType = {
      id: `temp-${Date.now()}`,
      content: content,
      created_at: new Date().toISOString(),
      profiles: {
        display_name: user.user_metadata?.full_name || "",
        username: user.user_metadata?.username || "",
        avatar_url: user.user_metadata?.avatar_url || "",
      },
      attachments: [],
    };

    // Agregar comentario localmente
    setComments((prev) => [localComment, ...prev]);
    
    try {
      formData.append('userId', user.id);
      formData.append('content', JSON.stringify(content));
      
      await createCommentFromForm(formData);
      console.log("Comentario agregado correctamente");
      
      // Limpiar el editor después de enviar
      setContent("");
      setAttachments([]);
      
      // Reiniciar el formulario para asegurar que el editor se actualice correctamente
      if (formRef.current) {
        formRef.current.reset();
      }
      
      // Invalidar caché después de agregar un comentario
      invalidateCache();
      loadComments(0, false);
    } catch (error: any) {
      // Si hay error, eliminar el comentario local
      setComments((prev) => prev.filter((c) => c.id !== localComment.id));
      console.error(error.message || "Error al agregar comentario");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAttachmentRequest = () => {
    setShowUploaderDialog(true);
  };

  const handleUploadComplete = (files: any[]) => {
    setAttachments((prev) => [...prev, ...files]);
    setShowUploaderDialog(false);
  };

  const isValidComment = useCallback(() => {
    // Si es un objeto JSON vacío, podría parecer que tiene contenido
    if (content && typeof content === 'object') {
      // Extraer el texto plano de cualquier estructura
      const plainText = extractPlainText(content);
      return plainText.trim().length >= 5;
    }
    
    return false;
  }, [content]);

  // Función auxiliar para extraer texto plano de cualquier estructura
  const extractPlainText = (obj: any): string => {
    if (!obj) return '';
    
    if (typeof obj === 'string') return obj;
    
    if (Array.isArray(obj)) {
      return obj.map(extractPlainText).join(' ');
    }
    
    if (typeof obj === 'object') {
      // Si es un nodo de Tiptap
      if (obj.text) return obj.text;
      
      // Si tiene contenido anidado
      if (obj.content) return extractPlainText(obj.content);
      
      // Otro tipo de objeto
      return Object.values(obj).map(extractPlainText).join(' ');
    }
    
    return '';
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Comentarios</h2>
      
      {!isLoading && user ? (
        <form
          ref={formRef}
          action={handleSubmitComment}
          className="space-y-4"
        >
          <input type="hidden" name="postId" value={postId} />
          <div className="flex items-start gap-4">
            <Avatar className="h-10 w-10">
              <AvatarImage src={user.user_metadata?.avatar_url || ""} />
              <AvatarFallback>
                {user.email?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-4">
              <TiptapEditor
                content={content}
                onChange={setContent}
                onAttachmentRequest={handleAttachmentRequest}
                placeholder="Escribe un comentario..."
                immediatelyRender={false}
                key={`editor-${comments.length}`}
              />
              <input type="hidden" name="content" value={JSON.stringify(content)} />
              
              {attachments.length > 0 && (
                <div className="space-y-2 border p-3 rounded-md">
                  <h4 className="text-sm font-medium">Archivos adjuntos</h4>
                  <div className="space-y-2">
                    {attachments.map((attachment) => (
                      <div
                        key={attachment.id}
                        className="flex items-center justify-between text-sm p-2 border rounded-md"
                      >
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 bg-muted flex items-center justify-center rounded">
                            {attachment.file_type.startsWith("image/") ? (
                              <img
                                src={supabase.storage.from("attachments").getPublicUrl(attachment.file_path).data?.publicUrl}
                                alt={attachment.file_name}
                                className="h-6 w-6 object-cover rounded"
                              />
                            ) : (
                              <span className="text-xs">{attachment.file_type.split("/")[1]?.toUpperCase() || "FILE"}</span>
                            )}
                          </div>
                          <span className="truncate max-w-xs">{attachment.file_name}</span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setAttachments(attachments.filter((a) => a.id !== attachment.id));
                          }}
                        >
                          Eliminar
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex justify-end gap-2">
                <Button
                  type="submit"
                  disabled={!isValidComment() || isSubmitting}
                  size="sm"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    "Enviar"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </form>
      ) : !isLoading ? (
        <div className="text-center p-6 border rounded-md bg-muted/30">
          <p className="text-muted-foreground mb-4">
            Debes iniciar sesión para dejar un comentario
          </p>
          <Button asChild>
            <a href="/auth/login">Iniciar sesión</a>
          </Button>
        </div>
      ) : null}

      {isLoading ? (
        <div className="flex justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : comments.length > 0 ? (
        <div className="space-y-6 mt-8">
          {comments.map((comment) => (
            <div key={comment.id} className="space-y-2">
              <div className="flex items-start gap-4">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={comment.profiles?.avatar_url || ""} />
                  <AvatarFallback>
                    {(comment.profiles?.display_name || comment.profiles?.username || "Usuario")
                      .charAt(0)
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {comment.profiles?.display_name || comment.profiles?.username || "Anónimo"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  
                  <div className="prose prose-sm dark:prose-invert">
                    {/* For a real app, you'd use a proper JSON content renderer here */}
                    <div dangerouslySetInnerHTML={{ __html: getHTMLFromContent(comment.content) }} />
                  </div>
                  
                  {comment.attachments && comment.attachments.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {comment.attachments.map((attachment) => {
                        const { data } = supabase.storage.from("attachments").getPublicUrl(attachment.file_path);
                        return (
                          <a
                            key={attachment.id}
                            href={data?.publicUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 p-1.5 border rounded text-sm hover:bg-accent/50 transition-colors"
                          >
                            <div className="h-6 w-6 bg-muted flex items-center justify-center rounded">
                              {attachment.file_type.startsWith("image/") ? (
                                <img
                                  src={data?.publicUrl}
                                  alt={attachment.file_name}
                                  className="h-6 w-6 object-cover rounded"
                                />
                              ) : (
                                <span className="text-xs">{attachment.file_type.split("/")[1]?.toUpperCase() || "FILE"}</span>
                              )}
                            </div>
                            <span className="truncate max-w-xs">{attachment.file_name}</span>
                          </a>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
              <Separator className="mt-4" />
            </div>
          ))}
          
          {hasMore && (
            <div className="flex justify-center pt-2">
              <Button 
                variant="outline" 
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="w-full"
              >
                {loadingMore ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ChevronDown className="mr-2 h-4 w-4" />
                )}
                Cargar más comentarios
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8 border rounded-md bg-muted/30">
          <p className="text-muted-foreground">No hay comentarios aún. ¡Sé el primero en comentar!</p>
        </div>
      )}

      {/* File uploader dialog */}
      <Dialog open={showUploaderDialog} onOpenChange={setShowUploaderDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle>Agregar archivos adjuntos</DialogTitle>
          <FileUploader
            onUploadComplete={handleUploadComplete}
            entityType="comment"
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function getHTMLFromContent(content: any): string {
  try {
    if (typeof content === 'string') {
      try {
        // Intentar analizar el contenido como JSON si es una cadena
        const parsed = JSON.parse(content);
        return getHTMLFromContent(parsed);
      } catch {
        // Si no se puede analizar como JSON, devolver la cadena tal cual
        return content;
      }
    }
    
    if (content && content.content) {
      return content.content.map((node: any) => {
        // Párrafos
        if (node.type === 'paragraph') {
          if (!node.content) return '<p></p>';
          return `<p>${node.content.map((text: any) => {
            // Manejar diferentes tipos de marcas como negrita, cursiva, etc.
            let textContent = text.text || '';
            if (text.marks) {
              text.marks.forEach((mark: any) => {
                if (mark.type === 'bold') textContent = `<strong>${textContent}</strong>`;
                if (mark.type === 'italic') textContent = `<em>${textContent}</em>`;
                if (mark.type === 'link') textContent = `<a href="${mark.attrs.href}">${textContent}</a>`;
              });
            }
            return textContent;
          }).join('') || ''}</p>`;
        }
        
        // Encabezados
        if (node.type === 'heading') {
          const level = node.attrs?.level || 1;
          if (!node.content) return `<h${level}></h${level}>`;
          return `<h${level}>${node.content.map((text: any) => text.text || '').join('') || ''}</h${level}>`;
        }
        
        // Listas desordenadas (con viñetas)
        if (node.type === 'bulletList') {
          if (!node.content) return '<ul></ul>';
          return `<ul class="list-disc ml-4">${node.content.map((listItem: any) => {
            if (!listItem.content) return '<li></li>';
            
            return `<li>${listItem.content.map((paragraph: any) => {
              if (paragraph.type === 'paragraph') {
                if (!paragraph.content) return '';
                return paragraph.content.map((text: any) => text.text || '').join('') || '';
              }
              return '';
            }).join('') || ''}</li>`;
          }).join('') || ''}</ul>`;
        }
        
        // Listas ordenadas (numeradas)
        if (node.type === 'orderedList') {
          if (!node.content) return '<ol></ol>';
          return `<ol class="list-decimal ml-4">${node.content.map((listItem: any) => {
            if (!listItem.content) return '<li></li>';
            
            return `<li>${listItem.content.map((paragraph: any) => {
              if (paragraph.type === 'paragraph') {
                if (!paragraph.content) return '';
                return paragraph.content.map((text: any) => text.text || '').join('') || '';
              }
              return '';
            }).join('') || ''}</li>`;
          }).join('') || ''}</ol>`;
        }
        
        // Para cualquier otro tipo de nodo no manejado
        return '';
      }).join('');
    }
    
    // Si el contenido es un objeto pero no tiene la estructura esperada
    if (content && typeof content === 'object') {
      return JSON.stringify(content);
    }
    
    return 'No hay contenido disponible';
  } catch (error: any) {
    console.error('Error al parsear el contenido:', error.message || JSON.stringify(error));
    return `Error al mostrar el contenido: ${error.message || 'Error desconocido'}`;
  }
}