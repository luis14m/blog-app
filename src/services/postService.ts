"use server"
import { createClient } from "@/lib/supabase/server";
import { generateSlug } from "@/lib/utils";
import type { Database } from '@/types/supabase';

type PostInsert = Database['public']['Tables']['posts']['Insert'];
type Post = Database['public']['Tables']['posts']['Row'];

export async function createPost(
  userId: string,
  postData: Omit<PostInsert, 'user_id'>
): Promise<Post> {
  const supabase = await createClient();
  
  // Generate slug from title
  const slug = generateSlug(postData.title);
  
  const { data: post, error: postError } = await supabase
    .from("posts")
    .insert({
      ...postData,
      user_id: userId,
      slug,
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (postError) {
    throw postError;
  }

  return post;
}

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

export async function getPostById(id: string): Promise<Post | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("posts")
    .select(`
      *,
      profiles!fk_posts_user(*)
    `)
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

export async function updatePost(
  id: string,
  post: Partial<Omit<Post, "id" | "created_at" | "updated_at">>
): Promise<Post> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("posts")
    .update(post)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}
export async function deletePost(id: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("posts")
    .delete()
    .eq("id", id);

  if (error) throw error;
}
export async function getPostByIdWithAttachments(id: string): Promise<Post | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("posts")
    .select(`
      *,
      attachments(*)
    `)
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}