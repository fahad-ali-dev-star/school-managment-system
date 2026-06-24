import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

async function getSchoolId() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('users').select('school_id').eq('id', user.id).single()
  return data ? { school_id: data.school_id, supabase } : null
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getSchoolId()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await (ctx.supabase as any)
    .from('classes')
    .select('*, students(id, full_name, roll_number, gender, fee_status)')
    .eq('id', params.id)
    .eq('school_id', ctx.school_id)
    .eq('students.is_active', true)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getSchoolId()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { data, error } = await (ctx.supabase as any)
    .from('classes')
    .update(body)
    .eq('id', params.id)
    .eq('school_id', ctx.school_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getSchoolId()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Soft delete — set is_active = false
  const { error } = await (ctx.supabase as any)
    .from('classes')
    .update({ is_active: false })
    .eq('id', params.id)
    .eq('school_id', ctx.school_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
