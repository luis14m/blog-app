'use server'
import { createClient } from "@/utils/supabase/server";
import { Profile } from "@/types/supabase";
import { ProfileUpdate } from "@/types/supabase";


// Crear un nuevo perfil
export async function createProfile(userId: string, email: string): Promise<Profile> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .insert({
      id: userId,
      username: email,
      display_name: email.split('@')[0],
    
    })
    .select()
    .single();

  if (error) throw error;
  if (!data || !data.id || !data.username || !data.display_name || !data.created_at || !data.updated_at) {
    throw new Error("Profile creation failed or returned incomplete data");
  }
  return data as Profile;
}

// Actualizar un perfil
export async function updateProfile(id: string, data:ProfileUpdate): Promise<Profile> {
  const supabase = await createClient();
  const { data: profile, error } = await supabase
    .from("profiles")
    .update(data)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  if (!profile || !profile.id || !profile.username || !profile.display_name || !profile.created_at || !profile.updated_at) {
    throw new Error("Profile update failed or returned incomplete data");
  }
  return profile as Profile;
}

// Eliminar un perfil
export async function deleteProfile(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

// Obtener usuario y perfil (para Server Component)
export async function getUserAndProfile() {
  const supabase = await createClient();
  // Obtener usuario autenticado y validado
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) {
    return { user: null, profile: null };
  }
  let profile = null;
  if (user) {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    if (!error && data) {
      profile = data;
    }
  }
  return { user, profile };
}

