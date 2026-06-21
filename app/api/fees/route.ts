import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('users').select('school_id, role').eq('id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const status = new URL(req.url).searchParams.get('status')
  
  let q = supabase.from('fees')
    .select('*, students!inner(full_name, roll_number, class_name, section, parent_email)')
    .eq('school_id', profile.school_id).order('created_at', { ascending: false })
  
  if (status) q = q.eq('status', status)

  let queryPromise = q;

  if (profile.role === 'teacher') {
    const { data: teacherRow } = await supabase.from('teachers').select('class_assigned').eq('email', user.email!).eq('school_id', profile.school_id).single()
    if (!teacherRow?.class_assigned) return NextResponse.json([])
    const { parseAllClassesAssigned } = await import('@/lib/teacherAccess')
    const classes = parseAllClassesAssigned(teacherRow.class_assigned)
    if (classes.length === 0) return NextResponse.json([])
    
    queryPromise = queryPromise.in('students.class_name', classes.map(c => c.class_name))
    const { data, error } = await queryPromise
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const finalData = data.filter((fee: any) => 
      classes.some(c => 
        c.class_name === fee.students?.class_name && 
        (!c.section || c.section === fee.students?.section)
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
  const { data: profile } = await supabase.from('users').select('school_id').eq('id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const receipt = 'RCP-' + Date.now().toString(36).toUpperCase()
  const { data, error } = await supabase.from('fees')
    .insert({ ...body, school_id: profile.school_id, receipt_number: receipt }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}
