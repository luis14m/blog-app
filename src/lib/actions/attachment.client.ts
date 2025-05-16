// Acciones de CLIENTE para attachments
import { createClient } from "@/utils/supabase/client";
import { Database } from "@/types/supabase";

export type Attachment = Database["public"]["Tables"]["attachments"]["Row"];

// Obtener attachment público por ID
export async function getAttachmentById(id: string): Promise<Attachment | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("attachments")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

// Obtener todos los attachments públicos
export async function getPublicAttachments(): Promise<Attachment[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("attachments")
    .select("*");
  if (error) throw error;
  return data || [];
}
export async function linkAttachmentsToPost(
  postId: string,
  attachments: { id: string }[]
): Promise<void> {
  const supabase = await createClient();
  // Link attachments to post
  if (attachments.length > 0) {
    const { error: attachmentError } = await supabase
      .from("attachments")
      .update({ post_id: postId })
      .in(
        "id",
        attachments.map((attachment) => attachment.id)
      );

    if (attachmentError) {
      console.error("Error linking attachments:", attachmentError);
    }
  }
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
