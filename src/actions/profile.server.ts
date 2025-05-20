"use server";
import { createClient } from "@/utils/supabase/server";
import { Profile } from "../types/types";


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
export async function updateProfile(id: string, data:Profile): Promise<Profile> {
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