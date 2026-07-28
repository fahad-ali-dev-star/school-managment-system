import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getProfile } from '@/lib/supabase/getProfile'
import { ensureCurrentMonthFees } from '@/lib/feeService'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const profile = await getProfile()
  if (!profile) redirect('/login')

  const supabase = createClient()

  const today = new Date().toISOString().split('T')[0]
  const now = new Date()
  const currentMonthLabel = now.toLocaleString('default', { month: 'long' }) + ' ' + now.getFullYear()

  let totalStudents = 0
  let totalTeachers = 0
  let totalClasses  = 0
  let todayAtt: any[] = []
  let fees: any[]     = []
  let upcomingHolidays: any[] = []

  try {
    // Automatically generate fees for the current month if not already generated
    await ensureCurrentMonthFees(supabase, profile.school_id)

    const [
      studentsRes,
      teachersRes,
      classesRes,
      attRes,
      feesRes,
      holidaysRes,
    ] = await Promise.all([
      supabase.from('students')
        .select('*', { count: 'exact', head: true })
        .eq('school_id', profile.school_id).eq('is_active', true),
      supabase.from('teachers')
        .select('*', { count: 'exact', head: true })
        .eq('school_id', profile.school_id).eq('is_active', true),
      supabase.from('classes')
        .select('*', { count: 'exact', head: true })
        .eq('school_id', profile.school_id).eq('is_active', true),
      supabase.from('attendance')
        .select('status')
        .eq('school_id', profile.school_id).eq('date', today),
      supabase.from('fees')
        .select('amount, status')
        .eq('school_id', profile.school_id)
        .eq('month', currentMonthLabel),
      supabase.from('holidays')
        .select('id, title, date, type')
        .eq('school_id', profile.school_id)
        .gte('date', today)
        .order('date', { ascending: true })
        .limit(3),
    ])
    totalStudents    = studentsRes.count ?? 0
    totalTeachers    = teachersRes.count ?? 0
    totalClasses     = classesRes.count  ?? 0
    todayAtt         = attRes.data  ?? []
    fees             = feesRes.data ?? []
    upcomingHolidays = holidaysRes.data ?? []
  } catch (err) {
    console.warn('DashboardPage: Failed to fetch from Supabase (offline?):', err)
  }

  const present   = todayAtt.filter(r => r.status === 'present').length
  const absent    = todayAtt.filter(r => r.status === 'absent').length
  const collected = fees.filter(f => f.status === 'paid').reduce((s, f) => s + Number(f.amount), 0)
  const pending   = fees.filter(f => f.status !== 'paid').reduce((s, f) => s + Number(f.amount), 0)
  const attRate   = todayAtt.length ? Math.round((present / todayAtt.length) * 100) : 0

  const dateStr = new Date().toLocaleDateString('en-PK', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  const stats = [
    { label: 'Total Students',   value: totalStudents ?? 0,                 color: '#4f46e5', icon: '👨‍🎓' },
    { label: 'Total Teachers',   value: totalTeachers ?? 0,                 color: '#0284c7', icon: '👨‍🏫' },
    { label: 'Total Classes',    value: totalClasses ?? 0,                  color: '#7c3aed', icon: '🏫' },
    { label: 'Present Today',    value: present,                            color: '#16a34a', icon: '✅' },
    { label: 'Absent Today',     value: absent,                             color: '#dc2626', icon: '❌' },
    { label: 'Attendance Rate',  value: `${attRate}%`,                      color: '#0284c7', icon: '📊' },
    { label: 'Fees Collected',   value: `Rs ${collected.toLocaleString()}`, color: '#16a34a', icon: '💰' },
    { label: 'Fees Pending',     value: `Rs ${pending.toLocaleString()}`,   color: '#d97706', icon: '⏳' },
  ]

  const firstName = profile.full_name.split(' ')[0]

  return (
    <div style={{ padding: '2rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
          Good morning, {firstName} 👋
        </h1>
        <p style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>{dateStr}</p>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {stats.map((s, i) => (
          <div key={i} className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>
                {s.label}
              </p>
              <span style={{ fontSize: 16 }}>{s.icon}</span>
            </div>
            <p style={{ fontSize: '1.75rem', fontWeight: 700, color: s.color, margin: 0 }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: '1rem', color: '#0f172a' }}>Quick Actions</h2>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {[
            { href: '/classes',    label: '🏫 Manage Classes',   bg: '#7c3aed' },
            { href: '/teachers',   label: '👨‍🏫 Manage Teachers',  bg: '#0284c7' },
            { href: '/attendance', label: '✅ Mark Attendance',   bg: '#4f46e5' },
            { href: '/students',   label: '👨‍🎓 Add Student',       bg: '#0891b2' },
            { href: '/fees',       label: '💰 Record Payment',    bg: '#16a34a' },
            { href: '/holidays',   label: '🗓️ Holidays',          bg: '#d97706' },
          ].map(a => (
            <a key={a.href} href={a.href} style={{
              padding: '9px 16px', borderRadius: 8, background: a.bg,
              color: 'white', textDecoration: 'none', fontSize: 13, fontWeight: 500,
              transition: 'opacity 0.15s',
            }}>{a.label}</a>
          ))}
        </div>
      </div>

      {/* Today summary + Upcoming Holidays */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
        <div className="card" style={{ padding: '1.25rem' }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', margin: '0 0 12px' }}>Today&apos;s Attendance</h3>
          {todayAtt.length === 0
            ? <p style={{ color: '#94a3b8', fontSize: 13 }}>No attendance marked yet today.</p>
            : <>
              <div style={{ display: 'flex', gap: 16 }}>
                {[
                  { label: 'Present', count: present, color: '#16a34a', bg: '#f0fdf4' },
                  { label: 'Absent',  count: absent,  color: '#dc2626', bg: '#fef2f2' },
                  { label: 'Rate',    count: `${attRate}%`, color: '#0284c7', bg: '#f0f9ff' },
                ].map(item => (
                  <div key={item.label} style={{ background: item.bg, borderRadius: 8, padding: '10px 14px', flex: 1 }}>
                    <p style={{ fontSize: 11, color: item.color, fontWeight: 600, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{item.label}</p>
                    <p style={{ fontSize: '1.4rem', fontWeight: 700, color: item.color, margin: 0 }}>{item.count}</p>
                  </div>
                ))}
              </div>
            </>
          }
        </div>
        <div className="card" style={{ padding: '1.25rem' }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', margin: '0 0 12px' }}>Fee Summary</h3>
          <div style={{ display: 'flex', gap: 12 }}>
            {[
              { label: 'Collected', value: `Rs ${collected.toLocaleString()}`, color: '#16a34a', bg: '#f0fdf4' },
              { label: 'Pending',   value: `Rs ${pending.toLocaleString()}`,   color: '#d97706', bg: '#fffbeb' },
            ].map(item => (
              <div key={item.label} style={{ background: item.bg, borderRadius: 8, padding: '10px 14px', flex: 1 }}>
                <p style={{ fontSize: 11, color: item.color, fontWeight: 600, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{item.label}</p>
                <p style={{ fontSize: '1.1rem', fontWeight: 700, color: item.color, margin: 0 }}>{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Holidays Widget */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', margin: 0 }}>🗓️ Upcoming Holidays</h3>
            <a href="/holidays" style={{ fontSize: 12, color: '#4f46e5', textDecoration: 'none', fontWeight: 600 }}>View all →</a>
          </div>
          {upcomingHolidays.length === 0 ? (
            <p style={{ color: '#94a3b8', fontSize: 13 }}>No upcoming holidays</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {upcomingHolidays.map((h: any) => {
                const typeColors: Record<string, { bg: string; color: string; emoji: string }> = {
                  national:   { bg: '#fef2f2', color: '#dc2626', emoji: '🇵🇰' },
                  school:     { bg: '#f5f3ff', color: '#7c3aed', emoji: '🏫' },
                  exam_break: { bg: '#fffbeb', color: '#d97706', emoji: '📝' },
                  summer:     { bg: '#f0f9ff', color: '#0284c7', emoji: '☀️' },
                  winter:     { bg: '#ecfeff', color: '#0891b2', emoji: '❄️' },
                }
                const t = typeColors[h.type] ?? typeColors.national
                return (
                  <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, background: t.bg, border: `1px solid ${t.color}22` }}>
                    <span style={{ fontSize: 18, flexShrink: 0 }}>{t.emoji}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{h.title}</p>
                      <p style={{ fontSize: 11, color: t.color, margin: '1px 0 0', fontWeight: 600 }}>
                        {new Date(h.date + 'T00:00:00').toLocaleDateString('en-PK', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
