import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('users').select('school_id, role').eq('id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const className = searchParams.get('class_name')
  const section   = searchParams.get('section')

  let query = supabase.from('students').select('*')
    .eq('school_id', profile.school_id)
    .eq('is_active', true)

  if (className) query = query.eq('class_name', className)
  if (section)   query = query.eq('section', section)

  if (profile.role === 'teacher') {
    const { data: teacherRow } = await supabase.from('teachers').select('class_assigned').eq('email', user.email!).eq('school_id', profile.school_id).single()
    if (!teacherRow?.class_assigned) return NextResponse.json([])
    const { parseClassAssigned } = await import('@/lib/teacherAccess')
    const { class_name: tClass, section: tSection } = parseClassAssigned(teacherRow.class_assigned)
    query = query.eq('class_name', tClass).eq('section', tSection)
  } else if (profile.role === 'parent') {
    query = query.eq('parent_email', user.email!)
  }

  const { data, error } = await query.order('roll_number')
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
  const { data, error } = await supabase
    .from('students')
    .insert({ ...body, school_id: profile.school_id })
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}
