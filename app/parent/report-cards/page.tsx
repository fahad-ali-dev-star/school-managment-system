import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ParentReportCards from './ParentReportCards'

export default async function ParentReportCardsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('users').select('school_id').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const { data: children } = await supabase.from('students')
    .select('id, full_name, roll_number, class_name, section')
    .eq('school_id', profile.school_id)
    .ilike('parent_email', user.email!)
    .eq('is_active', true)

  const childIds    = (children ?? []).map(c => c.id)
  const classNames  = [...new Set((children ?? []).map(c => c.class_name))]

  let exams: any[] = []
  if (classNames.length > 0) {
    const { data } = await supabase.from('exams')
      .select('id, title, class_name, section, exam_date, status, exam_type')
      .eq('school_id', profile.school_id)
      .in('class_name', classNames)
      .in('status', ['completed', 'published'])
      .order('exam_date', { ascending: false })
    exams = data ?? []
  }

  return <ParentReportCards exams={exams} children_={children ?? []} parentEmail={user.email!} />
}
