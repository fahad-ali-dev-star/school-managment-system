import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('users').select('school_id, role').eq('id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const date = new URL(req.url).searchParams.get('date') ?? new Date().toISOString().split('T')[0]
  
  let query = supabase.from('attendance')
    .select('*, students!inner(full_name, roll_number, class_name, section, parent_email)')
    .eq('school_id', profile.school_id).eq('date', date)

  if (profile.role === 'teacher') {
    const { data: teacherRow } = await supabase.from('teachers').select('class_assigned').eq('email', user.email!).eq('school_id', profile.school_id).single()
    if (!teacherRow?.class_assigned) return NextResponse.json([])
    const { parseClassAssigned } = await import('@/lib/teacherAccess')
    const { class_name, section } = parseClassAssigned(teacherRow.class_assigned)
    query = query.eq('students.class_name', class_name).eq('students.section', section)
  } else if (profile.role === 'parent') {
    query = query.eq('students.parent_email', user.email!)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('users').select('school_id, id').eq('id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { records } = await req.json()
  const rows = records.map((r: any) => ({ school_id: profile.school_id, teacher_id: profile.id, ...r }))
  const { data, error } = await supabase.from('attendance')
    .upsert(rows, { onConflict: 'school_id,student_id,date' }).select()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}
