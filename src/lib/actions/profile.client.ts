// Acciones de CLIENTE para profiles
import { createClient } from "@/utils/supabase/client";

import { Profile } from "@/types/supabase";

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


export async function getProfiles(): Promise<Profile[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("*");

  if (error) throw error;
  return data || [];
}


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

// Utilidad para obtener el display_name del usuario autenticado

export async function getCurrentUserDisplayName() {
  const supabase = createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("No user");
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .single();
  if (profileError || !profile) throw new Error("No profile");
  return profile.display_name;
}

