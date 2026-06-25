import { redirect } from 'next/navigation'
import { parseAllClassesAssigned } from '@/lib/teacherAccess'
import ReportCardsUI from '@/app/report-cards/ReportCardsUI'
import { getProfile } from '@/lib/supabase/getProfile'
import { createClient } from '@/lib/supabase/server'

export default async function TeacherReportCardsPage() {
  const profile = await getProfile()
  if (!profile) redirect('/login')

  const supabase = createClient()

  let teacherRow: any   = null
  let examsData:  any[] = []

  try {
    const { data } = await supabase.from('teachers')
      .select('class_assigned').eq('email', profile.email).eq('school_id', profile.school_id).single()
    teacherRow = data

    const assignedClassesTmp = parseAllClassesAssigned(teacherRow?.class_assigned ?? '')
    const classNamesTmp = assignedClassesTmp.map(c => c.class_name).filter(Boolean)

    let examsQuery = supabase.from('exams')
      .select('id, title, class_name, section, exam_date, status, exam_type')
      .eq('school_id', profile.school_id)
      .in('status', ['completed', 'published'])
      .order('exam_date', { ascending: false })

    if (classNamesTmp.length > 0) {
      examsQuery = examsQuery.in('class_name', classNamesTmp)
    } else {
      examsQuery = examsQuery.eq('id', '00000000-0000-0000-0000-000000000000') // matches nothing
    }

    const { data: examsResult } = await examsQuery
    examsData = examsResult ?? []
  } catch (err) {
    console.warn('TeacherReportCardsPage: Failed to fetch from Supabase (offline?):', err)
  }

  const assignedClasses = parseAllClassesAssigned(teacherRow?.class_assigned ?? '')

  const exams = examsData.filter(exam =>
    assignedClasses.some(c =>
      c.class_name === exam.class_name &&
      (!c.section || c.section === exam.section)
    )
  )

  return <ReportCardsUI exams={exams} />
}
