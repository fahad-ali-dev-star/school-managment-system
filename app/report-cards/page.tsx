import { redirect } from 'next/navigation'
import ReportCardsUI from './ReportCardsUI'
import { getProfile } from '@/lib/supabase/getProfile'
import { createClient } from '@/lib/supabase/server'

export default async function ReportCardsPage() {
  const profile = await getProfile()
  if (!profile) redirect('/login')

  const supabase = createClient()

  let exams: any[] = []

  try {
    // Fetch exams that are completed or published
    const { data } = await supabase
      .from('exams')
      .select('id, title, class_name, section, exam_date, status, exam_type')
      .eq('school_id', profile.school_id)
      .in('status', ['completed', 'published'])
      .order('exam_date', { ascending: false })
    exams = data ?? []
  } catch (err) {
    console.warn('ReportCardsPage: Failed to fetch from Supabase (offline?):', err)
  }

  return <ReportCardsUI exams={exams} />
}
