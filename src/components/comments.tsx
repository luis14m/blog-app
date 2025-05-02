"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import TiptapEditor from "@/components/tiptap-editor";
import FileUploader from "@/components/file-uploader";
import { formatDistanceToNow } from "date-fns";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { Loader2, ChevronDown } from "lucide-react";
import { addComment } from "@/lib/actions";
import { usePathname, useRouter } from "next/navigation";

interface CommentsProps {
  postId: string;
}

// Número de comentarios a cargar por página
const COMMENTS_PER_PAGE = 5;

export default function Comments({ postId }: CommentsProps) {
  const [comments, setComments] = useState<any[]>([]);
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [showUploaderDialog, setShowUploaderDialog] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const supabase = createClient();
  const formRef = useRef<HTMLFormElement>(null);
  const pathname = usePathname();
  const router = useRouter();

  // Obtener el usuario actual
  useEffect(() => {
    async function getUser() {
      const { data } = await supabase.auth.getUser();
      setUser(data?.user || null);
      setLoading(false);
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

  // Función para cargar comentarios optimizada
  const loadComments = useCallback(async (pageToLoad = 0, append = false) => {
    try {
      setLoadingMore(pageToLoad > 0);
      
      // Calcular el rango para paginación
      const from = pageToLoad * COMMENTS_PER_PAGE;
      const to = from + COMMENTS_PER_PAGE - 1;
      
      // Consulta de comentarios con sus perfiles y limitación
      const { data, error, count } = await supabase
        .from("comments")
        .select(`
          *,
          profiles:user_id(*),
          attachments(*)
        `, { count: 'exact' })
        .eq("post_id", postId)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) {
        console.error("Error fetching comments:", error.message || JSON.stringify(error));
        return;
      }

      // Verificar si hay más comentarios para cargar
      setHasMore(count !== null && from + data.length < count);
      
      // Si hay datos, actualizar el estado
      if (data && data.length > 0) {
        setComments(prev => append ? [...prev, ...data] : data);
        setPage(pageToLoad);
      } else if (!append) {
        // Si no hay datos y no es append, mostrar lista vacía
        setComments([]);
      }
    } catch (error: any) {
      console.error("Error loading comments:", error.message || JSON.stringify(error));
      toast.error(`Error al cargar los comentarios: ${error.message || "Error desconocido"}`);
    } finally {
      setCommentsLoading(false);
      setLoadingMore(false);
    }
  }, [postId, supabase]);

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
          if (payload.eventType === "INSERT") {
            // Add new comment (will need to fetch user profile separately)
            const fetchNewComment = async () => {
              const { data: newComment } = await supabase
                .from("comments")
                .select(`
                  *,
                  profiles:user_id(*),
                  attachments(*)
                `)
                .eq("id", payload.new.id)
                .single();
              
              if (newComment) {
                setComments((prev) => [newComment, ...prev]);
              }
            };
            
            fetchNewComment();
          } else if (payload.eventType === "DELETE") {
            // Remove deleted comment
            setComments((prev) => 
              prev.filter((comment) => comment.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(commentsSubscription);
    };
  }, [postId, supabase, loadComments]);

  // Cargar más comentarios
  const handleLoadMore = useCallback(() => {
    if (!hasMore || loadingMore) return;
    loadComments(page + 1, true);
  }, [loadComments, page, hasMore, loadingMore]);

  const handleSubmitComment = async (formData: FormData) => {
    if (!user) {
      toast.error("Debes iniciar sesión para comentar");
      return;
    }

    setIsSubmitting(true);

    const localComment = {
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
      await addComment(formData);
      toast.success("Comentario agregado correctamente");
      
      // Limpiar el editor después de enviar
      setContent("");
      setAttachments([]);
      
      // Reiniciar el formulario para asegurar que el editor se actualice correctamente
      if (formRef.current) {
        formRef.current.reset();
      }
    } catch (error: any) {
      // Si hay error, eliminar el comentario local
      setComments((prev) => prev.filter((c) => c.id !== localComment.id));
      toast.error(error.message || "Error al agregar comentario");
      console.error("Error al agregar comentario:", error.message || JSON.stringify(error));
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

  const isValidComment = () => {
    return content && content.length >= 5;
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Comentarios</h2>
      
      {!loading && user ? (
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
      ) : !loading ? (
        <div className="text-center p-6 border rounded-md bg-muted/30">
          <p className="text-muted-foreground mb-4">
            Debes iniciar sesión para dejar un comentario
          </p>
          <Button asChild>
            <a href="/auth/login">Iniciar sesión</a>
          </Button>
        </div>
      ) : null}

      {commentsLoading ? (
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
                  
                  {comment.attachments?.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {comment.attachments.map((attachment: any) => {
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
      return content;
    }
    
    if (content && content.content) {
      return content.content.map((node: any) => {
        if (node.type === 'paragraph') {
          return `<p>${node.content?.map((text: any) => text.text || '').join('') || ''}</p>`;
        }
        if (node.type === 'heading') {
          const level = node.attrs?.level || 1;
          return `<h${level}>${node.content?.map((text: any) => text.text || '').join('') || ''}</h${level}>`;
        }
        return '';
      }).join('');
    }
    
    return 'No hay contenido disponible';
  } catch (error: any) {
    console.error('Error al parsear el contenido:', error.message || JSON.stringify(error));
    return `Error al mostrar el contenido: ${error.message || 'Error desconocido'}`;
  }
}