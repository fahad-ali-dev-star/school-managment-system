import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { ensureParentAccount } from '@/lib/parentService'

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

  const res = await ensureParentAccount({
    schoolId: ctx.profile.school_id,
    email,
    fullName: full_name,
  })

  if (!res) {
    return NextResponse.json({ error: 'Failed to create parent account' }, { status: 400 })
  }

  return NextResponse.json(res, { status: 201 })
}
