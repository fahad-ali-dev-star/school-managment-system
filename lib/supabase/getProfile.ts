import { cache } from 'react'
import { cookies } from 'next/headers'
import { createClient } from './server'

export const getProfile = cache(async () => {
  try {
    const supabase = createClient()

    // 1. Check local session from cookies first (fast, 0ms network latency)
    const { data: sessionData } = await supabase.auth.getSession()
    const sessionUser = sessionData.session?.user ?? null

    const cookieStore = cookies()
    const cachedProfileStr = cookieStore.get('user-profile')?.value

    if (sessionUser && cachedProfileStr) {
      try {
        const cachedProfile = JSON.parse(cachedProfileStr)
        if (cachedProfile && cachedProfile.id === sessionUser.id && cachedProfile.school_id) {
          return cachedProfile
        }
      } catch (e) {
        console.warn('getProfile: Failed to parse user-profile cookie', e)
      }
    }

    // 2. Fallback: If session user wasn't found from getSession, check getUser()
    let user: any = sessionUser
    if (!user) {
      try {
        const { data, error } = await supabase.auth.getUser()
        if (!error && data?.user) {
          user = data.user
        }
      } catch (authErr: any) {
        console.warn('getProfile: auth.getUser() error:', authErr?.message ?? authErr)
      }
    }

    if (!user) {
      return null
    }

    // 3. Re-check cached profile if user was resolved from getUser
    if (cachedProfileStr) {
      try {
        const cachedProfile = JSON.parse(cachedProfileStr)
        if (cachedProfile && cachedProfile.id === user.id && cachedProfile.school_id) {
          return cachedProfile
        }
      } catch {}
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
