'use server'
import { Attachment, AttachmentInsert } from "@/types/supabase";
import { createClient } from "@/utils/supabase/server";

// Create a new attachment in the database
// and return the created attachment
// with the ID and other properties
export async function createAttachment(
  attachment: AttachmentInsert,
  userId: string
): Promise<Attachment> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("attachments")
    .insert({ ...attachment, 
      user_id: userId,
    })
    .select()
    .single();

  if (error) throw error;
  if (!data) throw new Error("Attachment not created");
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

