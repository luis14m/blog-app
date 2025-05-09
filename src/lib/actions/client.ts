import { createClient } from '@/utils/supabase/client'
import { Database } from "@/types/supabase";


type Attachment = Database["public"]["Tables"]["attachments"]["Row"];

type Comment = Database["public"]["Tables"]["comments"]["Row"] & {
    profiles: Database["public"]["Tables"]["profiles"]["Row"] | null;
    attachments: Database["public"]["Tables"]["attachments"]["Row"][];
};



type Post = Pick<Database['public']['Tables']['posts']['Row'], 
  'id' | 'title' | 'excerpt' | 'slug' | 'created_at' | 'cover_image' | 'user_id'> & {
    profiles?: {
      username: string;
      display_name: string;
      avatar_url: string;
    };
};

//----------------------ATTACHMENTS--------------------------------

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

//-------------COMMENTS Actions--------------------------------

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

//----------------------POSTS Actions--------------------------------

export async function getPublishedPosts(): Promise<Post[]> {

    const supabase = await createClient();
    const { data: posts, error } = await supabase
    .from("posts")
    .select(`
      id,
      title,
      excerpt,
      slug,
      created_at,
      cover_image,
      user_id,
      profiles(username, display_name, avatar_url)
    `)
    .eq("published", true)
    .order("created_at", { ascending: false })
  
  
    if (error) throw error;
    return posts;
  }
  export async function getPostsLimit(limit: number): Promise<Post[]> {
    try {
      const supabase = await createClient();
      const { data: posts, error } = await supabase
        .from("posts")
        .select(` 
          id,
          title,
          excerpt,
          slug,
          created_at,
          cover_image,
          user_id,
          content,
          published,
          updated_at,
          profiles (
            username,
            display_name,
            avatar_url
          )
        `)
        .eq("published", true)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      return posts || [];
    } catch (error) {
      console.error('Error al obtener los posts limitados:', error);
      return [];
    }
  }
  export async function getPostBySlug(slug: string): Promise<Post | null> {
    const supabase = await createClient();
  
    const { data: post, error } = await supabase
      .from("posts")
      .select(`
        *,
        profiles!fk_posts_user(*)
      `)
      .eq("slug", slug)
      .single();
  
    if (error) {
      if (error.code === "PGRST116") {
        // If not found by slug, try by ID
        const { data, error: idError } = await supabase
          .from("posts")
          .select(`
            *,
            profiles!fk_posts_user(*)
          `)
          .eq("id", slug)
          .single();
  
        if (idError) throw idError;
        return data;
      }
      throw error;
    }
  
    return post;
  }
  
  export async function getUserPosts(userId: string): Promise<Post[]> {
    const supabase = await createClient();
  
    const { data, error } = await supabase
      .from("posts")
      .select(`
        *,
        profiles:user_id(*)
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
  
    if (error) throw error;
    return data || [];
  }
  
  export async function getPostById(id: string): Promise<Post | null> {
    const supabase = await createClient();
  
    const { data, error } = await supabase
      .from("posts")
      .select(`
        *,
        profiles!fk_posts_user(*)
      `)
      .eq("id", id)
      .single();
  
    if (error) throw error;
    return data;
  }
  
  export async function getPostByIdWithAttachments(id: string): Promise<Post | null> {
    const supabase = await createClient();
  
    const { data, error } = await supabase
      .from("posts")
      .select(`
        *,
        attachments(*)
      `)
      .eq("id", id)
      .single();
  
    if (error) throw error;
    return data;
  }
  
  

  //----------------------PROFILEPOSTS Actions--------------------------------

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export async function getProfile(userId: string): Promise<Profile | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) throw error;
  return data;
}

  export async function getProfilePostsByType(
    profileId: string,
   
  ): Promise<any[]> {
    const supabase = await createClient();
  
    const { data, error } = await supabase
      .from("profile_posts")
      .select("*")
      .eq("profile_id", profileId)
      
      .order("created_at", { ascending: false });
  
    if (error) throw error;
    return data || [];
  }
  
 