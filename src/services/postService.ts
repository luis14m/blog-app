import { createClient } from "@/lib/supabase/server";
import { Database } from "@/types/supabase";

type Post = Database["public"]["Tables"]["posts"]["Row"] & {
  profiles: Database["public"]["Tables"]["profiles"]["Row"] | null;
};

export async function getPublishedPosts(): Promise<Post[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .eq("published", true)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  const supabase = await createClient();

  const { data: post, error } = await supabase
    .from("posts")
    .select(`
      *,
      profiles!fk_posts_user(*)
    `)
    .eq("slug", slug)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // If not found by slug, try by ID
      const { data, error: idError } = await supabase
        .from("posts")
        .select(`
          *,
          profiles!fk_posts_user(*)
        `)
        .eq("id", slug)
        .single();
      
      if (idError) throw idError;
      return data;
    }
    throw error;
  }

  return post;
}

export async function getUserPosts(userId: string): Promise<Post[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("posts")
    .select(`
      *,
      profiles:user_id(*)
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}