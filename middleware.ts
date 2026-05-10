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
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user && isLogin) {
    // Determine where to redirect based on role
    const { data: profile } = await supabase
      .from('users').select('role').eq('id', user.id).single()

    if (profile?.role === 'teacher') return NextResponse.redirect(new URL('/teacher', request.url))
    if (profile?.role === 'parent')  return NextResponse.redirect(new URL('/parent', request.url))
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Role enforcement: /teacher/* only for teachers, /parent/* only for parents
  if (user && (pathname.startsWith('/teacher') || pathname.startsWith('/parent') || pathname.startsWith('/dashboard') || pathname.startsWith('/students') || pathname.startsWith('/attendance') || pathname.startsWith('/fees') || pathname.startsWith('/classes') || pathname.startsWith('/teachers') || pathname.startsWith('/exams') || pathname.startsWith('/report-cards') || pathname.startsWith('/leaves') || pathname.startsWith('/notifications') || pathname.startsWith('/analytics') || pathname.startsWith('/parents'))) {
    
    // 1. Try to get role from cookie first (Fastest)
    let role = request.cookies.get('user-role')?.value

    // 2. If no cookie, fetch from DB and set cookie (Fallback)
    if (!role) {
      const { data: profile } = await supabase
        .from('users').select('role').eq('id', user.id).single()
      role = profile?.role
      if (role) {
        response.cookies.set('user-role', role, { path: '/', maxAge: 60 * 60 * 24 * 7 })
      }
    }

    // Teacher trying to access admin routes
    if (role === 'teacher' && !(pathname.startsWith('/teacher/') || pathname === '/teacher') && !pathname.startsWith('/api/')) {
      return NextResponse.redirect(new URL('/teacher', request.url))
    }
    // Parent trying to access admin/teacher routes
    if (role === 'parent' && !(pathname.startsWith('/parent/') || pathname === '/parent') && !pathname.startsWith('/api/')) {
      return NextResponse.redirect(new URL('/parent', request.url))
    }
    // Admin/principal trying to access teacher/parent portals
    if ((role === 'admin' || role === 'principal') && (pathname.startsWith('/teacher/') || pathname === '/teacher' || pathname.startsWith('/parent/') || pathname === '/parent')) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|.*\\.png$).*)'],
}
