import { redirect } from 'next/navigation'
import TeachersManager from './TeachersManager'
import { getProfile } from '@/lib/supabase/getProfile'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function TeachersPage() {
  const profile = await getProfile()
  if (!profile) redirect('/login')

  const supabase = createClient()

  const { data: teachers } = await supabase
    .from('teachers').select('*')
    .eq('school_id', profile.school_id)
    .eq('is_active', true)
    .order('full_name')

  return <TeachersManager teachers={teachers ?? []} schoolId={profile.school_id} />
}
