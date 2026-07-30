'use client'

import { useState } from 'react'

interface Child {
  id: string
  full_name: string
  roll_number: string
  class_name: string
  section: string
}

interface AlertRecord {
  id: string
  student_id: string
  type: string
  channel: string
  recipient: string
  message: string
  status: string
  error_msg?: string | null
  created_at: string
  student?: {
    id: string
    full_name: string
    roll_number: string
    class_name: string
    section: string
  }
}

export default function ParentAlerts({
  children_,
  alerts
}: {
  children_: Child[]
  alerts: AlertRecord[]
}) {
  const [selectedChild, setSelectedChild] = useState<string>('all')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')

  // Filter alerts
  const filteredAlerts = alerts.filter(a => {
    // Child filter
    if (selectedChild !== 'all' && a.student_id !== selectedChild) return false
    // Type filter
    if (selectedType !== 'all') {
      const typeLower = a.type?.toLowerCase() || ''
      if (selectedType === 'absence' && !typeLower.includes('absence')) return false
      if (selectedType === 'fee' && !typeLower.includes('fee')) return false
      if (selectedType === 'exam' && !typeLower.includes('exam')) return false
      if (selectedType === 'announcement' && !typeLower.includes('announcement')) return false
      if (selectedType === 'custom' && (typeLower.includes('absence') || typeLower.includes('fee') || typeLower.includes('exam') || typeLower.includes('announcement'))) return false
    }
    // Search query
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase()
      const msgMatch = a.message?.toLowerCase().includes(query)
      const typeMatch = a.type?.toLowerCase().includes(query)
      const studentMatch = a.student?.full_name?.toLowerCase().includes(query)
      return msgMatch || typeMatch || studentMatch
    }
    return true
  })

  // Statistics
  const totalCount = filteredAlerts.length
  const deliveredCount = filteredAlerts.filter(a => a.status === 'sent').length
  const failedCount = filteredAlerts.filter(a => a.status === 'failed').length

  // Calculate time remaining before a notification expires (24h from created_at)
  const getExpiresIn = (createdAt: string): string => {
    const expiresAt = new Date(new Date(createdAt).getTime() + 24 * 60 * 60 * 1000)
    const diffMs = expiresAt.getTime() - Date.now()
    if (diffMs <= 0) return 'expiring soon'
    const hrs = Math.floor(diffMs / (1000 * 60 * 60))
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    if (hrs > 0) return `expires in ${hrs}h ${mins}m`
    return `expires in ${mins}m`
  }

  const getAlertIcon = (type: string) => {
    const t = type.toLowerCase()
    if (t.includes('absence')) return '🎒'
    if (t.includes('fee')) return '💰'
    if (t.includes('exam')) return '📝'
    if (t.includes('leave')) return '🏖️'
    return '📢'
  }

  const getAlertColor = (type: string) => {
    const t = type.toLowerCase()
    if (t.includes('absence')) return { bg: '#fffbeb', text: '#b45309', border: '#fef3c7' }
    if (t.includes('fee')) return { bg: '#f0fdf4', text: '#15803d', border: '#dcfce7' }
    if (t.includes('exam')) return { bg: '#f5f3ff', text: '#6d28d9', border: '#e9d5ff' }
    return { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' }
  }

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Alerts & Notifications</h1>
          <p style={{ color: '#64748b', fontSize: 13, marginTop: 3 }}>School notifications delivered directly to your parent portal</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, background: '#f8fafc', padding: '6px 12px', borderRadius: 20, border: '1px solid #e2e8f0', color: '#475569' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
            Portal Notifications Active
          </div>
        </div>
      </div>

      {/* Retention info banner */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: '#f0fdf4', border: '1px solid #bbf7d0',
        borderRadius: 10, padding: '10px 16px', marginBottom: '1.5rem',
        fontSize: 13, color: '#166534',
      }}>
        <span style={{ fontSize: 18, flexShrink: 0 }}>📢</span>
        <span>
          <strong>Live Notifications:</strong> School alerts and notifications are delivered directly to your portal and stored for 30 days.
        </span>
      </div>

      {children_.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
          No children linked to your parent account. Please contact school administration.
        </div>
      ) : (
        <>
          {/* Statistics summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            {[
              { label: 'Total Alerts', value: totalCount, color: '#475569', bg: 'white' },
              { label: 'Received', value: deliveredCount, color: '#16a34a', bg: '#f0fdf4' },
              { label: 'Failed', value: failedCount, color: failedCount > 0 ? '#dc2626' : '#64748b', bg: failedCount > 0 ? '#fef2f2' : 'white' },
            ].map((stat, i) => (
              <div key={i} className="card" style={{ padding: '1rem', background: stat.bg }}>
                <p style={{ fontSize: 10, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 6px' }}>{stat.label}</p>
                <p style={{ fontSize: '1.4rem', fontWeight: 700, color: stat.color, margin: 0 }}>{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Filters Bar */}
          <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <input
                  type="text"
                  placeholder="Search alert messages..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: 8,
                    fontSize: 13,
                    background: '#f8fafc',
                    fontFamily: 'inherit',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {children_.length > 1 && (
                <div style={{ minWidth: 150 }}>
                  <select
                    value={selectedChild}
                    onChange={e => setSelectedChild(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1.5px solid #e2e8f0',
                      borderRadius: 8,
                      fontSize: 13,
                      background: '#f8fafc',
                      fontFamily: 'inherit',
                      outline: 'none'
                    }}
                  >
                    <option value="all">All Children</option>
                    {children_.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.full_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ minWidth: 150 }}>
                <select
                  value={selectedType}
                  onChange={e => setSelectedType(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: 8,
                    fontSize: 13,
                    background: '#f8fafc',
                    fontFamily: 'inherit',
                    outline: 'none'
                  }}
                >
                  <option value="all">All Alert Types</option>
                  <option value="absence">🎒 Attendance Alerts</option>
                  <option value="fee">💰 Fee reminders</option>
                  <option value="exam">📝 Exam reports</option>
                  <option value="announcement">📢 Announcements</option>
                  <option value="custom">💬 Custom Messages</option>
                </select>
              </div>
            </div>
          </div>

          {/* Alerts List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {filteredAlerts.length === 0 ? (
              <div className="card" style={{ padding: '4rem', textAlign: 'center', color: '#94a3b8' }}>
                <p style={{ fontSize: 15, fontWeight: 500, margin: '0 0 4px' }}>No alerts match your criteria</p>
                <p style={{ fontSize: 12, margin: 0 }}>Try adjusting your filters or search query.</p>
              </div>
            ) : (
              filteredAlerts.map(alert => {
                const colors = getAlertColor(alert.type)
                const isDelivered = alert.status === 'sent'


                return (
                  <div
                    key={alert.id}
                    className="card"
                    style={{
                      padding: '1.5rem',
                      borderLeft: `4px solid ${colors.text}`,
                      transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', gap: 14 }}>
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: '50%',
                          background: colors.bg,
                          border: `1px solid ${colors.border}`,
                          color: colors.text,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 20,
                          flexShrink: 0
                        }}
                      >
                        {getAlertIcon(alert.type)}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 6 }}>
                          <div>
                            <span
                              style={{
                                fontSize: 13,
                                fontWeight: 700,
                                color: colors.text,
                                background: colors.bg,
                                padding: '2px 8px',
                                borderRadius: 6,
                                marginRight: 8
                              }}
                            >
                              {alert.type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                            </span>
                            {alert.student && (
                              <span style={{ fontSize: 12.5, fontWeight: 600, color: '#475569' }}>
                                for {alert.student.full_name} ({alert.student.class_name} - Sec {alert.student.section})
                              </span>
                            )}
                          </div>
                          <span style={{ fontSize: 12, color: '#94a3b8' }}>
                            {new Date(alert.created_at).toLocaleDateString('en-PK', {
                              weekday: 'short',
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>

                        <p style={{ fontSize: 13.5, color: '#1e293b', margin: '8px 0', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                          {alert.message}
                        </p>

                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 10 }}>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              padding: '2px 8px',
                              borderRadius: 4,
                              background: '#eef2ff',
                              color: '#4f46e5',
                              border: '1px solid #c7d2fe',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4
                            }}
                          >
                            📲 Portal Notification
                          </span>

                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              padding: '2px 8px',
                              borderRadius: 4,
                              background: isDelivered ? '#f0fdf4' : '#fef2f2',
                              color: isDelivered ? '#16a34a' : '#dc2626',
                              border: `1px solid ${isDelivered ? '#dcfce7' : '#fecaca'}`
                            }}
                          >
                            {isDelivered ? '✓ Received' : '✗ Failed'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </>
      )}
    </div>
  )
}
