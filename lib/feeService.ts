// In-flight concurrency lock map to prevent simultaneous runs from generating duplicates
const activeGenerations = new Map<string, Promise<void>>()
// In-memory cache of recent checks to avoid querying the DB on every single dashboard load
const lastCheckedAt = new Map<string, number>()
const CHECK_COOLDOWN_MS = 1000 * 60 * 60 * 6 // 6 hours

/**
 * Ensures monthly fee records exist for all active students of a school
 * for the current month. If none exist for a student, generates them in pending state
 * and updates active students' fee_status.
 */
export async function ensureCurrentMonthFees(supabase: any, schoolId: string) {
  if (!schoolId) return

  const now = new Date()
  const monthLabel = now.toLocaleString('default', { month: 'long' }) + ' ' + now.getFullYear()
  const lockKey = `${schoolId}:${monthLabel}`

  // If already checked recently in this process, skip DB round-trip
  const lastCheck = lastCheckedAt.get(lockKey)
  if (lastCheck && Date.now() - lastCheck < CHECK_COOLDOWN_MS) {
    return
  }

  if (activeGenerations.has(lockKey)) {
    return activeGenerations.get(lockKey)
  }

  const generationPromise = (async () => {
    const dueDate = new Date(now.getFullYear(), now.getMonth(), 15)
      .toISOString()
      .split('T')[0] // "YYYY-MM-15"

    try {
      // 1. Fetch all active students in this school
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

      // 2. Fetch existing monthly fee records for this school in this month to check per-student
      const { data: existingFees, error: feesError } = await supabase
        .from('fees')
        .select('student_id')
        .eq('school_id', schoolId)
        .eq('month', monthLabel)
        .eq('fee_type', 'monthly')

      if (feesError) {
        console.error('[ensureCurrentMonthFees] Existing fees check error:', feesError.message)
        return
      }

      const alreadyHasFee = new Set((existingFees ?? []).map((f: any) => f.student_id))

      // 3. Filter only students who do not yet have a fee record for this month
      const missingStudents = students.filter((s: any) => !alreadyHasFee.has(s.id))

      if (missingStudents.length === 0) {
        lastCheckedAt.set(lockKey, Date.now())
        return
      }

      console.log(`[ensureCurrentMonthFees] Generating ${missingStudents.length} missing monthly fees for ${monthLabel}...`)

      const todayStr = now.toISOString().split('T')[0]

      // 4. Generate monthly fee records (students with 0 monthly_fee are marked as 'paid')
      const toInsert = missingStudents.map((s: any) => {
        const isZeroFee = !s.monthly_fee || Number(s.monthly_fee) === 0
        return {
          student_id: s.id,
          school_id: schoolId,
          fee_type: 'monthly',
          month: monthLabel,
          amount: Number(s.monthly_fee ?? 0),
          status: isZeroFee ? 'paid' : 'pending',
          due_date: dueDate,
          paid_date: isZeroFee ? todayStr : null,
          payment_method: 'cash',
          receipt_number: 'RCP-' + Date.now().toString(36).toUpperCase() + '-' + s.id.slice(0, 4).toUpperCase(),
          notes: isZeroFee ? `No fee required (${monthLabel})` : `Auto-generated for ${monthLabel}`,
        }
      })

      const { error: insertError } = await supabase.from('fees').insert(toInsert)
      if (insertError) {
        console.error('[ensureCurrentMonthFees] Insert error:', insertError.message)
        return
      }

      // 5. Update student fee_status: 'pending' for students with fee > 0, 'paid' for students with 0 fee
      const pendingStudentIds = missingStudents.filter((s: any) => Number(s.monthly_fee ?? 0) > 0).map((s: any) => s.id)
      const paidStudentIds = missingStudents.filter((s: any) => Number(s.monthly_fee ?? 0) <= 0).map((s: any) => s.id)

      if (pendingStudentIds.length > 0) {
        await supabase.from('students').update({ fee_status: 'pending' }).in('id', pendingStudentIds)
      }
      if (paidStudentIds.length > 0) {
        await supabase.from('students').update({ fee_status: 'paid' }).in('id', paidStudentIds)
      }

      lastCheckedAt.set(lockKey, Date.now())
      console.log(`[ensureCurrentMonthFees] Generated ${toInsert.length} fees & updated student statuses for ${monthLabel}`)
    } catch (err: any) {
      console.error('[ensureCurrentMonthFees] Fatal error:', err.message || err)
    } finally {
      activeGenerations.delete(lockKey)
    }
  })()

  activeGenerations.set(lockKey, generationPromise)
  return generationPromise
}
