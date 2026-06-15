import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('users').select('school_id').eq('id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status    = searchParams.get('status')
  const studentId = searchParams.get('student_id')

  let query = supabase
    .from('leave_applications')
    .select(`
      *,
      student:students(full_name, roll_number, class_name, section),
      leave_type:leave_types(name, color, max_days)
    `)
    .eq('school_id', profile.school_id)
    .order('created_at', { ascending: false })

  if (status)    query = query.eq('status', status)
  if (studentId) query = query.eq('student_id', studentId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('users').select('school_id').eq('id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  // Calculate total_days
  const from = new Date(body.from_date)
  const to   = new Date(body.to_date)
  const diffTime = Math.abs(to.getTime() - from.getTime())
  const total_days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1

  // Check leave balance
  const { data: balance } = await supabase
    .from('leave_balance')
    .select('total_allowed, used_days')
    .eq('student_id', body.student_id)
    .eq('leave_type_id', body.leave_type_id)
    .eq('academic_year', '2025-2026')
    .single()

  if (balance) {
    const remaining = balance.total_allowed - balance.used_days
    if (total_days > remaining) {
      return NextResponse.json(
        { error: `Only ${remaining} days remaining for this leave type` },
        { status: 400 }
      )
    }
  }

  const { data, error } = await supabase
    .from('leave_applications')
    .insert({ ...body, school_id: profile.school_id, total_days, status: 'pending' })
    .select(`*, student:students(full_name, roll_number, class_name, section), leave_type:leave_types(name, color, max_days)`)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}
