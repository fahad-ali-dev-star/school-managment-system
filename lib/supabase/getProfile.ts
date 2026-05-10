import { cache } from 'react'
import { createClient } from './server'

export const getProfile = cache(async () => {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('users')
    .select('id, school_id, full_name, email, role, schools(name)')
    .eq('id', user.id)
    .single()

  if (!profile) return null

  return {
    ...profile,
    school_name: (profile as any).schools?.name ?? 'Beacon Light School'
  }
})
