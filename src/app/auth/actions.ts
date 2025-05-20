'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { createProfile } from '@/actions/profile.server'

export async function login(formData: FormData) {
  const supabase = await createClient()

  // Obtener la URL de origen si existe
  const redirectTo = formData.get('redirectTo') as string || '/'

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    throw error
  }

  // Revalidar rutas específicas
  revalidatePath('/', 'layout')
  revalidatePath('/', 'page')
  revalidatePath('/blog')
  revalidatePath('/dashboard')
  revalidatePath('/profile')

  redirect('/blog')
  
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const redirectTo = formData.get('redirectTo') as string || '/'

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { data: authData, error } = await supabase.auth.signUp(data)

  if (error) {
    throw error
  }

  if (authData.user) {
    try {
      await createProfile(authData.user.id, authData.user.email!)
    } catch (error) {
      console.error('Error creating profile:', error)
    }
  }

  // Revalidar rutas específicas
  revalidatePath('/', 'layout')
  revalidatePath('/', 'page')
  revalidatePath('/blog')
  revalidatePath('/dashboard')
  revalidatePath('/profile')
  
  redirect(redirectTo)
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return redirect('/auth/login');
}