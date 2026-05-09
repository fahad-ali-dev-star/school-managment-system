import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('users').select('school_id').eq('id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('exams')
    .select('*, subjects(id, name, total_marks)')
    .eq('school_id', profile.school_id)
    .order('exam_date', { ascending: false })

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
  const { subjects, ...examData } = body

  // Insert exam
  const { data: exam, error: examErr } = await supabase
    .from('exams')
    .insert({ ...examData, school_id: profile.school_id })
    .select().single()

  if (examErr) return NextResponse.json({ error: examErr.message }, { status: 400 })

  // Insert subjects if provided
  if (subjects?.length > 0) {
    const subjectRows = subjects.map((s: any) => ({
      ...s, exam_id: exam.id, school_id: profile.school_id,
    }))
    await supabase.from('subjects').insert(subjectRows)
  }

  return NextResponse.json(exam, { status: 201 })
}
