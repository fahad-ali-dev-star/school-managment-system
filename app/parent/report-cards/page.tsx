import { redirect } from 'next/navigation'
import ParentReportCards from './ParentReportCards'
import { getProfile } from '@/lib/supabase/getProfile'
import { createClient } from '@/lib/supabase/server'

export default async function ParentReportCardsPage() {
  const profile = await getProfile()
  if (!profile) redirect('/login')

  const supabase = createClient()

  let children: any[] = []
  let exams:    any[] = []

  try {
    const { data: childrenData } = await supabase.from('students')
      .select('id, full_name, roll_number, class_name, section')
      .eq('school_id', profile.school_id)
      .ilike('parent_email', profile.email)
      .eq('is_active', true)
    children = childrenData ?? []

    const classNames = [...new Set(children.map(c => c.class_name))]
    if (classNames.length > 0) {
      const { data } = await supabase.from('exams')
        .select('id, title, class_name, section, exam_date, status, exam_type')
        .eq('school_id', profile.school_id)
        .in('class_name', classNames)
        .in('status', ['completed', 'published'])
        .order('exam_date', { ascending: false })
      exams = data ?? []
    }
  } catch (err) {
    console.warn('ParentReportCardsPage: Failed to fetch from Supabase (offline?):', err)
  }

  return <ParentReportCards exams={exams} children_={children} parentEmail={profile.email} />
}
