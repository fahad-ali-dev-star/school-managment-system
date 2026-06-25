import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.warn('Supabase credentials are not configured. Skipping auth middleware.')
    return response
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        get(name: string) { return request.cookies.get(name)?.value },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const { pathname } = request.nextUrl
  const isLogin = pathname === '/login'

  // Public paths that don't require auth
  const isPublic = isLogin || pathname === '/' || pathname === '/super-admin' || pathname.startsWith('/api/')

  // ── OFFLINE-SAFE AUTH CHECK ──────────────────────────────────────────────
  // Use getSession() which reads the JWT from cookies — NO network request.
  // getUser() makes a round-trip to Supabase and fails when offline, causing
  // the user to get kicked to the login page even with a valid session.
  let session: any = null
  let isOfflineError = false
  try {
    const { data, error } = await supabase.auth.getSession()
    session = data.session
    if (error) {
      if (error.message?.includes('fetch') || error.status === 0 || (error as any).code === 'ENOTFOUND') {
        isOfflineError = true
      }
    }
  } catch (err: any) {
    console.warn('Middleware: getSession threw error:', err)
    isOfflineError = true
  }

  const user = session?.user ?? null

  if (!user && !isPublic) {
    const cachedRole = request.cookies.get('user-role')?.value
    if (cachedRole) {
      console.log('Middleware: Offline or session check failed, but user-role exists. Allowing through:', cachedRole)
      return response
    }
    console.log('Middleware: No user, redirecting to /login from', pathname)
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user && isLogin) {
    console.log('Middleware: User on /login, fetching role for redirect...')
    try {
      const { data: profile, error } = await supabase
        .from('users').select('role').eq('id', user.id).maybeSingle()

      if (error || !profile) {
        console.log('Middleware: No profile found for user, staying on login')
        return response
      }

      console.log('Middleware: User role is', profile.role)
      if (profile.role === 'teacher') return NextResponse.redirect(new URL('/teacher', request.url))
      if (profile.role === 'parent')  return NextResponse.redirect(new URL('/parent', request.url))
      return NextResponse.redirect(new URL('/dashboard', request.url))
    } catch {
      // Offline during login redirect resolution — stay on login page.
      return response
    }
  }

  // Role & Profile enforcement/caching
  if (user && (pathname.startsWith('/teacher') || pathname.startsWith('/parent') || pathname.startsWith('/dashboard') || pathname.startsWith('/students') || pathname.startsWith('/attendance') || pathname.startsWith('/fees') || pathname.startsWith('/classes') || pathname.startsWith('/teachers') || pathname.startsWith('/exams') || pathname.startsWith('/report-cards') || pathname.startsWith('/leaves') || pathname.startsWith('/notifications') || pathname.startsWith('/analytics') || pathname.startsWith('/parents'))) {

    let role = request.cookies.get('user-role')?.value
    let profileCookie = request.cookies.get('user-profile')?.value

    if (!role || !profileCookie) {
      try {
        const { data: profile } = await supabase
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
          .single()

        if (profile) {
          role = profile.role ?? undefined
          const schoolData = (profile as any).schools
          const profileData = {
            id: profile.id,
            school_id: profile.school_id,
            full_name: profile.full_name,
            email: profile.email,
            role: profile.role,
            school_name: schoolData?.name ?? 'Beacon Light School',
            plan: schoolData?.plan ?? 'free'
          }
          if (role) {
            response.cookies.set('user-role', role, { path: '/', maxAge: 60 * 60 * 24 * 7 })
            response.cookies.set('user-profile', JSON.stringify(profileData), { path: '/', maxAge: 60 * 60 * 24 * 7 })
          }
        }
      } catch {
        console.log('Middleware: Offline or database fetch failed — skipping role/profile cache.')
      }
    }

    if (role === 'teacher' && !(pathname.startsWith('/teacher/') || pathname === '/teacher') && !pathname.startsWith('/api/')) {
      console.log('Middleware: Teacher accessing admin route, redirecting to /teacher')
      return NextResponse.redirect(new URL('/teacher', request.url))
    }
    if (role === 'parent' && !(pathname.startsWith('/parent/') || pathname === '/parent') && !pathname.startsWith('/api/')) {
      console.log('Middleware: Parent accessing admin/teacher route, redirecting to /parent')
      return NextResponse.redirect(new URL('/parent', request.url))
    }
    if ((role === 'admin' || role === 'principal') && (pathname.startsWith('/teacher/') || pathname === '/teacher' || pathname.startsWith('/parent/') || pathname === '/parent')) {
      console.log('Middleware: Admin accessing portal route, redirecting to /dashboard')
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|.*\\.png$).*)'],
}
