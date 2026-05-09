'use client'
import { useState } from 'react'

interface Child { id: string; full_name: string; roll_number: string; class_name: string; section: string }
interface AttRecord { student_id: string; date: string; status: string }

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  present: { bg: '#f0fdf4', color: '#16a34a', label: 'Present' },
  absent:  { bg: '#fef2f2', color: '#dc2626', label: 'Absent' },
  late:    { bg: '#fffbeb', color: '#d97706', label: 'Late' },
  leave:   { bg: '#f5f3ff', color: '#7c3aed', label: 'Leave' },
}

export default function ParentAttendance({ children_, attendance }: { children_: Child[]; attendance: AttRecord[] }) {
  const [selectedChild, setSelected] = useState(children_[0]?.id ?? '')

  const child = children_.find(c => c.id === selectedChild)
  const myAtt = attendance.filter(a => a.student_id === selectedChild)

  const present   = myAtt.filter(a => a.status === 'present').length
  const absent    = myAtt.filter(a => a.status === 'absent').length
  const late      = myAtt.filter(a => a.status === 'late').length
  const totalDays = myAtt.length
  const attRate   = totalDays > 0 ? Math.round((present / totalDays) * 100) : 0

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Attendance</h1>
        <p style={{ color: '#64748b', fontSize: 13, marginTop: 3 }}>View your child&apos;s attendance history</p>
      </div>

      {children_.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>No children linked to your account.</div>
      ) : (
        <>
          {children_.length > 1 && (
            <div style={{ marginBottom: '1.25rem' }}>
              <select value={selectedChild} onChange={e => setSelected(e.target.value)}
                style={{ padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, background: '#f8fafc', fontFamily: 'inherit' }}>
                {children_.map(c => <option key={c.id} value={c.id}>{c.full_name} — {c.class_name} {c.section}</option>)}
              </select>
            </div>
          )}

          {child && (
            <div style={{ background: '#fdf4ff', border: '1px solid #e9d5ff', borderRadius: 10, padding: '10px 14px', marginBottom: '1.5rem', fontSize: 13, color: '#6b21a8' }}>
              {child.full_name} &nbsp;·&nbsp; {child.class_name} — Sec {child.section} &nbsp;·&nbsp; #{child.roll_number}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            {[
              { label: 'Total Days', value: totalDays,  color: '#475569', bg: '#f8fafc' },
              { label: 'Present',    value: present,    color: '#16a34a', bg: '#f0fdf4' },
              { label: 'Absent',     value: absent,     color: '#dc2626', bg: '#fef2f2' },
              { label: 'Late',       value: late,       color: '#d97706', bg: '#fffbeb' },
              { label: 'Rate',       value: `${attRate}%`, color: attRate >= 75 ? '#16a34a' : '#dc2626', bg: attRate >= 75 ? '#f0fdf4' : '#fef2f2' },
            ].map((s, i) => (
              <div key={i} className="card" style={{ padding: '1rem', background: s.bg }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 6px' }}>{s.label}</p>
                <p style={{ fontSize: '1.5rem', fontWeight: 700, color: s.color, margin: 0 }}>{s.value}</p>
              </div>
            ))}
          </div>

          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#475569', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Attendance History</p>
            </div>
            {myAtt.length === 0
              ? <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>No attendance records found.</div>
              : <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    {['Date', 'Status'].map(h => (
                      <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: 12 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {myAtt.slice(0, 100).map((r, i) => {
                    const st = STATUS_STYLE[r.status] ?? STATUS_STYLE.present
                    return (
                      <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 ? '#fafafa' : 'white' }}>
                        <td style={{ padding: '10px 14px', color: '#475569' }}>
                          {new Date(r.date + 'T12:00:00').toLocaleDateString('en-PK', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: st.bg, color: st.color }}>{st.label}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            }
          </div>
        </>
      )}
    </div>
  )
}
