import { createClient } from './supabase/client'

export type UserRole = 'user' | 'admin'

export async function getUserRole(): Promise<UserRole> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return 'user'
  }
  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (error || !data) {
    return 'user'
  }

  return data.role as UserRole
}

export async function isAdmin(): Promise<boolean> {
  const role = await getUserRole()
  return role === 'admin'
}

export function requireAdmin() {
  return async () => {
    const isUserAdmin = await isAdmin()
    if (!isUserAdmin) {
      throw new Error('Unauthorized: Admin access required')
    }
  }
}
