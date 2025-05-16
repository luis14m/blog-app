'use server'

import { createClient } from "@/utils/supabase/server";

import type { PostInsert, Post } from './types';

import { generateSlug } from "../utils";

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

export async function updatePost(id: string, formData: FormData) {
  const title = formData.get('title') as string
  const content = formData.get('content') as string
  const excerpt = formData.get('excerpt') as string
  const published = formData.get('published') === 'true'
  const coverImage = formData.get('coverImage') as string

  const supabase = await createClient()
  
  const { data: userData, error: userError } = await supabase.auth.getUser()
  
  if (userError || !userData.user) {
    throw new Error('You must be logged in to update a post')
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

  if (post.user_id !== userData.user.id) {
    throw new Error('You do not have permission to update this post')
  }

  // Generate new slug from title
  const slug = generateSlug(title);
    
  // Update post
  const { error: updateError } = await supabase
    .from('posts')
    .update({
      title,
      content,
      excerpt: excerpt || null,
      slug,
      published,
    })
    .eq('id', id)

  if (updateError) {
    throw updateError
  }

}



export async function deletePost(id: string) {
  const supabase = await createClient()
  
  const { data: userData, error: userError } = await supabase.auth.getUser()
  
  if (userError || !userData.user) {
    throw new Error('You must be logged in to delete a post')
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

  if (post.user_id !== userData.user.id) {
    throw new Error('You do not have permission to delete this post')
  }

  // First delete all comments associated with the post
  const { error: commentsDeleteError } = await supabase
    .from('comments')
    .delete()
    .eq('post_id', id)

  if (commentsDeleteError) {
    throw commentsDeleteError
  }

  // Then delete the post
  const { error: deleteError } = await supabase
    .from('posts')
    .delete()
    .eq('id', id)

  if (deleteError) {
    throw deleteError
  }
}
