import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PenSquare } from "lucide-react";
import { getPublishedPosts } from "@/services/postService";

import {
  Sheet,
  
  SheetTrigger,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { NewPostSheet } from "@/components/new-post";

export default async function BlogPage() {
  try {
    const posts = await getPublishedPosts();

    return (
      <div className="container py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Blog Posts</h1>
         
            <Sheet>
              <SheetTrigger asChild>
                <Button>
                  <PenSquare className="mr-2 h-4 w-4" />
                  New Post
                </Button>
              </SheetTrigger>
              <NewPostSheet />
            </Sheet>
          
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {posts && posts.length > 0 ? (
            posts.map((post) => (
              <Link
                key={post.id}
                href={`/blog/${post.slug || post.id}`}
                className="group flex flex-col overflow-hidden rounded-lg border bg-background transition-colors hover:bg-accent/30"
              >
                {post.cover_image && (
                  <div className="aspect-video overflow-hidden">
                    <img
                      src={post.cover_image}
                      alt={post.title}
                      className="object-cover w-full h-full transition-transform group-hover:scale-105"
                    />
                  </div>
                )}
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
                          src={post.profiles.avatar_url}
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
    console.error("Error fetching posts:", error);
    return (
      <div className="container py-8">
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            Error loading posts. Please try again later.
          </p>
        </div>
      </div>
    );
  }
}
