// Acciones de CLIENTE para attachments
import { createClient } from "@/utils/supabase/client";
import {Attachment} from '@/types/supabase';

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



export async function downloadFile(publicUrl: string): Promise<boolean> {
  try {
    // Extraer el filePath real desde la URL pública
    const url = new URL(publicUrl);
    // Buscar el índice de 'attachments' en el path
    const pathSegments = url.pathname.split('/');
    const bucketIndex = pathSegments.indexOf('attachments');
    if (bucketIndex === -1) {
      throw new Error('Invalid file URL');
    }
    // El filePath es todo lo que sigue después de 'attachments/'
    const filePath = decodeURIComponent(pathSegments.slice(bucketIndex + 1).join('/'));

    const supabase = await createClient();
    // Descargar el archivo usando el filePath completo
    const { data, error } = await supabase.storage
      .from('attachments')
      .download(filePath);

    if (error) {
      console.error('Error downloading file:', error);
      return false;
    }
    if (!data) {
      console.error('No data received');
      return false;
    }

    // Obtener el nombre original del archivo
    const originalName = decodeURIComponent(pathSegments[pathSegments.length - 1]);

    // Crear enlace de descarga
    const blobUrl = URL.createObjectURL(data);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = originalName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);

    return true;
  } catch (error) {
    console.error('Error in downloadDocument:', error);
    return false;
  }
}

import { getCurrentUserDisplayName } from "@/lib/actions/profile.client";

// Subir archivos a Supabase Storage
export async function uploadFiles(
  files: File[],
  options?: {
    bucketName?: string;
    type?: "posts" | "comments";
  }
) {
  const supabase = createClient();
  const user = await supabase.auth.getUser();
 console.log({user});
  if (!user.data.user) {
    throw new Error("You must be logged in to upload files");
  }

  // Obtener display_name
  const displayName = await getCurrentUserDisplayName();
  const type = options?.type || "posts";

  const uploadPromises = files.map(async (file) => {
    const safeFileName = encodeURIComponent(file.name);
    
    // Estructura: /posts|comments/display_name/archivo.ext
    const filePath = `${type}/${user}/${safeFileName}`;

    const { error } = await supabase.storage
      .from(options?.bucketName || "attachments")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) throw error;

    const publicUrlData = supabase.storage
      .from(options?.bucketName || "attachments")
      .getPublicUrl(filePath);
    // Corrige el doble encoding de espacios
    let file_url = publicUrlData.data?.publicUrl || null;
   

    return {
      file_name: file.name,
      file_type: file.type,
      file_size: file.size,
      file_url,
      user_id: user.data.user.id,
      file_path: filePath,
    };
  });

  return Promise.all(uploadPromises);
}



