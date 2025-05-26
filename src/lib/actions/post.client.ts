// Acciones de CLIENTE para posts (y otros types si lo deseas)
// Aquí solo deben ir funciones que puedan ejecutarse en el navegador (lectura pública, fetch, etc)

import { createClient } from "@/utils/supabase/client";
import { Post } from "@/types/supabase";

// Ejemplo: obtener posts publicados (solo lectura pública)
export async function getPublishedPosts(): Promise<Post[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("posts")
    .select(`
      *,
      profiles:user_id(*)
    `)
    .eq("published", true)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}




export async function getUserPosts(userId: string): Promise<Post[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("posts")
    .select(`
      *,
      profiles:user_id(*),
      attachments(*)
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getPostsLimit(limit: number): Promise<Post[]> {
  try {
    const supabase = await createClient();
    const { data: posts, error } = await supabase
      .from("posts")
      .select(` 
     *,
        profiles (
          username,
          display_name
    
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
