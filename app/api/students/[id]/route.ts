import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('users').select('school_id').eq('id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { data, error } = await supabase
    .from('students')
    .update(body)
    .eq('id', params.id)
    .eq('school_id', profile.school_id)
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  if (body.parent_email && body.parent_email.trim() && body.parent_name && body.parent_name.trim()) {
    try {
      const { ensureParentAccount } = await import('@/lib/parentService')
      await ensureParentAccount({
        schoolId: profile.school_id,
        email: body.parent_email,
        fullName: body.parent_name,
      })
    } catch (e) {
      console.error('Failed to auto create parent account:', e)
    }
  }

  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('users').select('school_id').eq('id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase
    .from('students')
    .update({ is_active: false })
    .eq('id', params.id)
    .eq('school_id', profile.school_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
