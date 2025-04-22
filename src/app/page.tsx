import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { PenSquare, BookOpen, MessageSquare, Users } from "lucide-react";

export default async function Home() {
  const supabase = createClient();
  
  const { data: latestPosts } = await supabase
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
    .order("created_at", { ascending: false })
    .limit(3);

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      {/* Hero section */}
      <section className="w-full py-12 md:py-24 lg:py-32 bg-gradient-to-b from-background to-muted/30">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl md:text-6xl">
                Share Your Ideas With The World
              </h1>
              <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
                A modern blogging platform where you can create, share, and discuss ideas through rich content and meaningful conversations.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button asChild size="lg">
                <Link href="/blog">
                  <BookOpen className="mr-2 h-4 w-4" />
                  Explore Posts
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/auth/signup">
                  <PenSquare className="mr-2 h-4 w-4" />
                  Start Writing
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features section */}
      <section className="w-full py-12 md:py-24 lg:py-32">
        <div className="container px-4 md:px-6">
          <div className="grid gap-6 lg:grid-cols-3 lg:gap-12">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <PenSquare className="h-8 w-8 text-primary" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold">Rich Content Editor</h3>
                <p className="text-muted-foreground">
                  Create beautiful posts with our intuitive rich text editor. Format text, add images, links, and more.
                </p>
              </div>
            </div>
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <MessageSquare className="h-8 w-8 text-primary" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold">Meaningful Discussions</h3>
                <p className="text-muted-foreground">
                  Engage in discussions with rich commenting. Attach files, format your responses, and have deeper conversations.
                </p>
              </div>
            </div>
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold">User Profiles</h3>
                <p className="text-muted-foreground">
                  Build your online presence with customizable profiles. Showcase your posts and track your contributions.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Latest posts section */}
      <section className="w-full py-12 md:py-24 lg:py-32 bg-muted/30">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tighter md:text-4xl">
                Latest Posts
              </h2>
              <p className="mx-auto max-w-[700px] text-muted-foreground">
                Discover the latest thoughts and ideas from our community.
              </p>
            </div>
          </div>
          
          <div className="grid gap-6 mt-8 md:grid-cols-2 lg:grid-cols-3">
            {latestPosts && latestPosts.length > 0 ? (
              latestPosts.map((post) => (
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
                    <h3 className="text-xl font-bold">{post.title}</h3>
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
                          {new Date(post.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="col-span-3 text-center py-12">
                <p className="text-muted-foreground">No posts yet. Be the first to create one!</p>
              </div>
            )}
          </div>
          
          <div className="flex justify-center mt-8">
            <Button asChild variant="outline">
              <Link href="/blog">
                See all posts
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}