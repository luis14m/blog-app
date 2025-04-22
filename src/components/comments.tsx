"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import TiptapEditor from "@/components/tiptap-editor";
import FileUploader from "@/components/file-uploader";
import { formatDistanceToNow } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface CommentsProps {
  postId: string;
}

export default function Comments({ postId }: CommentsProps) {
  const [comments, setComments] = useState<any[]>([]);
  const [commentContent, setCommentContent] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [showUploaderDialog, setShowUploaderDialog] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    async function getUser() {
      const { data } = await supabase.auth.getUser();
      setUser(data?.user || null);
      setLoading(false);
    }
    
    getUser();
    
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user || null);
      }
    );
    
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [supabase.auth]);

  useEffect(() => {
    async function getComments() {
      const { data, error } = await supabase
        .from("comments")
        .select(`
          *,
          profiles:user_id(*)
        `)
        .eq("post_id", postId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching comments:", error);
        return;
      }

      // Get attachments for each comment
      if (data) {
        const commentsWithAttachments = await Promise.all(
          data.map(async (comment) => {
            const { data: attachments } = await supabase
              .from("attachments")
              .select("*")
              .eq("comment_id", comment.id);
            
            return {
              ...comment,
              attachments: attachments || [],
            };
          })
        );
        
        setComments(commentsWithAttachments);
      }
    }

    getComments();

    // Set up realtime subscription for comments
    const commentsSubscription = supabase
      .channel("comments-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "comments",
          filter: `post_id=eq.${postId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            // Add new comment (will need to fetch user profile separately)
            const fetchNewComment = async () => {
              const { data: profile } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", payload.new.user_id)
                .single();
              
              const newComment = {
                ...payload.new,
                profiles: profile,
                attachments: [],
              };
              
              setComments((prev) => [newComment, ...prev]);
            };
            
            fetchNewComment();
          } else if (payload.eventType === "DELETE") {
            // Remove deleted comment
            setComments((prev) => 
              prev.filter((comment) => comment.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(commentsSubscription);
    };
  }, [postId, supabase]);

  const handleSubmitComment = async () => {
    if (!user) {
      toast.error("You must be logged in to comment");
      return;
    }

    setIsSubmitting(true);

    try {
      // Create comment
      const { data: comment, error: commentError } = await supabase
        .from("comments")
        .insert({
          content: commentContent,
          post_id: postId,
          user_id: user.id,
        })
        .select()
        .single();

      if (commentError) {
        throw commentError;
      }

      // Link attachments to comment
      if (attachments.length > 0) {
        const { error: attachmentError } = await supabase
          .from("attachments")
          .update({ comment_id: comment.id })
          .in(
            "id",
            attachments.map((attachment) => attachment.id)
          );

        if (attachmentError) {
          console.error("Error linking attachments:", attachmentError);
        }
      }

      // Reset form
      setCommentContent({});
      setAttachments([]);
      toast.success("Comment added successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to add comment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAttachmentRequest = () => {
    setShowUploaderDialog(true);
  };

  const handleUploadComplete = (files: any[]) => {
    setAttachments((prev) => [...prev, ...files]);
    setShowUploaderDialog(false);
  };

  const isValidComment = () => {
    // Check if commentContent is not empty and has some text content
    if (!commentContent || Object.keys(commentContent).length === 0) {
      return false;
    }
    
    try {
      // Simple check - this might need to be more sophisticated
      // depending on your editor's output format
      return JSON.stringify(commentContent).length > 10;
    } catch {
      return false;
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Comments</h2>
      
      {!loading && user ? (
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <Avatar className="h-10 w-10">
              <AvatarImage src={user.user_metadata?.avatar_url || ""} />
              <AvatarFallback>
                {user.email?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-4">
              <TiptapEditor
                content={commentContent}
                onChange={setCommentContent}
                onAttachmentRequest={handleAttachmentRequest}
                placeholder="Write a comment..."
              />
              
              {attachments.length > 0 && (
                <div className="space-y-2 border p-3 rounded-md">
                  <h4 className="text-sm font-medium">Attachments</h4>
                  <div className="space-y-2">
                    {attachments.map((attachment) => (
                      <div
                        key={attachment.id}
                        className="flex items-center justify-between text-sm p-2 border rounded-md"
                      >
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 bg-muted flex items-center justify-center rounded">
                            {attachment.file_type.startsWith("image/") ? (
                              <img
                                src={supabase.storage.from("attachments").getPublicUrl(attachment.file_path).data?.publicUrl}
                                alt={attachment.file_name}
                                className="h-6 w-6 object-cover rounded"
                              />
                            ) : (
                              <span className="text-xs">{attachment.file_type.split("/")[1]?.toUpperCase() || "FILE"}</span>
                            )}
                          </div>
                          <span className="truncate max-w-xs">{attachment.file_name}</span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setAttachments(attachments.filter((a) => a.id !== attachment.id));
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAttachmentRequest}
                >
                  Attach Files
                </Button>
                <Button
                  onClick={handleSubmitComment}
                  disabled={isSubmitting || !isValidComment()}
                  size="sm"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : !loading ? (
        <div className="text-center p-6 border rounded-md bg-muted/30">
          <p className="text-muted-foreground mb-4">
            You need to be logged in to leave a comment
          </p>
          <Button asChild>
            <a href="/auth/login">Log in</a>
          </Button>
        </div>
      ) : null}

      {comments.length > 0 ? (
        <div className="space-y-6 mt-8">
          {comments.map((comment) => (
            <div key={comment.id} className="space-y-2">
              <div className="flex items-start gap-4">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={comment.profiles?.avatar_url || ""} />
                  <AvatarFallback>
                    {(comment.profiles?.display_name || comment.profiles?.username || "User")
                      .charAt(0)
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {comment.profiles?.display_name || comment.profiles?.username || "Anonymous"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  
                  <div className="prose prose-sm dark:prose-invert">
                    {/* For a real app, you'd use a proper JSON content renderer here */}
                    <div dangerouslySetInnerHTML={{ __html: getHTMLFromContent(comment.content) }} />
                  </div>
                  
                  {comment.attachments?.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {comment.attachments.map((attachment: any) => {
                        const { data } = supabase.storage.from("attachments").getPublicUrl(attachment.file_path);
                        return (
                          <a
                            key={attachment.id}
                            href={data?.publicUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 p-1.5 border rounded text-sm hover:bg-accent/50 transition-colors"
                          >
                            <div className="h-6 w-6 bg-muted flex items-center justify-center rounded">
                              {attachment.file_type.startsWith("image/") ? (
                                <img
                                  src={data?.publicUrl}
                                  alt={attachment.file_name}
                                  className="h-6 w-6 object-cover rounded"
                                />
                              ) : (
                                <span className="text-xs">{attachment.file_type.split("/")[1]?.toUpperCase() || "FILE"}</span>
                              )}
                            </div>
                            <span className="truncate max-w-xs">{attachment.file_name}</span>
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
        </div>
      ) : (
        <div className="text-center py-8 border rounded-md bg-muted/30">
          <p className="text-muted-foreground">No comments yet. Be the first to comment!</p>
        </div>
      )}

      {/* File uploader dialog */}
      <Dialog open={showUploaderDialog} onOpenChange={setShowUploaderDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle>Add Attachments</DialogTitle>
          <FileUploader
            onUploadComplete={handleUploadComplete}
            entityType="comment"
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Helper function to extract HTML from the content JSON
// This is a simplified version - in a real app you'd use TipTap's 
// generateHTML or a similar function to render the content properly
function getHTMLFromContent(content: any): string {
  // This is just a placeholder - in a real app, you'd parse the JSON content properly
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