import { redirect } from 'next/navigation'
import { getProfile } from '@/lib/supabase/getProfile'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function ParentDashboard() {
  const profile = await getProfile()
  if (!profile) redirect('/login')

  const supabase = createClient()

  const { data: children } = await supabase.from('students')
    .select('id, full_name, roll_number, class_name, section, fee_status, gender')
    .eq('school_id', profile.school_id)
    .ilike('parent_email', profile.email)
    .eq('is_active', true)
    .order('class_name')

  const today = new Date().toISOString().split('T')[0]
  const dateStr = new Date().toLocaleDateString('en-PK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  const firstName = profile.full_name.split(' ')[0]

  const feeColor = (s: string) => s === 'paid' ? '#16a34a' : s === 'overdue' ? '#dc2626' : '#d97706'
  const feeBg    = (s: string) => s === 'paid' ? '#f0fdf4' : s === 'overdue' ? '#fef2f2' : '#fffbeb'

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
          Welcome, {firstName} 👋
        </h1>
        <p style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>{dateStr}</p>
      </div>

      {(children ?? []).length === 0 ? (
        <div className="card" style={{ padding: '2.5rem', textAlign: 'center', color: '#94a3b8' }}>
          <p style={{ fontSize: 16, marginBottom: 8 }}>No children found</p>
          <p style={{ fontSize: 13 }}>Your email ({user.email}) is not linked to any student. Please contact the school admin.</p>
        </div>
      ) : (
        <>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: '#0f172a', marginBottom: '1rem' }}>
            Your Children ({(children ?? []).length})
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 14, marginBottom: '2rem' }}>
            {(children ?? []).map(child => (
              <div key={child.id} className="card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#fdf4ff', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                    {child.gender === 'male' ? '👦' : '👧'}
                  </div>
                  <div>
                    <p style={{ fontWeight: 700, color: '#0f172a', fontSize: 15, margin: 0 }}>{child.full_name}</p>
                    <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0' }}>{child.class_name} — Section {child.section}</p>
                    <p style={{ fontSize: 11, color: '#94a3b8', margin: '1px 0 0', fontFamily: 'monospace' }}>#{child.roll_number}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, fontWeight: 600, textTransform: 'capitalize', padding: '3px 10px', borderRadius: 20, background: feeBg(child.fee_status), color: feeColor(child.fee_status) }}>
                    Fee: {child.fee_status}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="card" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: '1rem', color: '#0f172a' }}>Quick Links</h2>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {[
                { href: '/parent/report-cards', label: '📄 Report Cards', bg: '#7c3aed' },
                { href: '/parent/attendance',   label: '✅ Attendance',   bg: '#4f46e5' },
                { href: '/parent/fees',         label: '💰 Fee Status',   bg: '#16a34a' },
                { href: '/parent/account',      label: '🔑 Change Password', bg: '#64748b' },
              ].map(a => (
                <a key={a.href} href={a.href} style={{
                  padding: '9px 16px', borderRadius: 8, background: a.bg,
                  color: 'white', textDecoration: 'none', fontSize: 13, fontWeight: 500,
                }}>{a.label}</a>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
