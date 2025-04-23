"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { MoreHorizontal, PenSquare, Trash2, EyeIcon, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function getUser() {
      const { data } = await supabase.auth.getUser();
      if (!data?.user) {
        router.push("/auth/login");
        return;
      }
      
      setUser(data.user);
      setLoading(false);
    }
    
    getUser();
  }, [router, supabase.auth]);

  useEffect(() => {
    async function getUserContent() {
      if (!user) return;

      // Get user posts
      const { data: userPosts } = await supabase
        .from("posts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (userPosts) {
        setPosts(userPosts);
      }

      // Get user comments
      const { data: userComments } = await supabase
        .from("comments")
        .select(`
          *,
          posts(id, title, slug)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (userComments) {
        setComments(userComments);
      }
    }

    getUserContent();
  }, [user, supabase]);

  const handleDeletePost = async (postId: string) => {
    if (!confirm("Are you sure you want to delete this post? This action cannot be undone.")) {
      return;
    }

    setIsDeleting(postId);
    
    try {
      const { error } = await supabase
        .from("posts")
        .delete()
        .eq("id", postId);

      if (error) throw error;

      setPosts((prev) => prev.filter((post) => post.id !== postId));
      toast.success("Post deleted successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete post");
    } finally {
      setIsDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <Button asChild>
          <Link href="/blog/new" legacyBehavior>
            <PenSquare className="mr-2 h-4 w-4" />
            New Post
          </Link>
        </Button>
      </div>
      <Tabs defaultValue="posts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="posts">Posts</TabsTrigger>
          <TabsTrigger value="comments">Comments</TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {posts.length > 0 ? (
              posts.map((post) => (
                <Card key={post.id} className="overflow-hidden">
                  {post.cover_image && (
                    <div className="aspect-video w-full overflow-hidden">
                      <img
                        src={post.cover_image}
                        alt={post.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <CardHeader className="space-y-1">
                    <div className="flex items-center justify-between">
                      <CardTitle className="truncate">{post.title}</CardTitle>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/blog/${post.slug || post.id}`} legacyBehavior>
                              <EyeIcon className="mr-2 h-4 w-4" />
                              View
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/blog/edit/${post.id}`} legacyBehavior>
                              <PenSquare className="mr-2 h-4 w-4" />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeletePost(post.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            {isDeleting === post.id ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="mr-2 h-4 w-4" />
                            )}
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <CardDescription>
                      {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="line-clamp-2 text-sm">
                      {post.excerpt || "No excerpt available."}
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Badge variant={post.published ? "default" : "outline"}>
                      {post.published ? "Published" : "Draft"}
                    </Badge>
                  </CardFooter>
                </Card>
              ))
            ) : (
              <div className="col-span-full text-center py-12 border rounded-md bg-muted/30">
                <p className="text-muted-foreground mb-4">You haven't created any posts yet</p>
                <Button asChild>
                  <Link href="/blog/new">Create your first post</Link>
                </Button>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="comments" className="space-y-4">
          {comments.length > 0 ? (
            <div className="space-y-4">
              {comments.map((comment) => (
                <Card key={comment.id}>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Comment on:{" "}
                      <Link
                        href={`/blog/${comment.posts?.slug || comment.posts?.id}`}
                        className="underline hover:text-primary transition-colors"
                        legacyBehavior>
                        {comment.posts?.title || "Post"}
                      </Link>
                    </CardTitle>
                    <CardDescription>
                      {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <div dangerouslySetInnerHTML={{ __html: getHTMLFromContent(comment.content) }} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 border rounded-md bg-muted/30">
              <p className="text-muted-foreground">You haven't made any comments yet</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Helper function to extract HTML from the content JSON
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
    
    return 'No content available';
  } catch (error) {
    console.error('Error parsing content:', error);
    return 'Error displaying content';
  }
}