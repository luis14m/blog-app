// Acciones de CLIENTE para comments
import { createClient } from "@/utils/supabase/client";
import { Database } from "@/types/supabase";

export type Comment = Database["public"]["Tables"]["comments"]["Row"];

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
