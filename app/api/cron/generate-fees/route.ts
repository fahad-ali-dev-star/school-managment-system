import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

// GET /api/cron/generate-fees
//
// Automatically generates a "pending" monthly fee record for every active student
// across all schools. Skips students that already have a fee record for the current month.
//
// Called automatically on the 1st of every month at 06:00 UTC by Vercel Cron (see vercel.json).
// Can also be triggered manually with ?secret=NEXT_PUBLIC_SUPER_ADMIN_KEY for testing.
//
// Vercel Cron schedule: "0 6 1 * *" -> 1st of every month at 06:00 UTC
export async function GET(request: Request) {
  const isVercelCron =
    request.headers.get('authorization') === `Bearer ${process.env.CRON_SECRET}`

  if (!isVercelCron) {
    // Allow manual trigger with super admin secret
    const { searchParams } = new URL(request.url)
    const secret = searchParams.get('secret')
    if (secret !== process.env.NEXT_PUBLIC_SUPER_ADMIN_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const supabase = createAdminClient()

  // Determine the current month label (e.g. "June 2026") and due date (15th of this month)
  const now = new Date()
  const monthLabel = now.toLocaleString('default', { month: 'long' }) + ' ' + now.getFullYear()
  const dueDate = new Date(now.getFullYear(), now.getMonth(), 15)
    .toISOString()
    .split('T')[0] // "YYYY-MM-15"

  console.log(`[generate-fees] Running for month: ${monthLabel}, due date: ${dueDate}`)

  try {
    // 1. Fetch all schools
    const { data: schools, error: schoolsError } = await supabase
      .from('schools')
      .select('id')

    if (schoolsError) throw schoolsError
    if (!schools || schools.length === 0) {
      return NextResponse.json({ status: 'ok', message: 'No schools found', fees_created: 0 })
    }

    let totalStudentsProcessed = 0
    let totalFeesCreated = 0
    let totalFeesSkipped = 0
    const errors: string[] = []

    // 2. Process each school
    for (const school of schools) {
      // 3. Fetch all active students in this school that have a monthly_fee set
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('id, full_name, monthly_fee')
        .eq('school_id', school.id)
        .eq('is_active', true)

      if (studentsError) {
        errors.push(`School ${school.id}: ${studentsError.message}`)
        continue
      }

      if (!students || students.length === 0) continue

      totalStudentsProcessed += students.length

      // 4. Fetch existing fee records for this month in this school (to detect duplicates)
      const { data: existingFees, error: existingError } = await supabase
        .from('fees')
        .select('student_id')
        .eq('school_id', school.id)
        .eq('month', monthLabel)
        .eq('fee_type', 'monthly')

      if (existingError) {
        errors.push(`School ${school.id} (existing check): ${existingError.message}`)
        continue
      }

      const alreadyHasFee = new Set((existingFees ?? []).map((f: any) => f.student_id))

      // 5. Build insert batch — only for students without a fee this month
      const toInsert = students
        .filter((s: any) => !alreadyHasFee.has(s.id))
        .map((s: any) => ({
          student_id: s.id,
          school_id: school.id,
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

      totalFeesSkipped += students.length - toInsert.length

      if (toInsert.length === 0) continue

      // 6. Insert in one batch per school
      const { error: insertError } = await supabase.from('fees').insert(toInsert)

      if (insertError) {
        errors.push(`School ${school.id} (insert): ${insertError.message}`)
        continue
      }

      // 7. Update student fee_status to 'pending' for the newly generated ones
      const studentIdsToUpdate = toInsert.map((f: any) => f.student_id)
      if (studentIdsToUpdate.length > 0) {
        const { error: studentUpdateError } = await supabase
          .from('students')
          .update({ fee_status: 'pending' })
          .in('id', studentIdsToUpdate)

        if (studentUpdateError) {
          errors.push(`School ${school.id} (student status update): ${studentUpdateError.message}`)
        }
      }

      totalFeesCreated += toInsert.length
    }

    const summary = {
      status: errors.length === 0 ? 'ok' : 'partial',
      month: monthLabel,
      due_date: dueDate,
      schools_processed: schools.length,
      students_processed: totalStudentsProcessed,
      fees_created: totalFeesCreated,
      fees_skipped_already_exist: totalFeesSkipped,
      errors: errors.length > 0 ? errors : undefined,
      triggered_by: isVercelCron ? 'vercel-cron' : 'manual',
      timestamp: new Date().toISOString(),
    }

    console.log('[generate-fees] Done:', summary)
    return NextResponse.json(summary)
  } catch (err: any) {
    console.error('[generate-fees] Fatal error:', err.message)
    return NextResponse.json(
      { status: 'error', message: err.message },
      { status: 500 }
    )
  }
}
