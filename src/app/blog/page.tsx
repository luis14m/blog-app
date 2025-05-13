import Link from "next/link";
import { getPublishedPosts } from "@/lib/actions/client";
import { NewPostButton } from "@/components/new-post-button";

export default async function BlogPage() {
  try {
    const posts = await getPublishedPosts();

    return (
      <div className="container py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Blog Posts</h1>
          <NewPostButton />
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {posts && posts.length > 0 ? (
            posts.map((post) => (
              <Link
                key={post.id}
                href={`/blog/${post.slug || post.id}`}
                className="group flex flex-col overflow-hidden rounded-lg border bg-background transition-colors hover:bg-accent/30"
              >
                <div className="flex flex-col space-y-2 p-6">
                  <h2 className="text-xl font-bold">{post.title}</h2>
                  {post.excerpt && (
                    <p className="line-clamp-2 text-muted-foreground">
                      {post.excerpt}
                    </p>
                  )}
                  <div className="flex items-center gap-2 pt-2">
                    <div className="h-8 w-8 rounded-full bg-muted overflow-hidden">
                      {post.profiles?.avatar_url ? (
                        <img
                          alt={
                            post.profiles.display_name || post.profiles.username
                          }
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center bg-primary/10 text-primary font-medium">
                          {(
                            post.profiles?.display_name ||
                            post.profiles?.username ||
                            "User"
                          )
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="text-sm">
                      <p className="font-medium">
                        {post.profiles?.display_name ||
                          post.profiles?.username ||
                          "Anonymous"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(post.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <p className="text-muted-foreground">
                No posts yet. Be the first to create one!
              </p>
            </div>
          )}
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error al cargar los posts:', error);
    return (
      <div className="container mx-auto px-4">
        <h1>Lo sentimos, hubo un error al cargar los posts</h1>
      </div>
    );
  }
}
