import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

function calcGrade(obtained: number, total: number): string {
  const pct = (obtained / total) * 100
  if (pct >= 90) return 'A+'
  if (pct >= 80) return 'A'
  if (pct >= 70) return 'B'
  if (pct >= 60) return 'C'
  if (pct >= 40) return 'D'
  return 'F'
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const subjectId = new URL(req.url).searchParams.get('subject_id')

  let query = supabase
    .from('marks')
    .select('*, students(full_name, roll_number), subjects(name, total_marks)')
    .eq('exam_id', params.id)

  if (subjectId) query = query.eq('subject_id', subjectId)

  const { data, error } = await query.order('created_at')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('users').select('school_id, role').eq('id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Parent cannot post marks
  if (profile.role === 'parent') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // If teacher, verify exam belongs to their assigned class
  if (profile.role === 'teacher') {
    const { data: teacherRow } = await supabase.from('teachers')
      .select('class_assigned').eq('email', user.email!).eq('school_id', profile.school_id).single()
    if (teacherRow?.class_assigned) {
      const { parseAllClassesAssigned } = await import('@/lib/teacherAccess')
      const classes = parseAllClassesAssigned(teacherRow.class_assigned)
      const { data: exam } = await supabase.from('exams').select('class_name, section').eq('id', params.id).single()
      if (exam) {
        const isAllowed = classes.some(c => 
          c.class_name === exam.class_name && 
          (!c.section || c.section === exam.section)
        )
        if (!isAllowed) {
          return NextResponse.json({ error: 'Forbidden: not your class' }, { status: 403 })
        }
      }
    }
  }

  const { marks } = await req.json() // array of { student_id, subject_id, marks_obtained }

  // Get subject total_marks for grade calculation
  const subjectIds = [...new Set(marks.map((m: any) => m.subject_id))]
  const { data: subjectsData } = await supabase
    .from('subjects').select('id, total_marks').in('id', subjectIds as string[])

  const subjectMap: Record<string, number> = {}
  subjectsData?.forEach(s => { subjectMap[s.id] = s.total_marks })

  // Fetch existing marks to get their IDs
  const { data: existingMarks } = await supabase
    .from('marks')
    .select('id, subject_id, student_id')
    .eq('exam_id', params.id)

  const existingMap = new Map(
    existingMarks?.map(m => [`${m.subject_id}-${m.student_id}`, m.id]) || []
  )

  const rows = marks.map((m: any) => {
    const row: any = {
      exam_id: params.id,
      school_id: profile.school_id,
      student_id: m.student_id,
      subject_id: m.subject_id,
      marks_obtained: Number(m.marks_obtained),
      grade: calcGrade(Number(m.marks_obtained), subjectMap[m.subject_id] ?? 100),
      remarks: m.remarks ?? null,
    }
    const existingId = existingMap.get(`${m.subject_id}-${m.student_id}`)
    if (existingId) {
      row.id = existingId
    }
    return row
  })

  const { data, error } = await supabase
    .from('marks')
    .upsert(rows)
    .select()

  if (error) {
    console.error('Marks Save Error:', error)
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
  return NextResponse.json(data, { status: 201 })
}
