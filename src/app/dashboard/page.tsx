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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  MoreHorizontal,
  PenSquare,
  Trash2,
  EyeIcon,
  Loader2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { deletePost } from "@/actions/post.server";
import { createClient } from "@/utils/supabase/client";
import { isAdmin } from "@/utils/roles";
import { NewPostButton } from "@/components/new-post-button";

// Agregar esta función antes del componente DashboardPage

function extractCommentContent(content: any): string {
  try {
    if (typeof content === "string") {
      try {
        const parsed = JSON.parse(content);
        return extractCommentContent(parsed);
      } catch {
        return content;
      }
    }

    if (content?.content) {
      return content.content
        .map((node: any) => {
          if (node.type === "paragraph") {
            return (node.content || [])
              .map((text: any) => text.text || "")
              .join("");
          }
          return "";
        })
        .join("\n");
    }

    return "";
  } catch (error) {
    console.error("Error extracting comment content:", error);
    return "Error displaying content";
  }
}

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [posts, setPosts] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function checkAdminStatus() {
      const adminStatus = await isAdmin();
      setIsAdminUser(adminStatus);
    }
    checkAdminStatus();
  }, []);

  useEffect(() => {
    async function fetchContent() {
      try {
        setError(null);
        await getUserContent();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred while fetching content');
      }
    }
    fetchContent();
  }, [router, supabase, isAdminUser]);

  async function getUserContent() {
    try {
      // Obtener usuario actual directamente de Supabase
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error('Authentication error:', userError.message);
        router.push("/auth/login");
        return;
      }

      if (!user) {
        console.error('No authenticated user found');
        router.push("/auth/login");
        return;
      }

      // Query adjusts based on admin status
      let postsQuery = supabase
        .from("posts")
        .select(`
          *,
          profile:profiles(username, display_name)
        `)
        .order("created_at", { ascending: false });

      if (!isAdminUser) {
        postsQuery = postsQuery.eq("user_id", user.id);
      }

      const { data: userPosts, error: postsError } = await postsQuery;

      if (postsError) {
        console.error('Error fetching posts:', postsError.message);
        throw new Error(`Failed to fetch posts: ${postsError.message}`);
      }

      setPosts(userPosts || []);

      // Query adjusts based on admin status
      let commentsQuery = supabase
        .from("comments")
        .select(`
          *,
          profile:profiles(username, display_name),
          post:posts(title, slug, id)
        `)
        .order("created_at", { ascending: false });

      if (!isAdminUser) {
        commentsQuery = commentsQuery.eq("user_id", user.id);
      }

      const { data: userComments, error: commentsError } = await commentsQuery;

      if (commentsError) {
        console.error('Error fetching comments:', commentsError.message);
        throw new Error(`Failed to fetch comments: ${commentsError.message}`);
      }

      setComments(userComments || []);
    } catch (error) {
      console.error("Error fetching user content:", error instanceof Error ? error.message : 'Unknown error');
      // Don't redirect on data fetch errors, just show error state
      setLoading(false);
      throw error; // Re-throw to be handled by error boundary
    } finally {
      setLoading(false);
    }
  }

  const handleDeletePost = async (postId: string) => {
    setIsDeleting(postId);

    try {
      await deletePost(postId);
      setPosts(posts.filter((post) => post.id !== postId));
      console.log("Post deleted successfully");
    } catch (error: any) {
      console.error(error.message || "Failed to delete post");
    } finally {
      setIsDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-8">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">Error: {error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.reload()}
            className="mt-2"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          {isAdminUser && (
            <Badge variant="secondary">Admin</Badge>
          )}
        </div>
        <NewPostButton /> 
      </div>

      <Tabs defaultValue="posts" className="mt-8">
        <TabsList>
          <TabsTrigger value="posts">Posts</TabsTrigger>
          <TabsTrigger value="comments">Comments</TabsTrigger>
        </TabsList>
        <TabsContent value="posts">
          <div className="grid gap-4">
            {posts.map((post) => (
              <Card key={post.id}>
                <CardHeader>
                  <CardTitle>{post.title}</CardTitle>                  {isAdminUser && (
                    <CardDescription className="text-primary">
                      Author: {post.profile?.display_name || "Unknown"}
                    </CardDescription>
                  )}
                  <CardDescription>
                    {formatDistanceToNow(new Date(post.created_at), {
                      addSuffix: true,
                    })}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {post.excerpt || "No excerpt available"}
                  </p>
                  <div className="mt-2">
                    <Badge variant={post.published ? "default" : "secondary"}>
                      {post.published ? "Published" : "Draft"}
                    </Badge>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/blog/${post.slug || post.id}`}>
                      <EyeIcon className="mr-2 h-4 w-4" />
                      View
                    </Link>
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/blog/edit/${post.id}`}>
                          <PenSquare className="mr-2 h-4 w-4" />
                          Edit
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDeletePost(post.id)}
                        disabled={isDeleting === post.id}
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
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="comments">
          <div className="grid gap-4">
            {comments.map((comment) => (
              <Card key={comment.id}>
                <CardHeader>
                  <CardTitle>
                    Comment on{" "}
                    <Link
                      href={`/blog/${comment.post.slug || comment.post.id}`}
                      className="text-primary hover:underline"
                    >
                      {comment.post.title}
                    </Link>
                  </CardTitle>                  {isAdminUser && (
                    <CardDescription className="text-primary">
                      Author: {comment.profile?.display_name || "Unknown"}
                    </CardDescription>
                  )}
                  <CardDescription>
                    {formatDistanceToNow(new Date(comment.created_at), {
                      addSuffix: true,
                    })}
                  </CardDescription>
                </CardHeader>
               
                <CardContent>
                  <p className="text-sm">
                    {extractCommentContent(comment.content)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
