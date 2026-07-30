import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ParentAlerts from './ParentAlerts'
import { getProfile } from '@/lib/supabase/getProfile'

export const dynamic = 'force-dynamic'

export default async function ParentAlertsPage() {
  const profile = await getProfile()
  if (!profile) redirect('/login')

  const supabase = createClient()

  let children: any[] = []
  let alerts: any[] = []

  try {
    // Search children by parent_email only — do NOT scope by school_id because
    // parent user accounts often have a null or mismatched school_id which
    // would cause an empty result even when a valid email match exists.
    const { data: childrenData } = await supabase.from('students')
      .select('id, full_name, roll_number, class_name, section')
      .ilike('parent_email', profile.email)
      .eq('is_active', true)
    children = childrenData ?? []

    const childIds = children.map(c => c.id)
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    
    let query = supabase.from('notification_logs')
      .select('*, student:students(id, full_name, roll_number, class_name, section)')
      .gte('created_at', since)

    if (childIds.length > 0 && profile.email) {
      query = query.or(`student_id.in.(${childIds.join(',')}),recipient.ilike.${profile.email}`)
    } else if (childIds.length > 0) {
      query = query.in('student_id', childIds)
    } else if (profile.email) {
      query = query.ilike('recipient', profile.email)
    }

    if (childIds.length > 0 || profile.email) {
      const { data } = await query
        .order('created_at', { ascending: false })
        .limit(200)
      alerts = data ?? []
    }
  } catch (err) {
    console.warn('ParentAlertsPage: Failed to fetch from Supabase (offline?):', err)
  }

  return <ParentAlerts children_={children} alerts={alerts} />
}
