import { redirect } from 'next/navigation'
import { getProfile } from '@/lib/supabase/getProfile'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function ParentDashboard() {
  const profile = await getProfile()
  if (!profile) redirect('/login')

  const supabase = createClient()

  let children: any[] = []
  let recentAlerts: any[] = []

  try {
    const { data } = await supabase.from('students')
      .select('id, full_name, roll_number, class_name, section, fee_status, gender')
      .eq('school_id', profile.school_id)
      .ilike('parent_email', profile.email)
      .eq('is_active', true)
      .order('class_name')
    children = data ?? []

    if (children.length > 0) {
      const childIds = children.map(c => c.id)
      const { data: alerts } = await supabase.from('notification_logs')
        .select('*, student:students(full_name)')
        .in('student_id', childIds)
        .order('created_at', { ascending: false })
        .limit(3)
      recentAlerts = alerts ?? []
    }
  } catch (err) {
    console.warn('ParentDashboard: Failed to fetch children/alerts (offline?):', err)
  }

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
          <p style={{ fontSize: 13 }}>Your email ({profile.email}) is not linked to any student. Please contact the school admin.</p>
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

          {/* Recent Alerts */}
          <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: 15, fontWeight: 600, color: '#0f172a', margin: 0 }}>Recent Alerts</h2>
              <a href="/parent/alerts" style={{ fontSize: 12, fontWeight: 600, color: '#4f46e5', textDecoration: 'none' }}>View All →</a>
            </div>
            {recentAlerts.length === 0 ? (
              <p style={{ fontSize: 13, color: '#64748b', margin: 0, padding: '1rem 0' }}>No recent alerts received.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {recentAlerts.map((alert: any) => {
                  const t = alert.type?.toLowerCase() || 'custom'
                  const emoji = 
                    t.includes('absence') ? '🎒' : 
                    t.includes('fee') ? '💰' : 
                    t.includes('exam') ? '📝' : 
                    t.includes('leave') ? '🏖️' : '📢'
                  
                  return (
                    <div key={alert.id} style={{ display: 'flex', gap: 12, padding: '12px 14px', background: '#f8fafc', borderRadius: 8, border: '1px solid #f1f5f9' }}>
                      <div style={{ fontSize: 20, display: 'flex', alignItems: 'center', flexShrink: 0 }}>{emoji}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 4 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '70%' }}>
                            {alert.type.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                            <span style={{ fontSize: 11, fontWeight: 400, color: '#64748b', marginLeft: 6 }}>for {alert.student?.full_name}</span>
                          </span>
                          <span style={{ fontSize: 11, color: '#94a3b8' }}>
                            {new Date(alert.created_at).toLocaleDateString('en-PK', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p style={{ fontSize: 12.5, color: '#334155', margin: '6px 0 0', lineHeight: '1.45', wordBreak: 'break-word' }}>{alert.message}</p>
                        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                          <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 4, background: '#eef2ff', color: '#4f46e5', border: '1px solid #c7d2fe' }}>
                            📲 Portal Notification
                          </span>
                          <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 4, background: alert.status === 'sent' ? '#f0fdf4' : '#fef2f2', color: alert.status === 'sent' ? '#16a34a' : '#dc2626', border: `1px solid ${alert.status === 'sent' ? '#dcfce7' : '#fecaca'}` }}>
                            {alert.status === 'sent' ? 'Received' : 'Failed'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="card" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: '1rem', color: '#0f172a' }}>Quick Links</h2>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {[
                { href: '/parent/alerts',       label: '📱 Alerts',        bg: '#d97706' },
                { href: '/parent/report-cards', label: '📄 Report Cards', bg: '#7c3aed' },
                { href: '/parent/attendance',   label: '✅ Attendance',   bg: '#4f46e5' },
                { href: '/parent/fees',         label: '💰 Fee Status',   bg: '#16a34a' },
                { href: '/parent/leaves',       label: '🏖️ Apply Leaves', bg: '#0891b2' },
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
