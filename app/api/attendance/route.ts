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

  let queryPromise = query;

  if (profile.role === 'teacher') {
    const { data: teacherRow } = await supabase.from('teachers').select('class_assigned').eq('email', user.email!).eq('school_id', profile.school_id).single()
    if (!teacherRow?.class_assigned) return NextResponse.json([])
    const { parseAllClassesAssigned } = await import('@/lib/teacherAccess')
    const classes = parseAllClassesAssigned(teacherRow.class_assigned)
    if (classes.length === 0) return NextResponse.json([])

    queryPromise = queryPromise.in('students.class_name', classes.map(c => c.class_name))
    const { data, error } = await queryPromise
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const finalData = data.filter((att: any) => 
      classes.some(c => 
        c.class_name === att.students?.class_name && 
        (!c.section || c.section === att.students?.section)
      )
    )
    return NextResponse.json(finalData)
  } else if (profile.role === 'parent') {
    queryPromise = queryPromise.eq('students.parent_email', user.email!)
  }

  const { data, error } = await queryPromise
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

  if (rows.length > 0) {
    const studentIds = rows.map((r: any) => r.student_id)
    const date = rows[0].date
    const { data: existing } = await supabase.from('attendance')
      .select('id, student_id')
      .eq('school_id', profile.school_id)
      .eq('date', date)
      .in('student_id', studentIds)
    const existingMap = new Map(existing?.map((e: any) => [e.student_id, e.id]))
    rows.forEach((r: any) => {
      if (existingMap.has(r.student_id)) r.id = existingMap.get(r.student_id)
    })
  }

  const { data, error } = await supabase.from('attendance')
    .upsert(rows).select()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}
