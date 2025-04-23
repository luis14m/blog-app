import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { formatDistanceToNow } from "date-fns";

export default async function BlogPage() {
  const supabase = createClient();
  
  const { data: posts } = await supabase
    .from("posts")
    .select(`
      id,
      title,
      excerpt,
      slug,
      created_at,
      cover_image,
      user_id,
      profiles(username, display_name, avatar_url)
    `)
    .eq("published", true)
    .order("created_at", { ascending: false });

  return (
    <div className="container py-8 md:py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Blog</h1>
        <Button asChild>
          <Link href="/blog/new">New Post</Link>
        </Button>
      </div>
      {posts && posts.length > 0 ? (
        <div className="grid gap-6 md:gap-8 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <Link
              key={post.id}
              href={`/blog/${post.slug || post.id}`}
              className="group flex flex-col h-full overflow-hidden rounded-lg border bg-background transition-colors hover:bg-accent/50"
              legacyBehavior>
              <div className="relative aspect-video overflow-hidden bg-muted">
                {post.cover_image ? (
                  <img
                    src={post.cover_image}
                    alt={post.title}
                    className="object-cover w-full h-full transition-transform group-hover:scale-105"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-muted">
                    <span className="text-muted-foreground">No image</span>
                  </div>
                )}
              </div>
              <div className="flex flex-col flex-1 justify-between p-6">
                <div className="space-y-2">
                  <h2 className="text-xl font-bold">{post.title}</h2>
                  {post.excerpt && (
                    <p className="line-clamp-3 text-muted-foreground">
                      {post.excerpt}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 pt-4">
                  <div className="h-8 w-8 rounded-full bg-muted overflow-hidden">
                    {post.profiles?.avatar_url ? (
                      <img
                        src={post.profiles.avatar_url}
                        alt={post.profiles.display_name || post.profiles.username}
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
                  <div className="text-sm">
                    <p className="font-medium">
                      {post.profiles?.display_name || post.profiles?.username || "Anonymous"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <h2 className="text-xl font-semibold mb-2">No posts yet</h2>
          <p className="text-muted-foreground mb-6">Be the first to create a post!</p>
          <Button asChild>
            <Link href="/blog/new">Create Post</Link>
          </Button>
        </div>
      )}
    </div>
  );
}