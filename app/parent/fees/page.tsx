import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ParentFees from './ParentFees'

export default async function ParentFeesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('users').select('school_id').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const { data: children } = await supabase.from('students')
    .select('id, full_name, roll_number, class_name, section, fee_status')
    .eq('school_id', profile.school_id)
    .ilike('parent_email', user.email!)
    .eq('is_active', true)

  const childIds = (children ?? []).map(c => c.id)
  let fees: any[] = []
  if (childIds.length > 0) {
    const { data } = await supabase.from('fees')
      .select('*, students(full_name, roll_number, class_name)')
      .in('student_id', childIds)
      .order('created_at', { ascending: false })
    fees = data ?? []
  }

  return <ParentFees fees={fees} children_={children ?? []} />
}
