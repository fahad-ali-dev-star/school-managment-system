import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

async function assertAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('users').select('school_id, role').eq('id', user.id).single()
  if (!profile || !['admin', 'principal'].includes(profile.role)) return null
  return { user, profile }
}

// GET – list parent accounts for this school
export async function GET() {
  const ctx = await assertAdmin()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data, error } = await admin.from('users')
    .select('id, email, full_name, created_at')
    .eq('school_id', ctx.profile.school_id)
    .eq('role', 'parent')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST – create parent auth user + profile
export async function POST(req: NextRequest) {
  const ctx = await assertAdmin()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { email, full_name } = await req.json()
  if (!email || !full_name)
    return NextResponse.json({ error: 'email and full_name are required' }, { status: 400 })

  const admin = createAdminClient()

  const { data: authData, error: authErr } = await admin.auth.admin.createUser({
    email: email.trim().toLowerCase(),
    password: 'parent1122',
    email_confirm: true,
  })
  if (authErr) return NextResponse.json({ error: authErr.message }, { status: 400 })

  const uid = authData.user.id

  const { error: userErr } = await admin.from('users').insert({
    id: uid,
    school_id: ctx.profile.school_id,
    full_name,
    email: email.trim().toLowerCase(),
    role: 'parent',
  })
  if (userErr) {
    await admin.auth.admin.deleteUser(uid)
    return NextResponse.json({ error: userErr.message }, { status: 400 })
  }

  return NextResponse.json({ id: uid, email, full_name }, { status: 201 })
}
