import { cache } from 'react'
import { cookies } from 'next/headers'
import { createClient } from './server'

export const getProfile = cache(async () => {
  try {
    const supabase = createClient()

    // 1. Always verify the active session/user first
    let user: any = null
    try {
      const { data, error } = await supabase.auth.getUser()
      if (!error && data?.user) {
        user = data.user
      } else {
        const { data: sessionData } = await supabase.auth.getSession()
        user = sessionData.session?.user ?? null
      }
    } catch (authErr: any) {
      try {
        const { data: sessionData } = await supabase.auth.getSession()
        user = sessionData.session?.user ?? null
      } catch {
        user = null
      }
    }

    if (!user) {
      return null
    }

    // 2. Optional fast path: check cached cookie ONLY IF it matches verified user id
    const cookieStore = cookies()
    const cachedProfileStr = cookieStore.get('user-profile')?.value
    if (cachedProfileStr) {
      try {
        const cachedProfile = JSON.parse(cachedProfileStr)
        if (cachedProfile && cachedProfile.id === user.id) {
          return cachedProfile
        }
      } catch (e) {
        console.warn('getProfile: Failed to parse user-profile cookie', e)
      }
    }

    // 3. Fetch verified profile row from DB for this authenticated user ID
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
      return null
    }

    const schoolData = (profile as any).schools
    const currentPlan = schoolData?.plan ?? 'free'

    return {
      ...profile,
      school_name: schoolData?.name ?? 'School Management ERP',
      plan: currentPlan
    }
  } catch (err: any) {
    console.warn('getProfile: Network error (possibly offline):', err?.message ?? err)
    return null
  }
})
