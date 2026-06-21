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
  const examId    = searchParams.get('exam_id')
  const studentId = searchParams.get('student_id') // optional — for single PDF

  if (!examId) return NextResponse.json({ error: 'exam_id is required' }, { status: 400 })

  // 1. Exam + subjects
  const { data: exam, error: examErr } = await supabase
    .from('exams')
    .select('*, subjects(id, name, total_marks, passing_marks)')
    .eq('id', examId)
    .eq('school_id', profile.school_id)
    .single()

  if (examErr || !exam) return NextResponse.json({ error: 'Exam not found' }, { status: 404 })

  // 2. School info
  const { data: school } = await supabase
    .from('schools').select('*').eq('id', profile.school_id).single()

  // 3. Students for this class
  let studentsQ = supabase
    .from('students').select('*')
    .eq('school_id', profile.school_id)
    .eq('is_active', true)
    .order('roll_number')

  if (profile.role === 'teacher') {
    const { data: teacherRow } = await supabase.from('teachers')
      .select('class_assigned').eq('email', user.email!).eq('school_id', profile.school_id).single()
    if (!teacherRow?.class_assigned) return NextResponse.json({ error: 'No class assigned' }, { status: 403 })
    const { parseAllClassesAssigned } = await import('@/lib/teacherAccess')
    const classes = parseAllClassesAssigned(teacherRow.class_assigned)
    
    const isAllowed = classes.some(c => 
      c.class_name === exam.class_name && 
      (!c.section || c.section === exam.section)
    )
    if (!isAllowed) {
      return NextResponse.json({ error: 'Forbidden: not your class' }, { status: 403 })
    }
    studentsQ = studentsQ.eq('class_name', exam.class_name)
    if (exam.section) {
      studentsQ = studentsQ.eq('section', exam.section)
    }
  } else if (profile.role === 'parent') {
    // parent can only see their own children
    studentsQ = studentsQ.eq('parent_email', user.email!)
  } else {
    // Admin / Principal: filter by exam's class
    studentsQ = studentsQ.eq('class_name', exam.class_name).eq('section', exam.section)
  }

  if (studentId) studentsQ = studentsQ.eq('id', studentId)

  const { data: students } = await studentsQ
  if (!students?.length) return NextResponse.json({ error: 'No students found' }, { status: 404 })

  // 4. All marks for this exam
  const { data: marks } = await supabase
    .from('marks')
    .select('student_id, subject_id, marks_obtained, grade')
    .eq('exam_id', examId)
    .in('student_id', students.map(s => s.id))

  // 5. Attendance (whole year so far)
  const yearStart = `${new Date().getFullYear()}-01-01`
  const today     = new Date().toISOString().split('T')[0]

  const { data: attendance } = await supabase
    .from('attendance')
    .select('student_id, status')
    .eq('school_id', profile.school_id)
    .in('student_id', students.map(s => s.id))
    .gte('date', yearStart)
    .lte('date', today)

  // 6. Build per-student report
  const subjectList = exam.subjects ?? []
  const totalPossible = subjectList.reduce((s: number, sub: any) => s + Number(sub.total_marks), 0)

  // Calculate ranks (sort by total obtained)
  const studentTotals = students.map(st => {
    const stMarks = (marks ?? []).filter(m => m.student_id === st.id)
    return { id: st.id, total: stMarks.reduce((s, m) => s + Number(m.marks_obtained), 0) }
  }).sort((a, b) => b.total - a.total)

  const rankMap: Record<string, number> = {}
  studentTotals.forEach((s, i) => { rankMap[s.id] = i + 1 })

  const reports = students.map(student => {
    const stMarks  = (marks ?? []).filter(m => m.student_id === student.id)
    const stAtt    = (attendance ?? []).filter(a => a.student_id === student.id)

    const totalObtained = stMarks.reduce((s, m) => s + Number(m.marks_obtained), 0)
    const percentage    = totalPossible > 0 ? Math.round((totalObtained / totalPossible) * 100) : 0
    const passed        = totalObtained >= exam.passing_marks

    const overallGrade =
      percentage >= 90 ? 'A+' :
      percentage >= 80 ? 'A'  :
      percentage >= 70 ? 'B'  :
      percentage >= 60 ? 'C'  :
      percentage >= 40 ? 'D'  : 'F'

    const presentDays = stAtt.filter(a => a.status === 'present').length
    const absentDays  = stAtt.filter(a => a.status === 'absent').length
    const lateDays    = stAtt.filter(a => a.status === 'late').length
    const totalDays   = stAtt.length
    const attPercent  = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0

    // Per-subject marks
    const subjectMarks = subjectList.map((sub: any) => {
      const m = stMarks.find(mk => mk.subject_id === sub.id)
      return {
        subject: sub.name,
        total_marks: sub.total_marks,
        passing_marks: sub.passing_marks,
        obtained: m ? Number(m.marks_obtained) : null,
        grade: m?.grade ?? null,
        passed: m ? Number(m.marks_obtained) >= sub.passing_marks : null,
      }
    })

    return {
      student: {
        id: student.id,
        full_name: student.full_name,
        roll_number: student.roll_number,
        class_name: student.class_name,
        section: student.section,
        gender: student.gender,
        parent_name: student.parent_name,
        parent_phone: student.parent_phone,
        admission_date: student.admission_date,
      },
      exam: {
        title: exam.title,
        exam_type: exam.exam_type,
        exam_date: exam.exam_date,
        class_name: exam.class_name,
        section: exam.section,
      },
      subjectMarks,
      totalObtained,
      totalPossible,
      percentage,
      overallGrade,
      passed,
      rank: rankMap[student.id] ?? '-',
      totalStudents: students.length,
      attendance: { presentDays, absentDays, lateDays, totalDays, attPercent },
    }
  })

  return NextResponse.json({
    school: {
      name: school?.name ?? 'Beacon Light School',
      address: school?.address ?? 'Rajanpur, Punjab, Pakistan',
      phone: school?.phone ?? '',
    },
    exam: {
      id: exam.id,
      title: exam.title,
      exam_type: exam.exam_type,
      exam_date: exam.exam_date,
      class_name: exam.class_name,
      section: exam.section,
      total_marks: totalPossible,
      passing_marks: exam.passing_marks,
    },
    reports,
  })
}
