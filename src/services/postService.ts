import { createClient } from "@/lib/supabase/server";
import { Database } from "@/types/supabase";

type Post = Database["public"]["Tables"]["posts"]["Row"] & {
  profiles: Database["public"]["Tables"]["profiles"]["Row"] | null;
};

export async function getPublishedPosts(): Promise<Post[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("posts")
    .select(`
      id,
      title,
      excerpt,
      slug,
      created_at,
      cover_image,
      user_id,
      profiles (
        username,
        display_name,
        avatar_url
      )
    `)
    .eq("published", true)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("posts")
    .select(`
      *,
      profiles (
        username,
        display_name,
        avatar_url
      )
    `)
    .eq("slug", slug)
    .single();

  if (error) throw error;
  return data;
}

export async function getUserPosts(userId: string): Promise<Post[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("posts")
    .select(`
      *,
      profiles (
        username,
        display_name,
        avatar_url
      )
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}