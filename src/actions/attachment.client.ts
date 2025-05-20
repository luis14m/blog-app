// Acciones de CLIENTE para attachments
import { createClient } from "@/utils/supabase/client";
import {Attachment} from '@/types/types';

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




export async function uploadFiles(
  files: File[],
  options?: {
    bucketName?: string;
    entityId?: string;
    entityType?: "post" | "comment";
  }
) {
  const supabase = createClient(); // CORRECTO: no usar await
  const user = await supabase.auth.getUser();

  if (!user.data.user) {
    throw new Error("You must be logged in to upload files");
  }

  const uploadPromises = files.map(async (file) => {
    const fileExt = file.name.split(".").pop();
    const baseFolder = options?.entityType && options?.entityId
      ? `${options.entityType === "post" ? "posts" : "comments"}/${options.entityId}`
      : "";
    const filePath = `${baseFolder}/${Math.random().toString(36).substring(2, 11)}.${fileExt}`;

    try {
      const { data, error } = await supabase.storage
        .from(options?.bucketName || "attachments")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) throw error;

      // Obtener la URL pública
      const publicUrlData = supabase.storage
        .from(options?.bucketName || "attachments")
        .getPublicUrl(filePath);
      const public_url = publicUrlData.data?.publicUrl || null;

      // Construir el objeto de inserción
      const insertObj: any = {
        file_path: data.path,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        user_id: user.data.user.id,
        public_url,
      };
      if (options?.entityType === "post" && options?.entityId) {
        insertObj.post_id = options.entityId;
      }
      if (options?.entityType === "comment" && options?.entityId) {
        insertObj.comment_id = options.entityId;
      }

      const { data: attachment, error: dbError } = await supabase
        .from("attachments")
        .insert(insertObj)
        .select()
        .single();

      if (dbError) throw dbError;

      return attachment;
    } catch (error: any) {
      console.error("Upload error:", error);
      throw error;
    }
  });

  return Promise.all(uploadPromises);
}

