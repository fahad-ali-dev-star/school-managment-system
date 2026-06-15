import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder_key'

  if (url === 'http://localhost:54321' || key === 'placeholder_key') {
    if (typeof window !== 'undefined') {
      console.warn('Supabase client: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is missing! Using placeholder values.')
    }
  }

  return createBrowserClient(url, key)
}

