import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

async function assertAdminOrTeacher() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('users').select('school_id, role').eq('id', user.id).single()
  if (!profile || !['admin', 'principal', 'teacher'].includes(profile.role)) return null
  return { user, profile, supabase }
}

// PUT – update fee record (status, amount, method, notes, paid_date, etc.)
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await assertAdminOrTeacher()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { status, amount, fee_type, month, due_date, paid_date, payment_method, notes } = body

  const updatePayload: Record<string, unknown> = {}
  if (status        !== undefined) updatePayload.status         = status
  if (amount        !== undefined) updatePayload.amount         = Number(amount)
  if (fee_type      !== undefined) updatePayload.fee_type       = fee_type
  if (month         !== undefined) updatePayload.month          = month
  if (due_date      !== undefined) updatePayload.due_date       = due_date
  if (payment_method !== undefined) updatePayload.payment_method = payment_method
  if (notes         !== undefined) updatePayload.notes          = notes
  // Set paid_date: if paid → use provided date; otherwise null
  updatePayload.paid_date = status === 'paid' ? (paid_date ?? new Date().toISOString().split('T')[0]) : null

  const { data, error } = await ctx.supabase
    .from('fees')
    .update(updatePayload)
    .eq('id', params.id)
    .eq('school_id', ctx.profile.school_id)
    .select('*, students(full_name, roll_number, class_name, section)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

// DELETE – remove fee record
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await assertAdminOrTeacher()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await ctx.supabase
    .from('fees')
    .delete()
    .eq('id', params.id)
    .eq('school_id', ctx.profile.school_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
