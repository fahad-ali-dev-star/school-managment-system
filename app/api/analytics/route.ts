import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('users').select('school_id').eq('id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sid = profile.school_id

  // Check plan limits
  const { checkFeature } = await import('@/lib/billing/server')
  const hasAccess = await checkFeature('hasAnalytics')
  if (!hasAccess) {
    return NextResponse.json({ 
      error: 'Analytics is a Professional feature. Please upgrade your plan to access this module.' 
    }, { status: 403 })
  }

  // ── 1. Overview KPIs ────────────────────────────────────────
  const [
    { count: totalStudents },
    { count: totalTeachers },
    { count: totalClasses },
    { data: allFees },
    { data: allAttendance },
    { data: allMarks },
    { data: allLeaves },
    { data: allNotifs },
  ] = await Promise.all([
    supabase.from('students').select('*', { count: 'exact', head: true }).eq('school_id', sid).eq('is_active', true),
    supabase.from('teachers').select('*', { count: 'exact', head: true }).eq('school_id', sid).eq('is_active', true),
    supabase.from('classes').select('*',  { count: 'exact', head: true }).eq('school_id', sid).eq('is_active', true),
    supabase.from('fees').select('amount, status, month, created_at').eq('school_id', sid),
    supabase.from('attendance').select('status, date, student_id').eq('school_id', sid),
    supabase.from('marks').select('marks_obtained, grade, student_id, subjects(total_marks)').eq('school_id', sid),
    supabase.from('leave_applications').select('status, created_at').eq('school_id', sid),
    supabase.from('notification_logs').select('status, type, created_at').eq('school_id', sid),
  ])

  // ── 2. Fee chart — monthly collected vs pending (dynamic) ──────────────
  const now = new Date()
  const currentMonthLabel = now.toLocaleString('default', { month: 'long' }) + ' ' + now.getFullYear()

  const monthLabelsSet = new Set<string>()
  ;(allFees ?? []).forEach(f => {
    if (f.month) monthLabelsSet.add(f.month)
  })
  monthLabelsSet.add(currentMonthLabel)

  // Parse month label (e.g. "July 2026") into a timestamp for sorting
  const parseMonthToTimestamp = (m: string) => {
    const parts = m.split(' ')
    const monthName = parts[0]
    const year = parseInt(parts[1] || '0', 10)
    const monthIdx = new Date(`${monthName} 1, 2000`).getMonth()
    return new Date(year, monthIdx, 1).getTime()
  }

  // Sort months chronologically (ascending)
  const MONTH_ORDER = Array.from(monthLabelsSet).sort((a, b) => {
    return parseMonthToTimestamp(a) - parseMonthToTimestamp(b)
  })

  // Format short label for the chart (e.g. "Jul '26")
  const getShortMonthLabel = (m: string) => {
    const parts = m.split(' ')
    if (parts.length < 2) return m
    const monthName = parts[0]
    const yearStr = parts[1]
    const shortMonth = monthName.slice(0, 3)
    const shortYear = yearStr.slice(-2)
    return `${shortMonth} '${shortYear}`
  }

  const feeByMonth: Record<string, { month: string; collected: number; pending: number; overdue: number }> = {}
  MONTH_ORDER.forEach(m => {
    feeByMonth[m] = { month: getShortMonthLabel(m), collected: 0, pending: 0, overdue: 0 }
  })

  ;(allFees ?? []).forEach(f => {
    const m = f.month
    if (!m || !feeByMonth[m]) return
    const amt = Number(f.amount)
    if (f.status === 'paid')    feeByMonth[m].collected += amt
    if (f.status === 'pending') feeByMonth[m].pending   += amt
    if (f.status === 'overdue') feeByMonth[m].overdue   += amt
  })

  const feeChartData = MONTH_ORDER.map(m => feeByMonth[m])

  const totalCollected = (allFees ?? []).filter(f => f.status === 'paid').reduce((s, f) => s + Number(f.amount), 0)
  const totalPending   = (allFees ?? []).filter(f => f.status !== 'paid').reduce((s, f) => s + Number(f.amount), 0)

  // ── 3. Attendance chart — daily for last 14 days ─────────────
  const today    = new Date()
  const last14   = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() - (13 - i))
    return d.toISOString().split('T')[0]
  })

  const attByDate: Record<string, { date: string; present: number; absent: number; late: number }> = {}
  last14.forEach(d => { attByDate[d] = { date: d.slice(5), present: 0, absent: 0, late: 0 } })

  ;(allAttendance ?? []).forEach(a => {
    if (!attByDate[a.date]) return
    if (a.status === 'present') attByDate[a.date].present++
    if (a.status === 'absent')  attByDate[a.date].absent++
    if (a.status === 'late')    attByDate[a.date].late++
  })

  const attendanceChartData = last14.map(d => attByDate[d])

  // Overall attendance rate
  const totalPresent = (allAttendance ?? []).filter(a => a.status === 'present').length
  const totalAtt     = (allAttendance ?? []).length
  const attRate      = totalAtt > 0 ? Math.round((totalPresent / totalAtt) * 100) : 0

  // ── 4. Grade distribution chart ───────────────────────────────
  const gradeCounts: Record<string, number> = { 'A+': 0, 'A': 0, 'B': 0, 'C': 0, 'D': 0, 'F': 0 }
  ;(allMarks ?? []).forEach(m => {
    if (m.grade && gradeCounts[m.grade] !== undefined) gradeCounts[m.grade]++
  })

  const gradeChartData = Object.entries(gradeCounts).map(([grade, count]) => ({ grade, count }))

  // ── 5. Fee status pie ─────────────────────────────────────────
  const feePaid    = (allFees ?? []).filter(f => f.status === 'paid').length
  const feePending = (allFees ?? []).filter(f => f.status === 'pending').length
  const feeOverdue = (allFees ?? []).filter(f => f.status === 'overdue').length

  const feeStatusPie = [
    { name: 'Paid',    value: feePaid,    color: '#16a34a' },
    { name: 'Pending', value: feePending, color: '#d97706' },
    { name: 'Overdue', value: feeOverdue, color: '#dc2626' },
  ]

  // ── 6. Leave status breakdown ─────────────────────────────────
  const leaveChartData = [
    { name: 'Approved',  value: (allLeaves ?? []).filter(l => l.status === 'approved').length,  color: '#16a34a' },
    { name: 'Pending',   value: (allLeaves ?? []).filter(l => l.status === 'pending').length,   color: '#d97706' },
    { name: 'Rejected',  value: (allLeaves ?? []).filter(l => l.status === 'rejected').length,  color: '#dc2626' },
    { name: 'Cancelled', value: (allLeaves ?? []).filter(l => l.status === 'cancelled').length, color: '#94a3b8' },
  ]

  // ── 7. Notification breakdown ─────────────────────────────────
  const notifByType: Record<string, number> = {}
  ;(allNotifs ?? []).forEach(n => {
    notifByType[n.type] = (notifByType[n.type] ?? 0) + 1
  })

  const notifChartData = Object.entries(notifByType).map(([type, count]) => ({ type, count }))

  // ── 8. Attendance by class ────────────────────────────────────
  const { data: classAttData } = await supabase
    .from('attendance')
    .select('status, students(class_name)')
    .eq('school_id', sid)

  const classPresentMap: Record<string, { present: number; total: number }> = {}
  ;(classAttData ?? []).forEach((a: any) => {
    const cls = a.students?.class_name ?? 'Unknown'
    if (!classPresentMap[cls]) classPresentMap[cls] = { present: 0, total: 0 }
    classPresentMap[cls].total++
    if (a.status === 'present') classPresentMap[cls].present++
  })

  const classAttChartData = Object.entries(classPresentMap)
    .map(([cls, d]) => ({
      class: cls,
      rate: d.total > 0 ? Math.round((d.present / d.total) * 100) : 0,
    }))
    .sort((a, b) => a.class.localeCompare(b.class))

  return NextResponse.json({
    kpis: {
      totalStudents: totalStudents ?? 0,
      totalTeachers: totalTeachers ?? 0,
      totalClasses:  totalClasses  ?? 0,
      totalCollected,
      totalPending,
      attRate,
      totalLeaves: (allLeaves ?? []).length,
      totalNotifs: (allNotifs ?? []).length,
    },
    feeChartData,
    attendanceChartData,
    gradeChartData,
    feeStatusPie,
    leaveChartData,
    notifChartData,
    classAttChartData,
  })
}
