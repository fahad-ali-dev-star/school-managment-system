import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ReportCardsUI from './ReportCardsUI'

export default async function ReportCardsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users').select('school_id').eq('id', user.id).single()
  if (!profile) redirect('/login')

  // Fetch exams that are completed or published
  const { data: exams } = await supabase
    .from('exams')
    .select('id, title, class_name, section, exam_date, status, exam_type')
    .eq('school_id', profile.school_id)
    .in('status', ['completed', 'published'])
    .order('exam_date', { ascending: false })

  return <ReportCardsUI exams={exams ?? []} />
}
