import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getProfile } from '@/lib/supabase/getProfile'
import HolidayCalendar from './HolidayCalendar'

export const dynamic = 'force-dynamic'

export default async function HolidaysPage() {
  const profile = await getProfile()
  if (!profile) redirect('/login')

  const supabase = createClient()

  let holidays: any[] = []

  try {
    const { data } = await supabase
      .from('holidays')
      .select('*')
      .eq('school_id', profile.school_id)
      .order('date', { ascending: true })

    holidays = data ?? []
  } catch (err) {
    console.warn('HolidaysPage: Failed to fetch from Supabase (offline?):', err)
  }

  return (
    <HolidayCalendar
      holidays={holidays}
      schoolId={profile.school_id}
      userRole={profile.role}
      plan={profile.plan ?? 'free'}
    />
  )
}
