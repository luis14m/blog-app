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
  profile: Database["public"]["Tables"]["profiles"]["Row"] | null;
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


