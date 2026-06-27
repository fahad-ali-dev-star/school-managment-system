'use client'
// components/AppInitializer.tsx
// Runs once on every page load:
//   1. Gets the current user's school_id from Supabase auth
//   2. Pulls all school data into IndexedDB (only if online)
//   3. Starts the reconnect listener so offline writes auto-sync

import { useEffect } from 'react'
import { syncAllDataFromSupabase } from '@/lib/offlineData'
import { startSyncListener }       from '@/lib/syncOnReconnect'
import { createClient }            from '@/lib/supabase/client'

export default function AppInitializer() {
  useEffect(() => {
    async function init() {
      try {
        const supabase = createClient()

        // Get the currently authenticated user
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Retrieve school_id from user metadata or the users/profiles table
        let schoolId: string | null =
          user.user_metadata?.school_id ??
          user.app_metadata?.school_id ??
          null

        // Fallback: look up school_id from the users table
        if (!schoolId) {
          const { data: profile } = await supabase
            .from('users')
            .select('school_id')
            .eq('id', user.id)
            .maybeSingle()
          schoolId = profile?.school_id ?? null
        }

        if (!schoolId) {
          console.warn('[AppInitializer] Could not determine school_id — offline data sync skipped')
          return
        }

        // 1. Pull data from Supabase into IndexedDB (skipped automatically if offline)
        await syncAllDataFromSupabase(schoolId)

        // 2. Start listening for internet reconnect events
        startSyncListener(schoolId)

        console.log('[AppInitializer] Initialized for school:', schoolId)
      } catch (err) {
        // Graceful degradation — if Supabase is unreachable we still have IndexedDB
        console.warn('[AppInitializer] Init failed (possibly offline):', err)
      }
    }

    init()
  }, [])

  // This component renders nothing — it's a side-effect only initializer
  return null
}
