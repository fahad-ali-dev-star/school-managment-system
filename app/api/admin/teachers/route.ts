import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

async function assertAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('users').select('school_id, role').eq('id', user.id).single()
  if (!profile || !['admin', 'principal'].includes(profile.role)) return null
  return { user, profile, supabase }
}

// POST  – create teacher auth user + profile
export async function POST(req: NextRequest) {
  const ctx = await assertAdmin()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { email, full_name, ...teacherData } = body

  if (!email || !full_name)
    return NextResponse.json({ error: 'email and full_name are required' }, { status: 400 })

  const admin = createAdminClient()

  // Create Supabase Auth user with default password
  const { data: authData, error: authErr } = await admin.auth.admin.createUser({
    email: email.trim().toLowerCase(),
    password: 'teacher1122',
    email_confirm: true,
  })
  if (authErr) return NextResponse.json({ error: authErr.message }, { status: 400 })

  const uid = authData.user.id

  // Insert into users table
  const { error: userErr } = await admin.from('users').insert({
    id: uid,
    school_id: ctx.profile.school_id,
    full_name,
    email: email.trim().toLowerCase(),
    role: 'teacher',
  })
  if (userErr) {
    await admin.auth.admin.deleteUser(uid)
    return NextResponse.json({ error: userErr.message }, { status: 400 })
  }

  // Insert into teachers table
  const { data: teacher, error: teacherErr } = await admin.from('teachers').insert({
    ...teacherData,
    full_name,
    email: email.trim().toLowerCase(),
    school_id: ctx.profile.school_id,
  }).select().single()
  if (teacherErr) {
    return NextResponse.json({ error: teacherErr.message }, { status: 400 })
  }

  return NextResponse.json({ ...teacher, auth_uid: uid }, { status: 201 })
}
