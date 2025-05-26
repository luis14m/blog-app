"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import TiptapEditor from "@/components/tiptap-editor";
import { formatDistanceToNow } from "date-fns";
import { createClient } from "@/utils/supabase/client";
import { Loader2, ChevronDown } from "lucide-react";
import { createCommentFromForm } from "@/lib/actions/comment.server";
import {
  getNewCommentWithAttachments,
  getPostCommentsPaginated,
} from "@/lib/actions/comment.client";
import { FileUploadZone } from "@/components/ui/FileUploadZone";
import { TYPES_MIME } from "@/types/supabase";
import { createAttachment } from "@/lib/actions/attachment.server";
import { uploadFiles } from "@/lib/actions/attachment.client";
import type { Comment } from "@/types/supabase";
import { getHTMLFromContent } from "@/lib/utils";

interface CommentsProps {
  postId: string;
}

// Número de comentarios a cargar por página
const COMMENTS_PER_PAGE = 5;

// Crear un caché global para los comentarios
// Esto persiste entre renderizados pero se limpia al recargar la página
const commentsCache = new Map<
  string,
  {
    comments: Comment[];
    count: number;
    timestamp: number;
  }
>();

// Tiempo de expiración del caché en milisegundos (5 minutos)
const CACHE_EXPIRY = 5 * 60 * 1000;

