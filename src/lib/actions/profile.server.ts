"use server";
import { createClient } from "@/utils/supabase/server";
import { Database } from "@/types/supabase";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

// Crear un nuevo perfil
export async function createProfile(userId: string, email: string): Promise<Profile> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .insert({
      id: userId,
      username: email,
      display_name: email.split('@')[0],
      avatar_url: null
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Actualizar un perfil
export async function updateProfile(id: string, data: Partial<Profile>): Promise<Profile> {
  const supabase = await createClient();
  const { data: profile, error } = await supabase
    .from("profiles")
    .update(data)
    .eq("id", id)
    .single();
  if (error) throw error;
  return profile;
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
