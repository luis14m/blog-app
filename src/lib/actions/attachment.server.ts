import { Attachment } from "./types";
import { createClient } from "@/utils/supabase/server";



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

export async function uploadFile(
  file: File,
  bucket: string = "attachments",
  path: string = ""
): Promise<string> {
  const supabase = await createClient();

  const fileExt = file.name.split(".").pop();
  const filePath = `${path}${Math.random().toString(36).substring(2)}${
    fileExt ? `.${fileExt}` : ""
  }`;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(filePath, file);

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);

  return data.publicUrl;
}

