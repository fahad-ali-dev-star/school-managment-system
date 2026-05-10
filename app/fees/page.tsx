import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import FeesManager from './FeesManager'

export default async function FeesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users').select('school_id').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const [{ data: fees }, { data: students }] = await Promise.all([
    supabase.from('fees')
      .select('*, students(full_name, roll_number, class_name)')
      .eq('school_id', profile.school_id)
      .order('created_at', { ascending: false }).limit(200),
    supabase.from('students')
      .select('id, full_name, roll_number, class_name, fee_status')
      .eq('school_id', profile.school_id).eq('is_active', true).order('class_name'),
  ])

  return <FeesManager fees={fees ?? []} students={students ?? []} schoolId={profile.school_id} />
}
