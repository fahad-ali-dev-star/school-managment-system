import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getProfile } from '@/lib/supabase/getProfile'
import MaterialsLibrary from './MaterialsLibrary'

export const dynamic = 'force-dynamic'

export default async function MaterialsPage() {
  const profile = await getProfile()
  if (!profile) redirect('/login')

  const supabase = createClient()

  let materials: any[] = []
  let classes: string[] = []

  try {
    const [matRes, classesRes] = await Promise.all([
      supabase.from('study_materials')
        .select('*, teacher:users(full_name)')
        .eq('school_id', profile.school_id)
        .order('created_at', { ascending: false }),
      supabase.from('classes')
        .select('name')
        .eq('school_id', profile.school_id)
        .eq('is_active', true)
        .order('name'),
    ])
    materials = matRes.data ?? []
    classes = (classesRes.data ?? []).map((c: any) => c.name)
  } catch (err) {
    console.warn('MaterialsPage: Failed to fetch from Supabase (offline?):', err)
  }

  return (
    <MaterialsLibrary
      materials={materials}
      classes={classes}
      schoolId={profile.school_id}
      teacherId={profile.id}
      userRole={profile.role}
      plan={profile.plan ?? 'free'}
    />
  )
}
