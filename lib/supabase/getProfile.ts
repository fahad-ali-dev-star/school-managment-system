import { cache } from 'react'
import { createClient } from './server'

export const getProfile = cache(async () => {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    console.log('getProfile: No auth user found')
    return null
  }

  console.log('getProfile: Fetching profile for user', user.id)

  const { data: profile, error } = await supabase
    .from('users')
    .select(`
      id, 
      school_id, 
      full_name, 
      email, 
      role, 
      schools (
        name,
        plan
      )
    `)
    .eq('id', user.id)
    .maybeSingle()

  if (error) {
    console.error('getProfile: Database error:', error)
  }

  if (!profile) {
    console.log('getProfile: No profile row found')
    return null
  }

  const schoolData = (profile as any).schools
  const currentPlan = schoolData?.plan ?? 'free'
  
  console.log('getProfile: Profile found for', profile.full_name, '| Plan:', currentPlan)

  return {
    ...profile,
    school_name: schoolData?.name ?? 'Beacon Light School',
    plan: currentPlan
  }
})
