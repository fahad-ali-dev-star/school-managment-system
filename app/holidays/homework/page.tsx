import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getProfile } from '@/lib/supabase/getProfile'
import HomeworkManager from './HomeworkManager'

export const dynamic = 'force-dynamic'

export default async function HomeworkPage() {
  const profile = await getProfile()
  if (!profile) redirect('/login')

  const supabase = createClient()

  let homework: any[] = []
  let classes: string[] = []

  try {
    const [hwRes, classesRes] = await Promise.all([
      supabase.from('holiday_homework')
        .select('*, teacher:users(full_name)')
        .eq('school_id', profile.school_id)
        .order('created_at', { ascending: false }),
      supabase.from('classes')
        .select('name')
        .eq('school_id', profile.school_id)
        .eq('is_active', true)
        .order('name'),
    ])
    homework = hwRes.data ?? []
    classes = (classesRes.data ?? []).map((c: any) => c.name)
  } catch (err) {
    console.warn('HomeworkPage: Failed to fetch from Supabase (offline?):', err)
  }

  return (
    <HomeworkManager
      homework={homework}
      classes={classes}
      schoolId={profile.school_id}
      teacherId={profile.id}
      userRole={profile.role}
      plan={profile.plan ?? 'free'}
    />
  )
}
