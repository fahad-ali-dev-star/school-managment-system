'use client'
import { useState } from 'react'

function badge(status: string) {
  const map: Record<string, [string, string]> = {
    paid:    ['#f0fdf4', '#16a34a'],
    pending: ['#fffbeb', '#d97706'],
    overdue: ['#fef2f2', '#dc2626'],
  }
  const [bg, color] = map[status] ?? map.pending
  return (
    <span style={{ background: bg, color, fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6, textTransform: 'capitalize' as const }}>
      {status}
    </span>
  )
}

export default function TeacherFeesView({ fees, className, section }: { fees: any[]; className: string; section: string }) {
  const [search, setSearch]     = useState('')
  const [filterStatus, setFilter] = useState('')

  const filtered = fees.filter(f => {
    const q = search.toLowerCase()
    return (!q || f.students?.full_name?.toLowerCase().includes(q) || f.students?.roll_number?.includes(q))
      && (!filterStatus || f.status === filterStatus)
  })

  const inp: React.CSSProperties = {
    width: '100%', padding: '8px 12px', border: '1.5px solid #e2e8f0',
    borderRadius: 8, fontSize: 13, background: '#f8fafc', fontFamily: 'inherit',
  }

  const collected = fees.filter(f => f.status === 'paid').reduce((s, f) => s + Number(f.amount), 0)
  const pending   = fees.filter(f => f.status !== 'paid').reduce((s, f) => s + Number(f.amount), 0)

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Fee Records</h1>
        <p style={{ color: '#64748b', fontSize: 13, marginTop: 3 }}>{className} — Section {section} &nbsp;·&nbsp; {fees.length} records (view only)</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Collected', value: `Rs ${collected.toLocaleString()}`, color: '#16a34a', bg: '#f0fdf4' },
          { label: 'Pending',   value: `Rs ${pending.toLocaleString()}`,   color: '#d97706', bg: '#fffbeb' },
          { label: 'Records',   value: fees.length,                        color: '#4f46e5', bg: '#eef2ff' },
        ].map((s, i) => (
          <div key={i} className="card" style={{ padding: '1.25rem' }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{s.label}</p>
            <p style={{ fontSize: '1.6rem', fontWeight: 700, color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <input placeholder="Search student…" value={search} onChange={e => setSearch(e.target.value)} style={{ ...inp, width: 240 }} />
        <select value={filterStatus} onChange={e => setFilter(e.target.value)} style={{ ...inp, width: 'auto' }}>
          <option value="">All statuses</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
          <option value="overdue">Overdue</option>
        </select>
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
              {filtered.length === 0
                ? <tr><td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>No records found.</td></tr>
                : filtered.map((f, i) => (
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
