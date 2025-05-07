import { createClient } from "@/utils/supabase/server";
import { Database } from "@/types/supabase";

type Comment = Database["public"]["Tables"]["comments"]["Row"] & {
  profiles: Database["public"]["Tables"]["profiles"]["Row"] | null;
  attachments: Database["public"]["Tables"]["attachments"]["Row"][];
};

export async function getPostComments(postId: string): Promise<Comment[]> {
  const supabase = await createClient();

  const { data: comments, error } = await supabase
    .from("comments")
    .select(`
      *,
      profiles (
        username,
        display_name,
        avatar_url
      ),
      attachments!comment_id(*)
    `)
    .eq("post_id", postId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return comments || [];
}

export async function createComment(
  postId: string,
  userId: string,
  content: any
): Promise<Comment> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("comments")
    .insert({
      post_id: postId,
      user_id: userId,
      content,
    })
    .select(`
      *,
      profiles (
        username,
        display_name,
        avatar_url
      ),
      attachments!comment_id(*)
    `)
    .single();

  if (error) throw error;
  return data;
}

export async function deleteComment(commentId: string, userId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("comments")
    .delete()
    .eq("id", commentId)
    .eq("user_id", userId);

  if (error) throw error;
}