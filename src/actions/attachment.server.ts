'use server'
import { Attachment } from "@/types/supabase";
import { createClient } from "@/utils/supabase/server";


export async function createAttachment(attachment: {
  file_url: string;
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

export async function deleteAttachment(
  attachmentId: string,
  userId: string
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("attachments")
    .delete()
    .eq("id", attachmentId)
    .eq("user_id", userId);

  if (error) throw error;
}

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

