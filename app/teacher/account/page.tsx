import { redirect } from 'next/navigation'
import ChangePasswordForm from '@/components/ChangePasswordForm'
import { getProfile } from '@/lib/supabase/getProfile'

export default async function TeacherAccountPage() {
  const profile = await getProfile()
  if (!profile) redirect('/login')
  return <ChangePasswordForm email={profile.email ?? ''} role="teacher" />
}
