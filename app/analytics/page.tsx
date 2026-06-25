import { redirect } from 'next/navigation'
import AnalyticsDashboard from './AnalyticsDashboard'
import { getProfile } from '@/lib/supabase/getProfile'
import { createClient } from '@/lib/supabase/server'

export default async function AnalyticsPage() {
  const profile = await getProfile()
  if (!profile) redirect('/login')

  const supabase = createClient()

  // Fetch all analytics data server-side
  const sid = profile.school_id

  let totalStudents = 0
  let totalTeachers = 0
  let totalClasses  = 0
  let allFees:       any[] = []
  let allAttendance: any[] = []
  let allMarks:      any[] = []
  let allLeaves:     any[] = []
  let allNotifs:     any[] = []

  try {
    // Fallback: fetch directly from supabase for SSR
    const [
      studentsRes,
      teachersRes,
      classesRes,
      feesRes,
      attRes,
      marksRes,
      leavesRes,
      notifsRes,
    ] = await Promise.all([
      supabase.from('students').select('*', { count: 'exact', head: true }).eq('school_id', sid).eq('is_active', true),
      supabase.from('teachers').select('*', { count: 'exact', head: true }).eq('school_id', sid).eq('is_active', true),
      supabase.from('classes').select('*',  { count: 'exact', head: true }).eq('school_id', sid).eq('is_active', true),
      supabase.from('fees').select('amount, status, month').eq('school_id', sid),
      supabase.from('attendance').select('status, date, student_id').eq('school_id', sid),
      supabase.from('marks').select('marks_obtained, grade').eq('school_id', sid),
      supabase.from('leave_applications').select('status').eq('school_id', sid),
      supabase.from('notification_logs').select('status, type').eq('school_id', sid),
    ])
    totalStudents = studentsRes.count ?? 0
    totalTeachers = teachersRes.count ?? 0
    totalClasses  = classesRes.count  ?? 0
    allFees       = feesRes.data   ?? []
    allAttendance = attRes.data    ?? []
    allMarks      = marksRes.data  ?? []
    allLeaves     = leavesRes.data ?? []
    allNotifs     = notifsRes.data ?? []
  } catch (err) {
    console.warn('AnalyticsPage: Failed to fetch from Supabase (offline?):', err)
  }

  const totalCollected = allFees.filter(f => f.status === 'paid').reduce((s, f) => s + Number(f.amount), 0)
  const totalPending   = allFees.filter(f => f.status !== 'paid').reduce((s, f) => s + Number(f.amount), 0)
  const totalPresent   = allAttendance.filter(a => a.status === 'present').length
  const totalAtt       = allAttendance.length
  const attRate        = totalAtt > 0 ? Math.round((totalPresent / totalAtt) * 100) : 0

  // Fee by month
  const MONTHS = ['January 2026', 'February 2026', 'March 2026', 'April 2026']
  const feeByMonth: Record<string, any> = {}
  MONTHS.forEach(m => { feeByMonth[m] = { month: m.split(' ')[0], collected: 0, pending: 0, overdue: 0 } })
  allFees.forEach(f => {
    if (!f.month || !feeByMonth[f.month]) return
    const a = Number(f.amount)
    if (f.status === 'paid')    feeByMonth[f.month].collected += a
    if (f.status === 'pending') feeByMonth[f.month].pending   += a
    if (f.status === 'overdue') feeByMonth[f.month].overdue   += a
  })

  // Attendance last 14 days
  const today  = new Date()
  const last14 = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today); d.setDate(today.getDate() - (13 - i))
    return d.toISOString().split('T')[0]
  })
  const attByDate: Record<string, any> = {}
  last14.forEach(d => { attByDate[d] = { date: d.slice(5), present: 0, absent: 0, late: 0 } })
  allAttendance.forEach(a => {
    if (!attByDate[a.date]) return
    if (a.status === 'present') attByDate[a.date].present++
    if (a.status === 'absent')  attByDate[a.date].absent++
    if (a.status === 'late')    attByDate[a.date].late++
  })

  // Grade distribution
  const gradeCounts: Record<string, number> = { 'A+': 0, 'A': 0, 'B': 0, 'C': 0, 'D': 0, 'F': 0 }
  allMarks.forEach(m => { if (m.grade && gradeCounts[m.grade] !== undefined) gradeCounts[m.grade]++ })

  const analyticsData = {
    kpis: {
      totalStudents,
      totalTeachers,
      totalClasses,
      totalCollected, totalPending, attRate,
      totalLeaves:  allLeaves.length,
      totalNotifs:  allNotifs.length,
    },
    feeChartData:        MONTHS.map(m => feeByMonth[m]),
    attendanceChartData: last14.map(d => attByDate[d]),
    gradeChartData:      Object.entries(gradeCounts).map(([grade, count]) => ({ grade, count })),
    feeStatusPie: [
      { name: 'Paid',    value: allFees.filter(f => f.status === 'paid').length,    color: '#16a34a' },
      { name: 'Pending', value: allFees.filter(f => f.status === 'pending').length, color: '#d97706' },
      { name: 'Overdue', value: allFees.filter(f => f.status === 'overdue').length, color: '#dc2626' },
    ],
    leaveChartData: [
      { name: 'Approved',  value: allLeaves.filter(l => l.status === 'approved').length,  color: '#16a34a' },
      { name: 'Pending',   value: allLeaves.filter(l => l.status === 'pending').length,   color: '#d97706' },
      { name: 'Rejected',  value: allLeaves.filter(l => l.status === 'rejected').length,  color: '#dc2626' },
    ],
    notifChartData: (() => {
      const m: Record<string, number> = {}
      allNotifs.forEach(n => { m[n.type] = (m[n.type] ?? 0) + 1 })
      return Object.entries(m).map(([type, count]) => ({ type, count }))
    })(),
    classAttChartData: [],
  }

  return <AnalyticsDashboard data={analyticsData} schoolName="Beacon Light School" />
}
