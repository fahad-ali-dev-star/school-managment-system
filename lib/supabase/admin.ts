import { createClient } from '@supabase/supabase-js'

// Server-only admin client using service role key (bypasses RLS + can create auth users)
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}
