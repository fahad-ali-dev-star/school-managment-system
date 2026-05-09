import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { parseClassAssigned } from '@/lib/teacherAccess'
import TeacherExamsManager from './TeacherExamsManager'

export default async function TeacherExamsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('users').select('school_id').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const { data: teacherRow } = await supabase.from('teachers')
    .select('class_assigned').eq('email', user.email!).eq('school_id', profile.school_id).single()

  const { class_name, section } = parseClassAssigned(teacherRow?.class_assigned ?? '')

  const { data: exams } = await supabase.from('exams')
    .select('*, subjects(id, name, total_marks, passing_marks)')
    .eq('school_id', profile.school_id)
    .eq('class_name', class_name)
    .order('exam_date', { ascending: false })

  return (
    <TeacherExamsManager
      exams={exams ?? []}
      schoolId={profile.school_id}
      className={class_name}
      section={section}
    />
  )
}
