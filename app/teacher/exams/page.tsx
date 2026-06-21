import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { parseAllClassesAssigned } from '@/lib/teacherAccess'
import TeacherExamsManager from './TeacherExamsManager'

export default async function TeacherExamsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('users').select('school_id').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const { data: teacherRow } = await supabase.from('teachers')
    .select('class_assigned').eq('email', user.email!).eq('school_id', profile.school_id).single()

  const assignedClasses = parseAllClassesAssigned(teacherRow?.class_assigned ?? '')
  const classNames = assignedClasses.map(c => c.class_name).filter(Boolean)

  let examsQuery = supabase.from('exams')
    .select('*, subjects(id, name, total_marks, passing_marks)')
    .eq('school_id', profile.school_id)
    .order('exam_date', { ascending: false })

  if (classNames.length > 0) {
    examsQuery = examsQuery.in('class_name', classNames)
  } else {
    examsQuery = examsQuery.eq('id', '00000000-0000-0000-0000-000000000000') // matches nothing
  }

  const { data: examsData } = await examsQuery

  const exams = (examsData ?? []).filter(exam => 
    assignedClasses.some(c => 
      c.class_name === exam.class_name && 
      (!c.section || c.section === exam.section)
    )
  )

  const displayClass = assignedClasses.length > 1 ? 'Multiple Classes' : (assignedClasses[0]?.class_name || '')
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

