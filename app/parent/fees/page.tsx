import { redirect } from 'next/navigation'
import ParentFees from './ParentFees'
import { getProfile } from '@/lib/supabase/getProfile'
import { createClient } from '@/lib/supabase/server'

export default async function ParentFeesPage() {
  const profile = await getProfile()
  if (!profile) redirect('/login')

  const supabase = createClient()

  let children: any[] = []
  let fees:     any[] = []

  try {
    const { data: childrenData } = await supabase.from('students')
      .select('id, full_name, roll_number, class_name, section, fee_status')
      .eq('school_id', profile.school_id)
      .ilike('parent_email', profile.email)
      .eq('is_active', true)
    children = childrenData ?? []

    const childIds = children.map(c => c.id)
    if (childIds.length > 0) {
      const { data } = await supabase.from('fees')
        .select('*, students(full_name, roll_number, class_name)')
        .in('student_id', childIds)
        .order('created_at', { ascending: false })
      fees = data ?? []
    }
  } catch (err) {
    console.warn('ParentFeesPage: Failed to fetch from Supabase (offline?):', err)
  }

  return <ParentFees fees={fees} children_={children} />
}
