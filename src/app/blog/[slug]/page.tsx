import * as React from "react";
import { Suspense } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { PenSquare } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import   { CommentsList } from "@/components/comments-list";
import  { CommentsCreate } from "@/components/comments-create";  
import { getPostBySlug } from "@/lib/actions/post.server";
import { getPostAttachments } from "@/lib/actions/attachment.server";
import { getHTMLFromContent } from "@/lib/utils";
import { formatFileSize } from "@/lib/utils";
import { Card } from "@/components/ui/card";

export default async function BlogPostPage(props: {
  params: Promise<{ slug: string }>;
}) {
  try {
    const params = await props.params;
    const { slug } = await params;

    const post = await getPostBySlug(slug);
    if (!post) {
      return (
        <div className="container mx-auto px-4 py-12 text-center">
          <h1 className="text-2xl font-bold mb-4">Post no encontrado</h1>
          <p>El post solicitado no existe o fue eliminado.</p>
          <Button asChild className="mt-4">
            <Link href="/blog">Volver al blog</Link>
          </Button>
        </div>
      );
    }

    // Get post attachments
    const attachments = await getPostAttachments(post.id);

    // Check if current user is the post owner
    const supabase = await createClient();
    const { data: userData } = await supabase.auth.getUser();

    const isOwner = userData?.user?.id === post.user_id;

    return (
      <div className="container max-w-4xl py-8">
        {/* Card envuelve todo el post */}
        {/* Post header */}
        <Card className="p-6">
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-4xl font-bold leading-tight">{post.title}</h1>
              {isOwner && (
                <Button asChild variant="outline" size="sm">
                  <Link href={`/blog/edit/${post.id}`}>
                    <PenSquare className="mr-2 h-4 w-4" />
                    Editar Post
                  </Link>
                </Button>
              )}
            </div>

            <div className="flex items-center gap-4 text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-muted overflow-hidden">
                  <div className="h-full w-full flex items-center justify-center bg-primary/10 text-primary font-medium">
                    {(post.profiles?.display_name).charAt(0).toUpperCase()}
                  </div>
                </div>
                <span>{post.profiles?.display_name}</span>
              </div>
              <span>•</span>
              <time dateTime={post.created_at}>
                {(() => {
                  const d = new Date(post.created_at);
                  const pad = (n: number) => n.toString().padStart(2, "0");
                  return `${pad(d.getDate())}-${pad(
                    d.getMonth() + 1
                  )}-${d.getFullYear()} ${pad(d.getHours())}:${pad(
                    d.getMinutes()
                  )}`;
                })()}
              </time>

              {!post.published && (
                <>
                  <span>•</span>
                  <span className="text-yellow-500 dark:text-yellow-400 font-medium">
                    Draft
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Post excerpt */}
          {post.excerpt && (
            <p className="text-lg text-muted-foreground mb-6">{post.excerpt}</p>
          )}

          {/* Date label */}
          {post.fecha && (
            <div className="flex items-center gap-2 text-muted-foreground mb-6">
              <span className="text-sm font-medium">Fecha inicio:</span>
              <time dateTime={post.fecha} className="text-sm">
                {new Date(post.fecha).toLocaleDateString("es-ES", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </time>
            </div>
          )}

          {/* Post content */}
          <div className="prose prose-lg dark:prose-invert max-w-none mb-12">
            {/* Renderiza el contenido generateHTML si es JSON */}
            <div className="bg-card rounded-lg shadow p-6 border">
              <div
                dangerouslySetInnerHTML={{
                  __html: getHTMLFromContent(post.content),
                }}
              />
            </div>
          </div>
          {/* Post attachments */}
          {attachments && attachments.length > 0 && (
            <div className="mb-12">
              <h3 className="text-xl font-bold mb-4">Archivos Adjuntos</h3>
              <div className="grid gap-2">
                {attachments.map((attachment) => {
                  // Mostrar extension del archivo
                  let fileTypeLabel = "FILE";
                  if (
                    attachment.file_type ===
                      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
                    attachment.file_type === "application/vnd.ms-excel"
                  ) {
                    fileTypeLabel = "XLSX";
                  } else if (
                    attachment.file_type ===
                      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
                    attachment.file_type === "application/msword"
                  ) {
                    fileTypeLabel = "DOCX";
                  } else if (attachment.file_type) {
                    const parts = attachment.file_type.split("/");
                    if (parts.length > 1)
                      fileTypeLabel = parts[1].toUpperCase();
                  }
                  // Usar directamente attachment.file_url como href
                  return (
                    <a
                      key={attachment.id}
                      href={attachment.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ width: "fit-content", maxWidth: "100%" }}
                      className="flex items-center gap-2 p-2 border rounded-md hover:bg-accent/50 transition-colors"
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
                      <span className="text-xs text-muted-foreground">
                        {formatFileSize(attachment.file_size)}
                      </span>
                    </a>
                  );
                })}
              </div>
            </div>
          )}
        </Card>

        {/* Separator */}

        <Separator className="my-8" />

        {/* Comments section */}
        <Suspense fallback={<CommentSkeleton />}>
        <CommentsCreate 
        postId={post.id} 
        user={userData?.user} 
        /* //onCommentCreated={...}  */
        />
        <CommentsList postId={post.id} />
        </Suspense>
      </div>
    );
  } catch (error: any) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">Error al cargar el post</h1>
        <p className="text-red-500 mb-2">
          {error?.message || "Ocurrió un error inesperado al cargar el post."}
        </p>
        {error?.details && (
          <pre className="text-xs text-muted-foreground bg-muted rounded p-2 overflow-x-auto">
            {JSON.stringify(error, null, 2)}
          </pre>
        )}
        <Button asChild className="mt-4">
          <Link href="/blog">Volver al blog</Link>
        </Button>
      </div>
    );
  }
}

function CommentSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-24" />
      </div>

      <div className="mt-4 space-y-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-16 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
