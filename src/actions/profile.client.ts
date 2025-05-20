// Acciones de CLIENTE para profiles
import { createClient } from "@/utils/supabase/client";
import { Database } from "@/types/supabase";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

// Obtener perfil público por ID
export async function getProfileById(id: string): Promise<Profile | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

// Agregar después de getProfile()

export async function getUserAndProfile(): Promise<{
  user: any;
  profile: Profile | null;
}> {
  const supabase = createClient();
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return { user: null, profile: null };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    return { user, profile };
  } catch (error) {
    console.error('Error fetching user and profile:', error);
    return { user: null, profile: null };
  }
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

  export async function deletePost(id: string) {
    const supabase = await createClient()
    
    const { data: userData, error: userError } = await supabase.auth.getUser()
    
    if (userError || !userData.user) {
      throw new Error('You must be logged in to delete a post')
    }
  
    // Check if user is the post owner
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('user_id')
      .eq('id', id)
      .single()
  
    if (postError) {
      throw postError
    }
  
    if (post.user_id !== userData.user.id) {
      throw new Error('You do not have permission to delete this post')
    }
  
    // First delete all comments associated with the post
    const { error: commentsDeleteError } = await supabase
      .from('comments')
      .delete()
      .eq('post_id', id)
  
    if (commentsDeleteError) {
      throw commentsDeleteError
    }
  
    // Then delete the post
    const { error: deleteError } = await supabase
      .from('posts')
      .delete()
      .eq('id', id)
  
    if (deleteError) {
      throw deleteError
    }
  }


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

// Agregar después de getProfile()

