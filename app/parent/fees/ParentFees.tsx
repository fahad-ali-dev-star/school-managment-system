'use client'
import { useState } from 'react'

interface Child { id: string; full_name: string; roll_number: string; class_name: string; section: string; fee_status: string }

function badge(status: string) {
  const map: Record<string, [string, string]> = {
    paid:    ['#f0fdf4', '#16a34a'],
    pending: ['#fffbeb', '#d97706'],
    overdue: ['#fef2f2', '#dc2626'],
  }
  const [bg, color] = map[status] ?? map.pending
  return <span style={{ background: bg, color, fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6, textTransform: 'capitalize' as const }}>{status}</span>
}

export default function ParentFees({ fees, children_ }: { fees: any[]; children_: Child[] }) {
  const [selectedChild, setSelected] = useState<string>('')

  const displayed = selectedChild ? fees.filter(f => f.student_id === selectedChild) : fees
  const collected = displayed.filter(f => f.status === 'paid').reduce((s, f) => s + Number(f.amount), 0)
  const pending   = displayed.filter(f => f.status !== 'paid').reduce((s, f) => s + Number(f.amount), 0)

  const inp: React.CSSProperties = {
    padding: '8px 12px', border: '1.5px solid #e2e8f0',
    borderRadius: 8, fontSize: 13, background: '#f8fafc', fontFamily: 'inherit',
  }

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Fee Status</h1>
        <p style={{ color: '#64748b', fontSize: 13, marginTop: 3 }}>View fee payment history</p>
      </div>

      {children_.length > 1 && (
        <div style={{ marginBottom: '1.25rem' }}>
          <select value={selectedChild} onChange={e => setSelected(e.target.value)} style={inp}>
            <option value="">All children</option>
            {children_.map(c => <option key={c.id} value={c.id}>{c.full_name} — {c.class_name} {c.section}</option>)}
          </select>
        </div>
      )}

      {children_.length > 0 && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          {children_.filter(c => !selectedChild || c.id === selectedChild).map(c => (
            <div key={c.id} style={{ background: c.fee_status === 'paid' ? '#f0fdf4' : c.fee_status === 'overdue' ? '#fef2f2' : '#fffbeb', border: `1px solid ${c.fee_status === 'paid' ? '#bbf7d0' : c.fee_status === 'overdue' ? '#fecaca' : '#fde68a'}`, borderRadius: 10, padding: '10px 16px', fontSize: 13 }}>
              <strong>{c.full_name}</strong> &nbsp;·&nbsp; Fee status: {badge(c.fee_status)}
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Collected', value: `Rs ${collected.toLocaleString()}`, color: '#16a34a' },
          { label: 'Pending',   value: `Rs ${pending.toLocaleString()}`,   color: '#d97706' },
          { label: 'Records',   value: displayed.length,                   color: '#4f46e5' },
        ].map((s, i) => (
          <div key={i} className="card" style={{ padding: '1.25rem' }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{s.label}</p>
            <p style={{ fontSize: '1.5rem', fontWeight: 700, color: s.color, margin: 0 }}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                {['Student', 'Type', 'Month', 'Amount', 'Status', 'Date'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: 12, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayed.length === 0
                ? <tr><td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>No fee records found.</td></tr>
                : displayed.map((f, i) => (
                  <tr key={f.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 ? '#fafafa' : 'white' }}>
                    <td style={{ padding: '11px 14px' }}>
                      <div style={{ fontWeight: 500, color: '#0f172a' }}>{f.students?.full_name ?? '—'}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>#{f.students?.roll_number}</div>
                    </td>
                    <td style={{ padding: '11px 14px', color: '#475569', textTransform: 'capitalize' }}>{f.fee_type}</td>
                    <td style={{ padding: '11px 14px', color: '#475569' }}>{f.month ?? '—'}</td>
                    <td style={{ padding: '11px 14px', fontWeight: 600 }}>Rs {Number(f.amount).toLocaleString()}</td>
                    <td style={{ padding: '11px 14px' }}>{badge(f.status)}</td>
                    <td style={{ padding: '11px 14px', color: '#94a3b8', fontSize: 12 }}>{f.paid_date ?? f.due_date}</td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