export default function Comments({ postId }: CommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
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
  const getCachedComments = useCallback(
    (pageToLoad = 0) => {
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
    },
    [postId]
  );

  // Guardar en caché
  const setCachedComments = useCallback(
    (comments: Comment[], count: number, pageToLoad = 0) => {
      const cacheKey = `${postId}-${pageToLoad}`;
      commentsCache.set(cacheKey, {
        comments,
        count,
        timestamp: Date.now(),
      });
    },
    [postId]
  );

  // Función para cargar comentarios optimizada con caché
  const loadComments = useCallback(
    async (pageToLoad = 0, append = false) => {
      try {
        setLoadingMore(pageToLoad > 0);

        // Verificar caché primero
        const cachedData = getCachedComments(pageToLoad);

        if (cachedData) {
          console.log(
            `Usando comentarios en caché para la página ${pageToLoad}`
          );

          if (append) {
            setComments((prevComments) => [
              ...prevComments,
              ...cachedData.comments,
            ]);
          } else {
            setComments(cachedData.comments);
          }

          setTotalComments(cachedData.count);
          setHasMore(
            pageToLoad * COMMENTS_PER_PAGE + COMMENTS_PER_PAGE <
              cachedData.count
          );
          setPage(pageToLoad);
          setIsLoading(false);
          setLoadingMore(false);
          return;
        }

        // Si no hay caché, cargar de la base de datos
        console.log(
          `Cargando comentarios de la base de datos para la página ${pageToLoad}`
        );

        // Calcular el rango para paginación
        const from = pageToLoad * COMMENTS_PER_PAGE;
        const to = from + COMMENTS_PER_PAGE - 1;

        const { comments: newComments, count } = await getPostCommentsPaginated(
          postId,
          from,
          to
        );

        // Guardar en caché
        setCachedComments(newComments as Comment[], count, pageToLoad);

        // Añadir los nuevos comentarios a los existentes o reemplazar
        if (append) {
          setComments((prevComments) => [
            ...prevComments,
            ...(newComments as Comment[]),
          ]);
        } else {
          setComments(newComments as Comment[]);
        }

        setTotalComments(count);
        setHasMore(to < count - 1);
        setPage(pageToLoad);
      } catch (error: any) {
        console.error(
          "Error loading comments:",
          error.message || JSON.stringify(error)
        );
        console.error(
          `Error al cargar los comentarios: ${
            error.message || "Error desconocido"
          }`
        );
      } finally {
        setIsLoading(false);
        setLoadingMore(false);
      }
    },
    [postId, getCachedComments, setCachedComments]
  );

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
              const commentWithAttachments = await getNewCommentWithAttachments(
                payload.new.id
              );

              if (commentWithAttachments) {
                setComments((prev) => [
                  commentWithAttachments as Comment,
                  ...prev,
                ]);
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

  
  // Manejar el envío del comentario (boton Enviar)
  const handleSubmitComment = async (formData: FormData) => {
    if (!user) {
      console.error("Debes iniciar sesión para comentar");
      return;
    }

    setIsSubmitting(true);

    try {
      formData.append("userId", user.id);
      formData.append("content", JSON.stringify(content));
      formData.append("postId", postId);

      // 1. Crear el comentario y obtener el ID
      const createdComment = await createCommentFromForm(formData);
      const commentId = createdComment.id;

      // 2. Subir archivos al storage y asociarlos al comentario
      let uploadedFiles = [];
      if (attachments && attachments.length > 0) {
        const filesToUpload = attachments.filter((a) => a instanceof File);
        if (filesToUpload.length > 0) {
          uploadedFiles = await uploadFiles(filesToUpload, { type: "comments" });
          for (const file of uploadedFiles) {
            await createAttachment(
              {
                ...file,
                comment_id: commentId,
              },
              user.id
            );
          }
        }
      }

      // 3. Obtener el comentario completo con adjuntos y agregarlo al estado solo si no existe ya ese id
      const commentWithAttachments = await getNewCommentWithAttachments(commentId);
      if (commentWithAttachments) {
        setComments((prev) => {
          // Si el comentario ya existe, lo reemplaza (por si la suscripción lo agregó sin adjuntos)
          const idx = prev.findIndex((c) => c.id === commentWithAttachments.id);
          if (idx !== -1) {
            const newArr = [...prev];
            newArr[idx] = commentWithAttachments as Comment;
            return newArr;
          }
          return [commentWithAttachments as Comment, ...prev];
        });
        setContent(""); // Limpiar solo tras éxito
        setAttachments([]);
        if (formRef.current) formRef.current.reset();
      }

    
      if (formRef.current) formRef.current.reset();
    } catch (error: any) {
      console.error(error.message || "Error al agregar comentario");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cuando llegue un comentario real desde la suscripción, eliminar el temporal si existe
  useEffect(() => {
    if (!comments.length) return;
    const tempComment = comments.find((c) => c.id.startsWith("temp-"));
    if (!tempComment) return;
    // Buscar si ya llegó el comentario real (por contenido y usuario)
    const realComment = comments.find(
      (c) =>
        c.id !== tempComment.id &&
        extractPlainText(c.content) === extractPlainText(tempComment.content) &&
        c.profiles?.username === tempComment.profiles?.username
    );
    if (realComment) {
      // Reemplazar el temporal por el real (manteniendo el orden)
      setComments((prev) => {
        const idx = prev.findIndex((c) => c.id === tempComment.id);
        if (idx === -1) return prev;
        const newArr = [...prev];
        newArr[idx] = realComment;
        // Eliminar duplicados si el real ya está en la lista
        return newArr.filter((c, i) => newArr.findIndex((x) => x.id === c.id) === i);
      });
      setContent("");
      setAttachments([]);
      if (formRef.current) formRef.current.reset();
    }
  }, [comments]);

  const isValidComment = useCallback(() => {
    // Si es un objeto JSON vacío, podría parecer que tiene contenido
    if (content && typeof content === "object") {
      // Extraer el texto plano de cualquier estructura
      const plainText = extractPlainText(content);
      return plainText.trim().length >= 5;
    }

    return false;
  }, [content]);

  // Función auxiliar para extraer texto plano de cualquier estructura
  const extractPlainText = (obj: any): string => {
    if (!obj) return "";

    if (typeof obj === "string") return obj;

    if (Array.isArray(obj)) {
      return obj.map(extractPlainText).join(" ");
    }

    if (typeof obj === "object") {
      // Si es un nodo de Tiptap
      if (obj.text) return obj.text;

      // Si tiene contenido anidado
      if (obj.content) return extractPlainText(obj.content);

      // Otro tipo de objeto
      return Object.values(obj).map(extractPlainText).join(" ");
    }

    return "";
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Comentarios</h2>
      {!isLoading && user ? (
        <form ref={formRef} action={handleSubmitComment} className="space-y-4">
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
                placeholder="Escribe un comentario..."
                immediatelyRender={false}
                key={`editor-${comments.length}`}
              />
              <input
                type="hidden"
                name="content"
                value={JSON.stringify(content)}
              />

              {/* Zona de subida de archivos */}
              <FileUploadZone
                files={attachments}
                onFilesAdd={(files) =>
                  setAttachments((prev) => [...prev, ...files])
                }
                onFileRemove={(index) => {
                  setAttachments((prev) => {
                    const newFiles = [...prev];
                    newFiles.splice(index, 1);
                    return newFiles;
                  });
                }}
                accept={TYPES_MIME}
              />

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
                  <AvatarFallback>
                    {(comment.profiles?.display_name).charAt(0).toUpperCase()
                    }
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {comment.profiles?.display_name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(comment.created_at), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>

                  <div className="prose prose-sm dark:prose-invert">
                    {/* For a real app, you'd use a proper JSON content renderer here */}
                    <div
                      dangerouslySetInnerHTML={{
                        __html: getHTMLFromContent(comment.content),
                      }}
                    />
                  </div>

                  {/* Archivos adjuntos */}
                  {comment.attachments && comment.attachments.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {comment.attachments.map((attachment) => {
                        // Mostrar nombre amigable para Excel
                        let fileTypeLabel = "FILE";
                        if (
                          attachment.file_type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
                          attachment.file_type === "application/vnd.ms-excel"
                        ) {
                          fileTypeLabel = "XLSX";
                        } else if (
                          attachment.file_type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
                          attachment.file_type === "application/msword"
                        ) {
                          fileTypeLabel = "DOCX";
                        } else if (attachment.file_type) {
                          const parts = attachment.file_type.split("/");
                          if (parts.length > 1) fileTypeLabel = parts[1].toUpperCase();
                        }
                        return (
                          <a
                            key={attachment.id}
                            href={attachment.file_url}
                            download={attachment.file_name}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 p-1.5 border rounded text-sm hover:bg-accent/50 transition-colors"
                            style={{ width: "fit-content", maxWidth: "100%" }}
                          >
                            <div className="h-8 w-8 bg-muted flex items-center justify-center rounded">
                              {attachment.file_type.startsWith("image/") ? (
                                <img
                                  src={attachment.file_url}
                                  alt={attachment.file_name}
                                  className="h-8 w-8 object-cover rounded"
                                />
                              ) : (
                                <span className="text-xs">{fileTypeLabel}</span>
                              )}
                            </div>
                            <span className="truncate max-w-[160px]">
                              {attachment.file_name}
                            </span>
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
          <p className="text-muted-foreground">
            No hay comentarios aún. ¡Sé el primero en comentar!
          </p>
        </div>
      )}
    </div>
  );
}