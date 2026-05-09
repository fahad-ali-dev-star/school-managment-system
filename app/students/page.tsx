import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import StudentsList from './StudentsList'

export default async function StudentsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users').select('school_id').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const [{ data: students }, { data: classes }] = await Promise.all([
    supabase.from('students').select('*')
      .eq('school_id', profile.school_id)
      .eq('is_active', true)
      .order('class_name').order('roll_number'),
    supabase.from('classes').select('id, name, section')
      .eq('school_id', profile.school_id)
      .eq('is_active', true)
      .order('name').order('section'),
  ])

  return (
    <StudentsList
      students={students ?? []}
      classes={classes ?? []}
      schoolId={profile.school_id}
    />
  )
}
