'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/utils/supabase/server'
import { createProfile } from '@/lib/actions/server'

export async function login(formData: FormData) {
  const supabase = await createClient()

  // Obtener la URL de origen si existe
  const redirectTo = formData.get('redirectTo') as string || '/'

  // type-casting here for convenience
  // in practice, you should validate your inputs
  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    redirect('/error')
  }

  revalidatePath('/', 'layout')
  // Redirigir al usuario a la página de origen
  redirect(redirectTo)
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  // Obtener la URL de origen si existe
  const redirectTo = formData.get('redirectTo') as string || '/'

  // type-casting here for convenience
  // in practice, you should validate your inputs
  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { data: authData, error } = await supabase.auth.signUp(data)

  if (error) {
    console.log(error)
    redirect('/error')
  }

  if (authData.user) {
    try {
      await createProfile(authData.user.id, authData.user.email!)
    } catch (error) {
      console.error('Error creating profile:', error)
    }
  }

  revalidatePath('/', 'layout')
  // Redirigir al usuario a la página de origen
  redirect(redirectTo)
}

export async function signOut() {
  const supabase = await createClient()
  
  await supabase.auth.signOut()
  
  revalidatePath('/')
  redirect('/')
}
