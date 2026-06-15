import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ExamsManager from './ExamsManager'

export default async function ExamsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users').select('school_id').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const [{ data: exams }, { data: classes }] = await Promise.all([
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

  return (
    <ExamsManager
      exams={exams ?? []}
      classes={classes ?? []}
      schoolId={profile.school_id}
    />
  )
}
