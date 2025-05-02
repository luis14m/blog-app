import { createClient } from "@/utils/supabase/server";
import { Database } from "@/types/supabase";

type Attachment = Database["public"]["Tables"]["attachments"]["Row"];

export async function getPostAttachments(postId: string): Promise<Attachment[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("attachments")
    .select("*")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getCommentAttachments(commentId: string): Promise<Attachment[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("attachments")
    .select("*")
    .eq("comment_id", commentId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function createAttachment(attachment: {
  file_path: string;
  file_name: string;
  file_type: string;
  file_size: number;
  user_id: string;
  post_id?: string;
  comment_id?: string;
}): Promise<Attachment> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("attachments")
    .insert(attachment)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteAttachment(attachmentId: string, userId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("attachments")
    .delete()
    .eq("id", attachmentId)
    .eq("user_id", userId);

  if (error) throw error;
}

export async function uploadFile(
  file: File,
  bucket: string = "attachments",
  path: string = ""
): Promise<string> {
  const supabase = await createClient();
  
  const fileExt = file.name.split(".").pop();
  const filePath = `${path}${Math.random().toString(36).substring(2)}${fileExt ? `.${fileExt}` : ""}`;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(filePath, file);

  if (uploadError) throw uploadError;

  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(filePath);

  return data.publicUrl;
}