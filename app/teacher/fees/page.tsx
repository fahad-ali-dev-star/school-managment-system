import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { parseClassAssigned } from '@/lib/teacherAccess'
import TeacherFeesView from './TeacherFeesView'

export default async function TeacherFeesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('users').select('school_id').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const { data: teacherRow } = await supabase.from('teachers')
    .select('class_assigned').eq('email', user.email!).eq('school_id', profile.school_id).single()

  const { class_name, section } = parseClassAssigned(teacherRow?.class_assigned ?? '')

  // Fetch students in teacher's class
  const { data: students } = await supabase.from('students')
    .select('id').eq('school_id', profile.school_id)
    .eq('class_name', class_name).eq('section', section).eq('is_active', true)

  const studentIds = (students ?? []).map(s => s.id)

  let fees: any[] = []
  if (studentIds.length > 0) {
    const { data } = await supabase.from('fees')
      .select('*, students(full_name, roll_number, class_name)')
      .in('student_id', studentIds)
      .order('created_at', { ascending: false })
    fees = data ?? []
  }

  return <TeacherFeesView fees={fees} className={class_name} section={section} />
}
