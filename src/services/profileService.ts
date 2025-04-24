import { createClient } from "@/lib/supabase/server";
import { Database } from "@/types/supabase";

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

export async function updateProfile(userId: string, profile: Partial<Profile>): Promise<Profile> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .update(profile)
    .eq("id", userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}