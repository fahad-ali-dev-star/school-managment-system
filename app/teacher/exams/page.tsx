import { redirect } from 'next/navigation'
import { parseAllClassesAssigned } from '@/lib/teacherAccess'
import TeacherExamsManager from './TeacherExamsManager'
import { getProfile } from '@/lib/supabase/getProfile'
import { createClient } from '@/lib/supabase/server'

export default async function TeacherExamsPage() {
  const profile = await getProfile()
  if (!profile) redirect('/login')

  const supabase = createClient()

  let teacherRow: any = null
  let examsData:  any[] = []

  try {
    const { data } = await supabase.from('teachers')
      .select('class_assigned').eq('email', profile.email).eq('school_id', profile.school_id).single()
    teacherRow = data

    const assignedClassesTmp = parseAllClassesAssigned(teacherRow?.class_assigned ?? '')
    const classNamesTmp = assignedClassesTmp.map(c => c.class_name).filter(Boolean)

    let examsQuery = supabase.from('exams')
      .select('*, subjects(id, name, total_marks, passing_marks)')
      .eq('school_id', profile.school_id)
      .order('exam_date', { ascending: false })

    if (classNamesTmp.length > 0) {
      examsQuery = examsQuery.in('class_name', classNamesTmp)
    } else {
      examsQuery = examsQuery.eq('id', '00000000-0000-0000-0000-000000000000') // matches nothing
    }

    const { data: examsResult } = await examsQuery
    examsData = examsResult ?? []
  } catch (err) {
    console.warn('TeacherExamsPage: Failed to fetch from Supabase (offline?):', err)
  }

  const assignedClasses = parseAllClassesAssigned(teacherRow?.class_assigned ?? '')

  const exams = examsData.filter(exam =>
    assignedClasses.some(c =>
      c.class_name === exam.class_name &&
      (!c.section || c.section === exam.section)
    )
  )

  const displayClass   = assignedClasses.length > 1 ? 'Multiple Classes' : (assignedClasses[0]?.class_name || '')
  const displaySection = assignedClasses.length > 1 ? '' : (assignedClasses[0]?.section || '')

  return (
    <TeacherExamsManager
      exams={exams}
      schoolId={profile.school_id}
      className={displayClass}
      section={displaySection}
    />
  )
}
