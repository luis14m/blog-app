import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/server";
import { formatDistanceToNow } from "date-fns";
import Comments from "@/components/comments";
import { generateHTML } from '@tiptap/html';
import StarterKit from '@tiptap/starter-kit';
import { getPostBySlug } from "@/services/postService";
import { getPostAttachments } from "@/services/attachmentService";

interface PageProps {
  params: {
    slug: string;
  };
}

export default async function PostPage({ params }: PageProps) {
  const supabase = await createClient();
  const { slug } = params;

  // Try to get post by slug first
  let post = await getPostBySlug(slug);

 
  if (!post) {
    notFound();
  }

  // Get post attachments
  const attachments = await getPostAttachments(post.id);
  
  // Check if current user is the post owner
  const { data: userData } = await supabase.auth.getUser();
  const isOwner = userData?.user?.id === post.user_id;

  return (
    <div className="container max-w-4xl py-8">
      {/* Cover image */}
      {post.cover_image && (
        <div className="aspect-video w-full overflow-hidden rounded-lg mb-8">
          <img
            src={post.cover_image}
            alt={post.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Post header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold leading-tight mb-4">{post.title}</h1>
        
        <div className="flex items-center gap-4 text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-muted overflow-hidden">
              {post.profiles?.avatar_url ? (
                <img
                  src={post.profiles.avatar_url}
                  alt={post.profiles.display_name || "Author"}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center bg-primary/10 text-primary font-medium">
                  {(post.profiles?.display_name || post.profiles?.username || "User")
                    .charAt(0)
                    .toUpperCase()}
                </div>
              )}
            </div>
            <span>
              {post.profiles?.display_name || post.profiles?.username || "Anonymous"}
            </span>
          </div>
          <span>•</span>
          <time dateTime={post.created_at}>
            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
          </time>
          
          {!post.published && (
            <>
              <span>•</span>
              <span className="text-yellow-500 dark:text-yellow-400 font-medium">Draft</span>
            </>
          )}
        </div>
        
        {isOwner && (
          <div className="flex gap-2 mt-4">
            <Button asChild variant="outline" size="sm">
              <Link href={`/blog/edit/${post.id}`}>Edit Post</Link>
            </Button>
          </div>
        )}
      </div>

      {/* Post content */}
      <div className="prose prose-lg dark:prose-invert max-w-none mb-12">
        {/* For a real app, you'd use a proper JSON content renderer here */}
        <div dangerouslySetInnerHTML={{ __html: getHTMLFromContent(post.content) }} />
      </div>

      {/* Post attachments */}
      {attachments && attachments.length > 0 && (
        <div className="mb-12">
          <h3 className="text-xl font-bold mb-4">Attachments</h3>
          <div className="grid gap-2">
            {attachments.map((attachment) => {
              const { data } = supabase.storage.from("attachments").getPublicUrl(attachment.file_path);
              return (
                <a
                  key={attachment.id}
                  href={data?.publicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-2 border rounded-md hover:bg-accent/50 transition-colors"
                >
                  <div className="h-8 w-8 bg-muted flex items-center justify-center rounded">
                    {attachment.file_type.startsWith("image/") ? (
                      <img
                        src={data?.publicUrl}
                        alt={attachment.file_name}
                        className="h-8 w-8 object-cover rounded"
                      />
                    ) : (
                      <span className="text-xs">{attachment.file_type.split("/")[1]?.toUpperCase() || "FILE"}</span>
                    )}
                  </div>
                  <span className="flex-1 truncate">{attachment.file_name}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatFileSize(attachment.file_size)}
                  </span>
                </a>
              );
            })}
          </div>
        </div>
      )}

      <Separator className="my-8" />

      {/* Comments section */}
      <Suspense fallback={<CommentSkeleton />}>
        <Comments postId={post.id} />
      </Suspense>
    </div>
  );
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

// Helper function to extract HTML from the content JSON using TipTap
function getHTMLFromContent(content: any): string {
  try {
    if (typeof content === 'string') {
      return content;
    }

    if (content) {
      return generateHTML(content, [
        StarterKit.configure({
          heading: {
            levels: [1, 2, 3, 4, 5, 6],
          },
        }),
      ], {
        immediatelyRender: false // Fix for SSR hydration
      });
    }
    
    return 'No content available';
  } catch (error) {
    console.error('Error parsing content:', error);
    return 'Error displaying content';
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}