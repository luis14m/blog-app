// Acciones de CLIENTE para comments
import { createClient } from "@/utils/supabase/client";
import { Comment} from "@/types/supabase";


// Obtener comment público por ID
export async function getCommentById(id: string): Promise<Comment | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("comments")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

// Obtener todos los comments públicos
export async function getPublicComments(): Promise<Comment[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("comments")
    .select("*");
  if (error) throw error;
  return data || [];
}

export async function getPostCommentsPaginated(
  postId: string, 
  from: number, 
  to: number
): Promise<{ comments: Comment[], count: number }> {
  try {
    // Validar los parámetros de entrada
    if (!postId) {
      console.error('getPostCommentsPaginated: postId es undefined o nulo');
      return { comments: [], count: 0 };
    }
    
    if (from < 0 || to < from) {
      console.error(`getPostCommentsPaginated: rango inválido (${from}-${to})`);
      return { comments: [], count: 0 };
    }
    
    const supabase = await createClient();

    console.log(`Obteniendo comentarios para post ${postId} desde ${from} hasta ${to}`);

    try {
      const { data: comments, error, count } = await supabase
        .from("comments")
        .select(`
          *,
          profiles:user_id (*)
        `, { count: 'exact' })
        .eq("post_id", postId)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) {
        console.error(`Error de Supabase en getPostCommentsPaginated:`, {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }

      console.log(`Encontrados ${comments?.length || 0} comentarios de un total de ${count || 0}`);

      // Luego obtener los attachments para cada comentario
      for (const comment of comments || []) {
        const { data: attachments } = await supabase
          .from("attachments")
          .select("*")
          .eq("comment_id", comment.id);
        
        comment.attachments = attachments || [];
      }

      return { comments: comments || [], count: count || 0 };
    } catch (supabaseError) {
      console.error('Error en la consulta a Supabase:', supabaseError);
      throw supabaseError;
    }
  } catch (error) {
    // Obtener más información sobre el error
    console.error('Error al obtener los comentarios:');
    console.error('Parámetros de entrada:', { postId, from, to });
    
    if (error instanceof Error) {
      console.error('Mensaje de error:', error.message);
      console.error('Stack trace:', error.stack);
    } else {
      console.error('Error desconocido:', error);
    }
    
    // Manejar graciosamente el error para no romper la aplicación
    return { comments: [], count: 0 };
  }
}

export async function getNewCommentWithAttachments(commentId: string): Promise<Comment | null> {
  const supabase = createClient();
  
  try {
    // Obtener el comentario con su perfil
    const { data: comment, error: commentError } = await supabase
      .from("comments")
      .select(`
        *,
        profiles:user_id(*)
      `)
      .eq("id", commentId)
      .single();
    
    if (commentError) {
      console.error("Error fetching new comment:", commentError.message);
      return null;
    }

    // Obtener los archivos adjuntos del comentario
    const { data: attachments, error: attachmentsError } = await supabase
      .from("attachments")
      .select("*")
      .eq("comment_id", commentId);

    if (attachmentsError) {
      console.error("Error fetching attachments:", attachmentsError.message);
      return null;
    }

    // Combinar el comentario con sus archivos adjuntos
    return {
      ...comment,
      attachments: attachments || []
    } as Comment;
    
  } catch (error) {
    console.error("Error in getNewCommentWithAttachments:", error);
    return null;
  }
}
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

