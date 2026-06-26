import { cache } from 'react'
import { cookies } from 'next/headers'
import { createClient } from './server'

export const getProfile = cache(async () => {
  try {
    const cookieStore = cookies()
    const cachedProfileStr = cookieStore.get('user-profile')?.value
    if (cachedProfileStr) {
      try {
        const cachedProfile = JSON.parse(cachedProfileStr)
        console.log('getProfile: Returning cached profile from cookie:', cachedProfile.full_name)
        return cachedProfile
      } catch (e) {
        console.warn('getProfile: Failed to parse user-profile cookie', e)
      }
    }

    const supabase = createClient()

    // Try getUser() first (authenticates with Supabase Auth server).
    // If it fails due to a network error, fall back to getSession() which
    // reads the JWT directly from cookies — no network round-trip required.
    // This prevents an infinite redirect loop when the Supabase Auth server
    // is temporarily unreachable: getUser() throws → layout redirects to /login
    // → middleware redirects back to the portal → repeat.
    let user: any = null
    try {
      const { data, error } = await supabase.auth.getUser()
      if (!error) {
        user = data.user
      } else {
        console.warn('getProfile: getUser() returned error, falling back to getSession():', error.message)
        const { data: sessionData } = await supabase.auth.getSession()
        user = sessionData.session?.user ?? null
      }
    } catch (authErr: any) {
      console.warn('getProfile: getUser() threw, falling back to getSession():', authErr?.message)
      try {
        const { data: sessionData } = await supabase.auth.getSession()
        user = sessionData.session?.user ?? null
      } catch {
        user = null
      }
    }

    if (!user) {
      console.log('getProfile: No auth user found')
      return null
    }

    console.log('getProfile: Fetching profile from DB for user', user.id)

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
  } catch (err: any) {
    // Network unreachable (offline) — return null gracefully instead of crashing.
    console.warn('getProfile: Network error (possibly offline):', err?.message ?? err)
    return null
  }
})
