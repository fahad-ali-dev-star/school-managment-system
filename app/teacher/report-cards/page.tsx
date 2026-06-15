import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { parseClassAssigned } from '@/lib/teacherAccess'
import ReportCardsUI from '@/app/report-cards/ReportCardsUI'

export default async function TeacherReportCardsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('users').select('school_id').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const { data: teacherRow } = await supabase.from('teachers')
    .select('class_assigned').eq('email', user.email!).eq('school_id', profile.school_id).single()

  const { class_name, section } = parseClassAssigned(teacherRow?.class_assigned ?? '')

  const { data: exams } = await supabase.from('exams')
    .select('id, title, class_name, section, exam_date, status, exam_type')
    .eq('school_id', profile.school_id)
    .eq('class_name', class_name)
    .in('status', ['completed', 'published'])
    .order('exam_date', { ascending: false })

  return <ReportCardsUI exams={exams ?? []} />
}
