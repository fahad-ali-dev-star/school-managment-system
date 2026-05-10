import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { parseClassAssigned } from '@/lib/teacherAccess'
import { getProfile } from '@/lib/supabase/getProfile'

export default async function TeacherDashboard() {
  const profile = await getProfile()
  if (!profile) redirect('/login')

  const supabase = createClient()

  const { data: teacherRow } = await supabase.from('teachers')
    .select('class_assigned, subject, full_name').eq('email', profile.email).eq('school_id', profile.school_id).single()

  const classAssigned = teacherRow?.class_assigned ?? ''
  const { class_name, section } = parseClassAssigned(classAssigned)
  const today = new Date().toISOString().split('T')[0]

  const [{ data: students }, { data: todayAtt }, { data: exams }] = await Promise.all([
    supabase.from('students').select('id', { count: 'exact', head: false })
      .eq('school_id', profile.school_id).eq('class_name', class_name).eq('section', section).eq('is_active', true),
    supabase.from('attendance').select('status')
      .eq('school_id', profile.school_id).eq('date', today),
    supabase.from('exams').select('id, title, status', { count: 'exact', head: false })
      .eq('school_id', profile.school_id).eq('class_name', class_name),
  ])

  const studentCount = students?.length ?? 0
  const present = todayAtt?.filter(r => r.status === 'present').length ?? 0
  const examCount = exams?.length ?? 0
  const dateStr = new Date().toLocaleDateString('en-PK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  const firstName = profile.full_name.split(' ')[0]

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
          Good morning, {firstName} 👋
        </h1>
        <p style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>{dateStr}</p>
      </div>

      {classAssigned ? (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '12px 16px', marginBottom: '1.5rem', fontSize: 13, color: '#15803d' }}>
          Your assigned class: <strong>{classAssigned}</strong>
          {teacherRow?.subject && <> &nbsp;·&nbsp; Subject: <strong>{teacherRow.subject}</strong></>}
        </div>
      ) : (
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '12px 16px', marginBottom: '1.5rem', fontSize: 13, color: '#92400e' }}>
          No class assigned yet. Please contact the admin.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'My Students',    value: studentCount, color: '#4f46e5', icon: '👨‍🎓' },
          { label: 'Present Today',  value: present,      color: '#16a34a', icon: '✅' },
          { label: 'Total Exams',    value: examCount,    color: '#0284c7', icon: '📝' },
        ].map((s, i) => (
          <div key={i} className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>{s.label}</p>
              <span style={{ fontSize: 16 }}>{s.icon}</span>
            </div>
            <p style={{ fontSize: '1.75rem', fontWeight: 700, color: s.color, margin: 0 }}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: '1.5rem' }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: '1rem', color: '#0f172a' }}>Quick Actions</h2>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {[
            { href: '/teacher/attendance',   label: '✅ Mark Attendance',   bg: '#4f46e5' },
            { href: '/teacher/exams',        label: '📝 Enter Marks',       bg: '#0284c7' },
            { href: '/teacher/report-cards', label: '📄 Report Cards',      bg: '#7c3aed' },
            { href: '/teacher/fees',         label: '💰 View Fees',         bg: '#16a34a' },
            { href: '/teacher/account',      label: '🔑 Change Password',   bg: '#64748b' },
          ].map(a => (
            <a key={a.href} href={a.href} style={{
              padding: '9px 16px', borderRadius: 8, background: a.bg,
              color: 'white', textDecoration: 'none', fontSize: 13, fontWeight: 500,
            }}>{a.label}</a>
          ))}
        </div>
      </div>
    </div>
  )
}
