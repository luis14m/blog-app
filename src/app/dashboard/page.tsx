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
import { toast } from "sonner";
import { MoreHorizontal, PenSquare, Trash2, EyeIcon, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { deletePost } from "@/lib/actions";

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  useEffect(() => {
    async function getUserContent() {
      try {
        const userResponse = await fetch('/api/auth/user');
        const { user } = await userResponse.json();
        
        if (!user) {
          router.push("/auth/login");
          return;
        }

        // Get user posts
        const postsResponse = await fetch(`/api/posts?user_id=${user.id}`);
        const userPosts = await postsResponse.json();
        setPosts(userPosts);

        // Get user comments
        const commentsResponse = await fetch(`/api/comments?user_id=${user.id}`);
        const userComments = await commentsResponse.json();
        setComments(userComments);
      } catch (error) {
        console.error("Error fetching user content:", error);
        toast.error("Failed to load content");
      } finally {
        setLoading(false);
      }
    }

    getUserContent();
  }, [router]);

  const handleDeletePost = async (postId: string) => {
    setIsDeleting(postId);
    
    try {
      await deletePost(postId);
      setPosts(posts.filter(post => post.id !== postId));
      toast.success("Post deleted successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete post");
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

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <Button asChild>
          <Link href="/blog/new">
            <PenSquare className="mr-2 h-4 w-4" />
            New Post
          </Link>
        </Button>
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
                  <CardTitle>{post.title}</CardTitle>
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
                  </CardTitle>
                  <CardDescription>
                    {formatDistanceToNow(new Date(comment.created_at), {
                      addSuffix: true,
                    })}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{comment.content}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}