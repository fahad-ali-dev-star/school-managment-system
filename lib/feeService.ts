import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Ensures monthly fee records exist for all active students of a school
 * for the current month. If none exist, generates them in pending state
 * and updates all active students' fee_status to 'pending'.
 */
export async function ensureCurrentMonthFees(supabase: any, schoolId: string) {
  const now = new Date()
  const monthLabel = now.toLocaleString('default', { month: 'long' }) + ' ' + now.getFullYear()
  const dueDate = new Date(now.getFullYear(), now.getMonth(), 15)
    .toISOString()
    .split('T')[0] // "YYYY-MM-15"

  try {
    // 1. Check if we already have monthly fee records for this school in this month
    const { count, error: countError } = await supabase
      .from('fees')
      .select('*', { count: 'exact', head: true })
      .eq('school_id', schoolId)
      .eq('month', monthLabel)
      .eq('fee_type', 'monthly')

    if (countError) {
      console.error('[ensureCurrentMonthFees] Check error:', countError.message)
      return
    }

    // If fees already exist for this month, skip generation
    if (count !== null && count > 0) {
      return
    }

    // 2. Fetch all active students in this school
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('id, monthly_fee')
      .eq('school_id', schoolId)
      .eq('is_active', true)

    if (studentsError) {
      console.error('[ensureCurrentMonthFees] Students fetch error:', studentsError.message)
      return
    }

    if (!students || students.length === 0) {
      return
    }

    console.log(`[ensureCurrentMonthFees] No monthly fees found for ${monthLabel}. Generating...`)

    // 3. Generate pending monthly fee records
    const toInsert = students.map((s: any) => ({
      student_id: s.id,
      school_id: schoolId,
      fee_type: 'monthly',
      month: monthLabel,
      amount: s.monthly_fee ?? 0,
      status: 'pending',
      due_date: dueDate,
      paid_date: null,
      payment_method: 'cash',
      receipt_number: 'RCP-' + Date.now().toString(36).toUpperCase() + '-' + s.id.slice(0, 4).toUpperCase(),
      notes: `Auto-generated for ${monthLabel}`,
    }))

    const { error: insertError } = await supabase.from('fees').insert(toInsert)
    if (insertError) {
      console.error('[ensureCurrentMonthFees] Insert error:', insertError.message)
      return
    }

    // 4. Update all active students' fee_status to 'pending'
    const { error: studentUpdateError } = await supabase
      .from('students')
      .update({ fee_status: 'pending' })
      .eq('school_id', schoolId)
      .eq('is_active', true)

    if (studentUpdateError) {
      console.error('[ensureCurrentMonthFees] Students status update error:', studentUpdateError.message)
    } else {
      console.log(`[ensureCurrentMonthFees] Generated ${toInsert.length} pending fees & updated student statuses for ${monthLabel}`)
    }
  } catch (err: any) {
    console.error('[ensureCurrentMonthFees] Fatal error:', err.message || err)
  }
}
