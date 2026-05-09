import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('users').select('school_id, id').eq('id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { status, remarks } = await req.json()

  // Get current application first
  const { data: app } = await supabase
    .from('leave_applications')
    .select('student_id, leave_type_id, total_days, status')
    .eq('id', params.id)
    .eq('school_id', profile.school_id)
    .single()

  if (!app) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const currentStatus = app.status

  // Update the application status
  const { data, error } = await supabase
    .from('leave_applications')
    .update({
      status,
      remarks: remarks ?? null,
      reviewed_by: profile.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', params.id)
    .select('*, student:students(full_name,roll_number,class_name,section), leave_type:leave_types(name,color,max_days)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Update leave balance
  const { data: bal } = await supabase
    .from('leave_balance')
    .select('id, used_days')
    .eq('student_id', app.student_id)
    .eq('leave_type_id', app.leave_type_id)
    .eq('academic_year', '2025-2026')
    .single()

  if (bal) {
    let newUsed = bal.used_days
    if (status === 'approved' && currentStatus !== 'approved') {
      newUsed = bal.used_days + app.total_days
    } else if (status === 'rejected' && currentStatus === 'approved') {
      newUsed = Math.max(0, bal.used_days - app.total_days)
    }
    if (newUsed !== bal.used_days) {
      await supabase.from('leave_balance')
        .update({ used_days: newUsed })
        .eq('id', bal.id)
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
    .from('leave_applications')
    .update({ status: 'cancelled' })
    .eq('id', params.id)
    .eq('school_id', profile.school_id)
    .eq('status', 'pending')

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
