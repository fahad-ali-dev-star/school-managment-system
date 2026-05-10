import { redirect } from 'next/navigation'
import StudentsList from './StudentsList'
import { getProfile } from '@/lib/supabase/getProfile'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function StudentsPage() {
  const profile = await getProfile()
  if (!profile) redirect('/login')

  const supabase = createClient()

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
