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

// PUT – update parent email / full_name (admin only)
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await assertAdmin()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const admin = createAdminClient()

  if (body.email) {
    await admin.auth.admin.updateUserById(params.id, { email: body.email.trim().toLowerCase() })
  }

  const { data, error } = await admin.from('users')
    .update({
      ...(body.email ? { email: body.email.trim().toLowerCase() } : {}),
      ...(body.full_name ? { full_name: body.full_name } : {}),
    })
    .eq('id', params.id)
    .eq('school_id', ctx.profile.school_id)
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

// DELETE – delete parent auth user + profile
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await assertAdmin()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  await admin.auth.admin.deleteUser(params.id)
  await admin.from('users').delete().eq('id', params.id).eq('school_id', ctx.profile.school_id)

  return NextResponse.json({ success: true })
}
