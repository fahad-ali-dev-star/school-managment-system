import { redirect } from 'next/navigation'
import ExamsManager from './ExamsManager'
import { getProfile } from '@/lib/supabase/getProfile'
import { createClient } from '@/lib/supabase/server'

export default async function ExamsPage() {
  const profile = await getProfile()
  if (!profile) redirect('/login')

  const supabase = createClient()

  let exams:   any[] = []
  let classes: any[] = []

  try {
    const [examsRes, classesRes] = await Promise.all([
      supabase.from('exams')
        .select('*, subjects(id, name, total_marks)')
        .eq('school_id', profile.school_id)
        .order('exam_date', { ascending: false }),
      supabase.from('classes')
        .select('id, name, section')
        .eq('school_id', profile.school_id)
        .eq('is_active', true)
        .order('name').order('section'),
    ])
    exams   = examsRes.data   ?? []
    classes = classesRes.data ?? []
  } catch (err) {
    console.warn('ExamsPage: Failed to fetch from Supabase (offline?):', err)
  }

  return (
    <ExamsManager
      exams={exams}
      classes={classes}
      schoolId={profile.school_id}
    />
  )
}
