import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('users').select('school_id').eq('id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get classes with student count
  const { data, error } = await supabase
    .from('classes')
    .select('*, students(count)')
    .eq('school_id', profile.school_id)
    .eq('is_active', true)
    .eq('students.is_active', true)
    .order('name').order('section')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Flatten student count
  const classes = data?.map(c => ({
    ...c,
    student_count: (c.students as any)?.[0]?.count ?? 0,
    students: undefined,
  }))

  return NextResponse.json(classes)
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('users').select('school_id').eq('id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  // Check duplicate
  const { data: existing } = await supabase
    .from('classes')
    .select('id')
    .eq('school_id', profile.school_id)
    .eq('name', body.name)
    .eq('section', body.section)
    .single()

  if (existing) {
    return NextResponse.json(
      { error: `${body.name} Section ${body.section} already exists` },
      { status: 409 }
    )
  }

  const { data, error } = await supabase
    .from('classes')
    .insert({ ...body, school_id: profile.school_id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}
