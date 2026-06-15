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

  if (profile.role === 'teacher') {
    const { data: teacherRow } = await supabase.from('teachers').select('class_assigned').eq('email', user.email!).eq('school_id', profile.school_id).single()
    if (!teacherRow?.class_assigned) return NextResponse.json([])
    const { parseClassAssigned } = await import('@/lib/teacherAccess')
    const { class_name, section } = parseClassAssigned(teacherRow.class_assigned)
    q = q.eq('students.class_name', class_name).eq('students.section', section)
  } else if (profile.role === 'parent') {
    q = q.eq('students.parent_email', user.email!)
  }

  const { data, error } = await q
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
