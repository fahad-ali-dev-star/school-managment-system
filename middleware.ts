import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl
  const isLogin = pathname === '/login'

  // Public paths that don't require auth
  const isPublic = isLogin || pathname === '/' || pathname === '/super-admin' || pathname.startsWith('/api/')

  if (!user && !isPublic) {
    console.log('Middleware: No user, redirecting to /login from', pathname)
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user && isLogin) {
    console.log('Middleware: User on /login, fetching role for redirect...')
    const { data: profile, error } = await supabase
      .from('users').select('role').eq('id', user.id).maybeSingle()

    if (error || !profile) {
      console.log('Middleware: No profile found for user, staying on login')
      // Optional: Sign out if no profile exists to clear the stuck session
      // await supabase.auth.signOut() 
      return response
    }

    console.log('Middleware: User role is', profile.role)
    if (profile.role === 'teacher') return NextResponse.redirect(new URL('/teacher', request.url))
    if (profile.role === 'parent')  return NextResponse.redirect(new URL('/parent', request.url))
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Role enforcement
  if (user && (pathname.startsWith('/teacher') || pathname.startsWith('/parent') || pathname.startsWith('/dashboard') || pathname.startsWith('/students') || pathname.startsWith('/attendance') || pathname.startsWith('/fees') || pathname.startsWith('/classes') || pathname.startsWith('/teachers') || pathname.startsWith('/exams') || pathname.startsWith('/report-cards') || pathname.startsWith('/leaves') || pathname.startsWith('/notifications') || pathname.startsWith('/analytics') || pathname.startsWith('/parents'))) {
    
    let role = request.cookies.get('user-role')?.value

    if (!role) {
      const { data: profile } = await supabase
        .from('users').select('role').eq('id', user.id).single()
      role = profile?.role
      if (role) {
        response.cookies.set('user-role', role, { path: '/', maxAge: 60 * 60 * 24 * 7 })
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
