"use server";
import { createClient } from "@/utils/supabase/server";
import { Database } from "@/types/supabase";

export type Comment = Database["public"]["Tables"]["comments"]["Row"];

// Crear un nuevo comentario
export async function createComment(
  postId: string,
  userId: string,
  content: any
): Promise<Comment> {
  const supabase = await createClient();

  // Crear el comentario
  const { data, error } = await supabase
    .from("comments")
    .insert({
      post_id: postId,
      user_id: userId,
      content,
    })
    .select(`
      *,
      profiles:user_id(*)
    `)
    .single();

  if (error) throw error;
  
  // Obtener attachments en consulta separada
  const { data: attachments } = await supabase
    .from("attachments")
    .select("*")
    .eq("comment_id", data.id);
    
  // Combinar resultados
  return {
    ...data,
    attachments: attachments || []
  };
}

export async function createCommentFromForm(formData: FormData): Promise<Comment> {
  try {
    const postId = formData.get('postId') as string;
    const userId = formData.get('userId') as string;
    const content = formData.get('content');
    
    if (!postId) throw new Error('ID del post requerido');
    if (!userId) throw new Error('ID del usuario requerido');
    if (!content) throw new Error('Contenido requerido');
    
    let parsedContent;
    try {
      parsedContent = JSON.parse(content as string);
    } catch (e) {
      parsedContent = content;
    }
    
    const supabase = await createClient();
    
    // Primero, crear el comentario básico sin relaciones
    const { data, error } = await supabase
      .from("comments")
      .insert({
        post_id: postId,
        user_id: userId,
        content: parsedContent,
      })
      .select(`
        *,
        profiles:user_id(*)
      `)
      .single();
      
    if (error) throw error;
    
    // Luego, obtener los archivos adjuntos por separado
    const { data: attachments, error: attachmentsError } = await supabase
      .from("attachments")
      .select("*")
      .eq("comment_id", data.id);
      
    if (attachmentsError) {
      console.error("Error al obtener los adjuntos:", attachmentsError);
      // No lanzamos error aquí para no interrumpir el flujo
    }
    
    // Combinar datos
    const commentWithAttachments = {
      ...data,
      attachments: attachments || []
    };
    
    return commentWithAttachments;
  } catch (error: any) {
    console.error('Error creating comment:', error);
    throw new Error(error.message || 'Error al crear el comentario');
  }
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


