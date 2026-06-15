import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getProfile } from '@/lib/supabase/getProfile'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const profile = await getProfile()
  if (!profile) redirect('/login')

  const supabase = createClient()

  const today = new Date().toISOString().split('T')[0]

  const [
    { count: totalStudents },
    { count: totalTeachers },
    { count: totalClasses },
    { data: todayAtt },
    { data: fees },
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
      .eq('school_id', profile.school_id),
  ])

  const present   = todayAtt?.filter(r => r.status === 'present').length ?? 0
  const absent    = todayAtt?.filter(r => r.status === 'absent').length  ?? 0
  const collected = fees?.filter(f => f.status === 'paid').reduce((s, f) => s + Number(f.amount), 0) ?? 0
  const pending   = fees?.filter(f => f.status !== 'paid').reduce((s, f) => s + Number(f.amount), 0) ?? 0
  const attRate   = todayAtt?.length ? Math.round((present / todayAtt.length) * 100) : 0

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
          ].map(a => (
            <a key={a.href} href={a.href} style={{
              padding: '9px 16px', borderRadius: 8, background: a.bg,
              color: 'white', textDecoration: 'none', fontSize: 13, fontWeight: 500,
              transition: 'opacity 0.15s',
            }}>{a.label}</a>
          ))}
        </div>
      </div>

      {/* Today summary */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div className="card" style={{ padding: '1.25rem' }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', margin: '0 0 12px' }}>Today&apos;s Attendance</h3>
          {todayAtt?.length === 0
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
      </div>
    </div>
  )
}
