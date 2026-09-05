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
    let studentsQuery = supabase.from('students')
      .select('id, full_name, roll_number, class_name, section, fee_status, gender')
      .ilike('parent_email', profile.email)
      .eq('is_active', true)

    if (profile.school_id) {
      studentsQuery = studentsQuery.eq('school_id', profile.school_id)
    }

    const { data } = await studentsQuery.order('class_name')
    children = data ?? []

    const childIds = children.map(c => c.id)
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    
    let query = supabase.from('notification_logs')
      .select('*, student:students(full_name)')
      .gte('created_at', since)

    if (profile.school_id) {
      query = query.eq('school_id', profile.school_id)
    }

    if (childIds.length > 0 && profile.email) {
      query = query.or(`student_id.in.(${childIds.join(',')}),recipient.ilike.${profile.email}`)
    } else if (childIds.length > 0) {
      query = query.in('student_id', childIds)
    } else if (profile.email) {
      query = query.ilike('recipient', profile.email)
    }

    if (childIds.length > 0 || profile.email) {
      const { data: alerts } = await query
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
    <div className="responsive-page-container">
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
          Welcome, {firstName} 👋
        </h1>
        <p style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>{dateStr}</p>
      </div>

      {(children ?? []).length === 0 ? (
        <div className="card" style={{ padding: '2rem 1rem', textAlign: 'center', color: '#94a3b8' }}>
          <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 8, color: '#475569' }}>No children found</p>
          <p style={{ fontSize: 13, margin: 0 }}>Your email ({profile.email}) is not linked to any student. Please contact the school admin.</p>
        </div>
      ) : (
        <>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: '#0f172a', marginBottom: '0.875rem' }}>
            Your Children ({(children ?? []).length})
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: 12, marginBottom: '1.75rem' }}>
            {(children ?? []).map(child => (
              <div key={child.id} className="card" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#fdf4ff', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                    {child.gender === 'male' ? '👦' : '👧'}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontWeight: 700, color: '#0f172a', fontSize: 14.5, margin: 0, wordBreak: 'break-word' }}>{child.full_name}</p>
                    <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0' }}>{child.class_name} — Section {child.section}</p>
                    <p style={{ fontSize: 11, color: '#94a3b8', margin: '1px 0 0', fontFamily: 'monospace' }}>#{child.roll_number}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11.5, fontWeight: 600, textTransform: 'capitalize', padding: '3px 10px', borderRadius: 20, background: feeBg(child.fee_status), color: feeColor(child.fee_status) }}>
                    Fee: {child.fee_status}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Recent Alerts */}
          <div className="card" style={{ padding: '1.25rem', marginBottom: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: 15, fontWeight: 600, color: '#0f172a', margin: 0 }}>Recent Alerts</h2>
              <a href="/parent/alerts" style={{ fontSize: 12, fontWeight: 600, color: '#4f46e5', textDecoration: 'none' }}>View All →</a>
            </div>
            {recentAlerts.length === 0 ? (
              <p style={{ fontSize: 13, color: '#64748b', margin: 0, padding: '0.75rem 0' }}>No recent alerts received.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {recentAlerts.map((alert: any) => {
                  const t = alert.type?.toLowerCase() || 'custom'
                  const emoji = 
                    t.includes('absence') ? '🎒' : 
                    t.includes('fee') ? '💰' : 
                    t.includes('exam') ? '📝' : 
                    t.includes('leave') ? '🏖️' : '📢'
                  
                  return (
                    <div key={alert.id} style={{ display: 'flex', gap: 10, padding: '10px 12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #f1f5f9' }}>
                      <div style={{ fontSize: 18, display: 'flex', alignItems: 'center', flexShrink: 0 }}>{emoji}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 4 }}>
                          <span style={{ fontSize: 12.5, fontWeight: 600, color: '#0f172a', wordBreak: 'break-word' }}>
                            {alert.type.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                            {alert.student?.full_name && (
                              <span style={{ fontSize: 11, fontWeight: 400, color: '#64748b', marginLeft: 4 }}>for {alert.student.full_name}</span>
                            )}
                          </span>
                          <span style={{ fontSize: 11, color: '#94a3b8', whiteSpace: 'nowrap' }}>
                            {new Date(alert.created_at).toLocaleDateString('en-PK', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p style={{ fontSize: 12, color: '#334155', margin: '5px 0 0', lineHeight: '1.45', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{alert.message}</p>
                        <div style={{ display: 'flex', gap: 6, marginTop: 7, flexWrap: 'wrap' }}>
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

          <div className="card" style={{ padding: '1.25rem' }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: '0.875rem', color: '#0f172a' }}>Quick Links</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 140px), 1fr))', gap: 8 }}>
              {[
                { href: '/parent/alerts',       label: '📱 Alerts',        bg: '#d97706' },
                { href: '/parent/report-cards', label: '📄 Report Cards', bg: '#7c3aed' },
                { href: '/parent/attendance',   label: '✅ Attendance',   bg: '#4f46e5' },
                { href: '/parent/fees',         label: '💰 Fee Status',   bg: '#16a34a' },
                { href: '/parent/leaves',       label: '🏖️ Apply Leaves', bg: '#0891b2' },
                { href: '/parent/account',      label: '🔑 Change Password', bg: '#64748b' },
              ].map(a => (
                <a key={a.href} href={a.href} style={{
                  padding: '9px 12px', borderRadius: 8, background: a.bg,
                  color: 'white', textDecoration: 'none', fontSize: 12.5, fontWeight: 500,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center'
                }}>{a.label}</a>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
