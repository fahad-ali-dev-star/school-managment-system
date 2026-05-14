import { createClient } from '@/lib/supabase/server'
import { PLAN_LIMITS, PlanType, PlanFeatures } from '@/lib/plans'

export async function getSchoolPlan() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('users')
    .select('school_id')
    .eq('id', user.id)
    .single()
  
  if (!profile) return null

  const { data: school } = await supabase
    .from('schools')
    .select('plan')
    .eq('id', profile.school_id)
    .single()

  return school?.plan as PlanType || 'free'
}

export async function checkFeature(feature: keyof PlanFeatures) {
  const plan = await getSchoolPlan()
  if (!plan) return false
  
  const limits = PLAN_LIMITS[plan]
  const value = limits[feature]
  if (typeof value === 'boolean') return value
  return true
}

export async function getStudentCount(schoolId: string) {
  const supabase = createClient()
  const { count } = await supabase
    .from('students')
    .select('*', { count: 'exact', head: true })
    .eq('school_id', schoolId)
    .eq('is_active', true)
  
  return count || 0
}
