"use client";

import { useEffect, useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { formatDistanceToNow } from "date-fns";
import { Loader2, ChevronDown } from "lucide-react";
import { getPostCommentsPaginated, getNewCommentWithAttachments } from "@/lib/actions/comment.client";
import type { Comment } from "@/types/supabase";
import { getHTMLFromContent } from "@/lib/utils";

interface CommentsListProps {
  postId: string;
  COMMENTS_PER_PAGE?: number;
}

const DEFAULT_COMMENTS_PER_PAGE = 5;

export function CommentsList({ postId, COMMENTS_PER_PAGE = DEFAULT_COMMENTS_PER_PAGE }: CommentsListProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [totalComments, setTotalComments] = useState(0);

  // Función para cargar comentarios
  const loadComments = useCallback(
    async (pageToLoad = 0, append = false) => {
      try {
        setLoadingMore(pageToLoad > 0);
        const from = pageToLoad * COMMENTS_PER_PAGE;
        const to = from + COMMENTS_PER_PAGE - 1;
        const { comments: newComments, count } = await getPostCommentsPaginated(
          postId,
          from,
          to
        );
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
        console.error("Error loading comments:", error.message || JSON.stringify(error));
      } finally {
        setIsLoading(false);
        setLoadingMore(false);
      }
    },
    [postId, COMMENTS_PER_PAGE]
  );

  // Cargar comentarios iniciales
  useEffect(() => {
    loadComments();
    // Suscripción a cambios en comentarios (opcional, si tienes realtime)
    // Aquí podrías agregar lógica si quieres que la lista se actualice en tiempo real
    // ...
  }, [postId, loadComments]);

  // Cargar más comentarios
  const handleLoadMore = useCallback(() => {
    if (!hasMore || loadingMore) return;
    loadComments(page + 1, true);
  }, [loadComments, page, hasMore, loadingMore]);

  return (
    <div className="space-y-6 mt-8">
      {isLoading ? (
        <div className="flex justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : comments.length > 0 ? (
        <>
          {comments.map((comment) => (
            <div key={comment.id} className="space-y-2">
              <div className="flex items-start gap-4">
                <Avatar className="h-10 w-10">
                  <AvatarFallback>
                    {(comment.profiles?.display_name).charAt(0).toUpperCase()}
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
        </>
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
