import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TeachersManager from './TeachersManager'

export default async function TeachersPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users').select('school_id').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const { data: teachers } = await supabase
    .from('teachers').select('*')
    .eq('school_id', profile.school_id)
    .eq('is_active', true)
    .order('full_name')

  return <TeachersManager teachers={teachers ?? []} schoolId={profile.school_id} />
}
