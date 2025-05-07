import { createClient } from "@/utils/supabase/server";
import { Database } from "@/types/supabase";

type ProfilePost = Database["public"]["Tables"]["profile_posts"]["Row"];
//type ProfilePostType = ProfilePost["type"];

export async function getProfilePostsByType(
  profileId: string,
 
): Promise<ProfilePost[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profile_posts")
    .select("*")
    .eq("profile_id", profileId)
    
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getPostInteractions(postId: string): Promise<{
  favorites: number;
  bookmarks: number;
  reads: number;
}> {
  const supabase = await createClient();

  const counts = await Promise.all([
    supabase
      .from("profile_posts")
      .select("id", { count: "exact" })
      .eq("post_id", postId)
      
    supabase
      .from("profile_posts")
      .select("id", { count: "exact" })
      .eq("post_id", postId)
      
    supabase
      .from("profile_posts")
      .select("id", { count: "exact" })
      .eq("post_id", postId)
      
  ]);

  return {
    favorites: counts[0].count || 0,
    bookmarks: counts[1].count || 0,
    reads: counts[2].count || 0,
  };
}

export async function addProfilePost(
  profileId: string,
  postId: string,
  type: ProfilePostType
): Promise<ProfilePost> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profile_posts")
    .insert({
      profile_id: profileId,
      post_id: postId,
      type,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function removeProfilePost(
  profileId: string,
  postId: string,
  type: ProfilePostType
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("profile_posts")
    .delete()
    .eq("profile_id", profileId)
    .eq("post_id", postId)
    .eq("type", type);

  if (error) throw error;
}

export async function hasProfilePost(
  profileId: string,
  postId: string,
  type: ProfilePostType
): Promise<boolean> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profile_posts")
    .select("id")
    .eq("profile_id", profileId)
    .eq("post_id", postId)
    .eq("type", type)
    .maybeSingle();

  if (error) throw error;
  return !!data;
}