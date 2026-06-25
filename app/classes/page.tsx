import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ClassesManager from './ClassesManager'
import { getProfile } from '@/lib/supabase/getProfile'

export default async function ClassesPage() {
  const profile = await getProfile()
  if (!profile) redirect('/login')

  const supabase = createClient()

  let formatted: any[] = []

  try {
    // Fetch classes with student count via join
    const { data: classes } = await supabase
      .from('classes')
      .select('*, students(count)')
      .eq('school_id', profile.school_id)
      .eq('is_active', true)
      .eq('students.is_active', true)
      .order('name').order('section')

    formatted = (classes ?? []).map(c => ({
      ...c,
      student_count: (c.students as any)?.[0]?.count ?? 0,
      students: undefined,
    }))
  } catch (err) {
    console.warn('ClassesPage: Failed to fetch from Supabase (offline?):', err)
  }

  return <ClassesManager classes={formatted} schoolId={profile.school_id} />
}
