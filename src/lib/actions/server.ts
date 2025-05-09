'use server'

import { createClient } from '@/utils/supabase/server'
import { generateSlug } from "@/lib/utils";
import { Database } from "@/types/supabase";

type Attachment = Database["public"]["Tables"]["attachments"]["Row"];

type PostInsert = Database['public']['Tables']['posts']['Insert'];

type Post = Database['public']['Tables']['posts']['Row'];

type ProfilePost = Database["public"]["Tables"]["profile_posts"]["Row"];


//----------------------ATTACHMENTS Actions--------------------------------

export async function createAttachment(attachment: {
  file_path: string;
  file_name: string;
  file_type: string;
  file_size: number;
  user_id: string;
  post_id?: string;
  comment_id?: string;
}): Promise<Attachment> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("attachments")
    .insert(attachment)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteAttachment(attachmentId: string, userId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("attachments")
    .delete()
    .eq("id", attachmentId)
    .eq("user_id", userId);

  if (error) throw error;
}

export async function uploadFile(
  file: File,
  bucket: string = "attachments",
  path: string = ""
): Promise<string> {
  const supabase = await createClient();
  
  const fileExt = file.name.split(".").pop();
  const filePath = `${path}${Math.random().toString(36).substring(2)}${fileExt ? `.${fileExt}` : ""}`;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(filePath, file);

  if (uploadError) throw uploadError;

  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(filePath);

  return data.publicUrl;
}
//----------------------POSTS Actions--------------------------------

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
      cover_image: coverImage || null,
    })
    .eq('id', id)

  if (updateError) {
    throw updateError
  }

}

export async function getPostsLimit(limit: number) {
  const supabase = await createClient()
  const { data: posts, error } = await supabase
  .from("posts")
  .select(` 
    id,
    title,
    excerpt,
    slug,
    created_at,
    cover_image,
    user_id,  
  `)
  .eq("published", true)
  .order("created_at", { ascending: false })
  .limit(limit)
  return posts
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


}

//----------------------PROFILE Actions--------------------------------

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

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
    console.log(updateError)
    throw updateError
  }
}

//----------------------COMMENTS Actions--------------------------------

export async function createComment(
  postId: string,
  userId: string,
  content: any
): Promise<Comment> {
  const supabase = await createClient();

  // Crear el comentario
  const { data, error } = await supabase
    .from("comments")
    .insert({
      post_id: postId,
      user_id: userId,
      content,
    })
    .select(`
      *,
      profiles:user_id(*)
    `)
    .single();

  if (error) throw error;
  
  // Obtener attachments en consulta separada
  const { data: attachments } = await supabase
    .from("attachments")
    .select("*")
    .eq("comment_id", data.id);
    
  // Combinar resultados
  return {
    ...data,
    attachments: attachments || []
  };
}

export async function createCommentFromForm(formData: FormData): Promise<Comment> {
  try {
    const postId = formData.get('postId') as string;
    const userId = formData.get('userId') as string;
    const content = formData.get('content');
    
    if (!postId) throw new Error('ID del post requerido');
    if (!userId) throw new Error('ID del usuario requerido');
    if (!content) throw new Error('Contenido requerido');
    
    let parsedContent;
    try {
      parsedContent = JSON.parse(content as string);
    } catch (e) {
      parsedContent = content;
    }
    
    const supabase = await createClient();
    
    // Primero, crear el comentario básico sin relaciones
    const { data, error } = await supabase
      .from("comments")
      .insert({
        post_id: postId,
        user_id: userId,
        content: parsedContent,
      })
      .select(`
        *,
        profiles:user_id(*)
      `)
      .single();
      
    if (error) throw error;
    
    // Luego, obtener los archivos adjuntos por separado
    const { data: attachments, error: attachmentsError } = await supabase
      .from("attachments")
      .select("*")
      .eq("comment_id", data.id);
      
    if (attachmentsError) {
      console.error("Error al obtener los adjuntos:", attachmentsError);
      // No lanzamos error aquí para no interrumpir el flujo
    }
    
    // Combinar datos
    const commentWithAttachments = {
      ...data,
      attachments: attachments || []
    };
    
    return commentWithAttachments;
  } catch (error: any) {
    console.error('Error creating comment:', error);
    throw new Error(error.message || 'Error al crear el comentario');
  }
}

export async function deleteComment(commentId: string, userId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("comments")
    .delete()
    .eq("id", commentId)
    .eq("user_id", userId);

  if (error) throw error;
}




  //----------------------PROFILE-POSTS Actions--------------------------------

  export async function createProfilePost(
    profileId: string,
    postId: string,
    type: ProfilePost
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
  
  export async function deleteProfilePost(
    profileId: string,
    postId: string,
  
  ): Promise<void> {
    
    const supabase = await createClient();
    const { error } = await supabase
      .from("profile_posts")
      .delete()
      .eq("profile_id", profileId)
      .eq("post_id", postId)
      
  
    if (error) throw error;
  }
  
  export async function hasProfilePost(
    profileId: string,
    postId: string,

  ): Promise<boolean> {
    const supabase = await createClient();
  
    const { data, error } = await supabase
      .from("profile_posts")
      .select("id")
      .eq("profile_id", profileId)
      .eq("post_id", postId)
      .maybeSingle();
  
    if (error) throw error;
    return !!data;
  }
