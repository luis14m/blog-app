'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { generateSlug } from './utils'

export async function signIn(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    throw error
  }

  revalidatePath('/')
  redirect('/blog')
}

export async function signUp(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const supabase = await createClient()

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  })

  if (error) {
    throw error
  }

  revalidatePath('/')
  redirect('/')
}



export async function createPost(formData: FormData) {
  const title = formData.get('title') as string
  const content = formData.get('content') as string
  const excerpt = formData.get('excerpt') as string
  const published = formData.get('published') === 'true'
  const coverImage = formData.get('coverImage') as string

  const supabase = await createClient()
  
  const { data: userData, error: userError } = await supabase.auth.getUser()
  
  if (userError || !userData.user) {
    throw new Error('You must be logged in to create a post')
  }

  const userId = userData.user.id
  
  // Generate slug from title
  const slug = generateSlug(title);

  // Create post
  const { data: post, error: postError } = await supabase
    .from('posts')
    .insert({
      title,
      content,
      excerpt: excerpt || null,
      slug,
      published,
      user_id: userId,
      cover_image: coverImage || null,
    })
    .select()
    .single()

  if (postError) {
    throw postError
  }

  revalidatePath('/blog')
  redirect(`/blog/${slug || post.id}`)
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
      cover_image: coverImage || null,
    })
    .eq('id', id)

  if (updateError) {
    throw updateError
  }

  revalidatePath('/blog')
  redirect(`/blog/${slug || id}`)
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

  // Delete post
  const { error: deleteError } = await supabase
    .from('posts')
    .delete()
    .eq('id', id)

  if (deleteError) {
    throw deleteError
  }

  revalidatePath('/blog')
  redirect('/blog')
}

export async function updateProfile(formData: FormData) {
  const username = formData.get('username') as string
  const displayName = formData.get('displayName') as string
  const avatarUrl = formData.get('avatarUrl') as string
  const bio = formData.get('bio') as string
  const website = formData.get('website') as string

  const supabase = await createClient()
  
  const { data: userData, error: userError } = await supabase.auth.getUser()
  
  if (userError || !userData.user) {
    throw new Error('You must be logged in to update your profile')
  }

  const userId = userData.user.id

  // Update profile
  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      username,
      display_name: displayName,
      avatar_url: avatarUrl,
      bio,
      website,
    })
    .eq('id', userId)

  if (updateError) {
    throw updateError
  }

  revalidatePath('/profile')
  redirect('/profile')
}

export async function addComment(formData: FormData) {
  const postId = formData.get('postId') as string;
  const contentRaw = formData.get('content') as string;

  // Parsea el contenido recibido (que es un string JSON)
  let content: any = "";
  try {
    content = JSON.parse(contentRaw);
  } catch {
    content = contentRaw; // fallback por si ya es string plano
  }

  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    throw new Error('Debes iniciar sesión para comentar');
  }

  const { error } = await supabase
    .from('comments')
    .insert({
      content,
      post_id: postId,
      user_id: userData.user.id,
    });

  if (error) {
    throw error;
  }

  revalidatePath(`/blog/${postId}`);
} 