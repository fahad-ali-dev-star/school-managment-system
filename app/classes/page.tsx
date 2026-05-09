import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ClassesManager from './ClassesManager'

export default async function ClassesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users').select('school_id').eq('id', user.id).single()
  if (!profile) redirect('/login')

  // Fetch classes with student count via join
  const { data: classes } = await supabase
    .from('classes')
    .select('*, students(count)')
    .eq('school_id', profile.school_id)
    .eq('is_active', true)
    .order('name').order('section')

  const formatted = (classes ?? []).map(c => ({
    ...c,
    student_count: (c.students as any)?.[0]?.count ?? 0,
    students: undefined,
  }))

  return <ClassesManager classes={formatted} schoolId={profile.school_id} />
}
