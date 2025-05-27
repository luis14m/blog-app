'use server'
import { createClient } from "@/utils/supabase/server";

import type { PostInsert, Post, PostUpdate } from '@/types/supabase';

import { generateSlug } from "@/lib/utils";
import { revalidatePath } from "next/cache";

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

export async function getPostBySlug(slug: string): Promise<Post | null> {
  const supabase = await createClient();

  let { data: post, error } = await supabase
    .from("posts")
    .select(`
      *,
      profiles:user_id(*),
      attachments(*)
    `)
    .eq("slug", slug)
    .single();

  if (error && error.code === "PGRST116") {
    // If not found, try by ID
    ({ data: post } = await supabase
      .from("posts")
      .select(`
        *,
        profiles:user_id(*),
        attachments(*)
      `)
      .eq("id", slug)
      .maybeSingle());
  } else if (error) {
    throw error;
  }

  return post;
}


export async function updatePost(id: string, data: PostUpdate) {
  const { title } = data;

  const supabase = await createClient();

  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    throw new Error('You must be logged in to update a post');
  }

  // Check if user is the post owner
  const { data: post, error: postError } = await supabase
    .from('posts')
    .select('user_id')
    .eq('id', id)
    .single();

  if (postError) {
    throw postError;
  }

  if (post.user_id !== userData.user.id) {
    throw new Error('You do not have permission to update this post');
  }

  // Generate new slug from title
  const slug = generateSlug(title);

  // Update post
  const { error: updateError } = await supabase
    .from('posts')
    .update({
      ...data,
      slug,
      updated_at: new Date().toISOString()
    })
    .eq('id', id);

  if (updateError) {
    throw updateError;
  }
}


export async function getPostsByUserId(userId: string): Promise<Post[]> {
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


export async function deletePost(id: string) {
  const supabase = await createClient()
  
  const { data: userData, error: userError } = await supabase.auth.getUser()
  
  if (userError || !userData.user) {
    throw new Error('You must be logged in to delete a post')
  }

  // Get user profile to check role
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userData.user.id)
    .single()

  if (profileError) {
    throw profileError
  }

  // Check if user is the post owner
  const { data: post, error: postError } = await supabase
    .from('posts')
    .select('user_id')
    .eq('id', id)
    .single()

  if (postError) {
    throw postError
  }

  // Only allow if admin or post owner
  if (profile.role !== 'admin' && post.user_id !== userData.user.id) {
    throw new Error('You do not have permission to delete this post')
  }

  // First delete all attachments associated with the post
  const { error: attachmentsDeleteError } = await supabase
    .from('attachments')
    .delete()
    .eq('post_id', id)

  if (attachmentsDeleteError) {
    throw attachmentsDeleteError
  }

  // Then delete all comments associated with the post
  const { error: commentsDeleteError } = await supabase
    .from('comments')
    .delete()
    .eq('post_id', id)

  if (commentsDeleteError) {
    throw commentsDeleteError
  }

  // Finally delete the post
  const { error: deleteError } = await supabase
    .from('posts')
    .delete()
    .eq('id', id)

  if (deleteError) {
    throw deleteError
  }
  revalidatePath('/dashboard'); // Revalidate the post page after deletion
  revalidatePath('/blog'); // Revalidate the posts list page
}



