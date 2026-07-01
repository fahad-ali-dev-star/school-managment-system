import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import FeesManager from './FeesManager'
import { getProfile } from '@/lib/supabase/getProfile'
import { ensureCurrentMonthFees } from '@/lib/feeService'

export default async function FeesPage() {
  const profile = await getProfile()
  if (!profile) redirect('/login')

  const supabase = createClient()

  let fees: any[] = []
  let students: any[] = []

  try {
    // Automatically generate fees for the current month if not already generated
    await ensureCurrentMonthFees(supabase, profile.school_id)

    const [feesRes, studentsRes] = await Promise.all([
      supabase.from('fees')
        .select('*, students(full_name, roll_number, class_name)')
        .eq('school_id', profile.school_id)
        .order('created_at', { ascending: false }).limit(200),
      supabase.from('students')
        .select('id, full_name, roll_number, class_name, fee_status')
        .eq('school_id', profile.school_id).eq('is_active', true).order('class_name'),
    ])
    fees = feesRes.data ?? []
    students = studentsRes.data ?? []
  } catch (err) {
    console.warn('FeesPage: Failed to fetch from Supabase (offline?):', err)
  }

  return <FeesManager fees={fees} students={students} schoolId={profile.school_id} />
}
