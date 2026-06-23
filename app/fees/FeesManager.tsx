'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Student { id: string; full_name: string; roll_number: string; class_name: string; fee_status?: string }

const inp: React.CSSProperties = {
  width: '100%', padding: '8px 12px', border: '1.5px solid #e2e8f0',
  borderRadius: 8, fontSize: 13, background: '#f8fafc', fontFamily: 'inherit',
}
const lbl: React.CSSProperties = { fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 4 }

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

export default function FeesManager({ fees: init, students: initStudents, schoolId }: { fees: any[]; students: Student[]; schoolId: string }) {
  const [fees, setFees]         = useState(init)
  const [students, setStudents] = useState(initStudents)
  const [showForm, setShowForm] = useState(false)
  const [editingFee, setEditingFee] = useState<any>(null)
  const [saving, setSaving]     = useState(false)
  const [filterStatus, setFilter] = useState('')
  const [search, setSearch]     = useState('')
  const [activeTab, setActiveTab] = useState<'fees' | 'students'>('fees')
  const now = new Date()
  const [form, setForm] = useState({
    student_id: '', amount: '', fee_type: 'monthly',
    month: `${now.toLocaleString('default',{month:'long'})} ${now.getFullYear()}`,
    due_date: now.toISOString().split('T')[0],
    paid_date: now.toISOString().split('T')[0],
    status: 'paid', payment_method: 'cash', notes: '',
  })
  const supabase = createClient()

  const filteredFees = fees.filter(f => {
    const q = search.toLowerCase()
    return (!q || f.students?.full_name?.toLowerCase().includes(q) || f.students?.roll_number?.includes(q) || f.receipt_number?.includes(q))
      && (!filterStatus || f.status === filterStatus)
  })

  const filteredStudents = students.filter(s => {
    const q = search.toLowerCase()
    return (!q || s.full_name?.toLowerCase().includes(q) || s.roll_number?.includes(q))
      && (!filterStatus || s.fee_status === filterStatus)
  })

  const collected = fees.filter(f => f.status === 'paid').reduce((s, f) => s + Number(f.amount), 0)
  const pending   = fees.filter(f => f.status !== 'paid').reduce((s, f) => s + Number(f.amount), 0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    
    if (editingFee) {
      const { data, error } = await supabase.from('fees').update({
        ...form, amount: parseFloat(form.amount),
        paid_date: form.status === 'paid' ? form.paid_date : null,
      }).eq('id', editingFee.id).select('*, students(full_name, roll_number, class_name)').single()
      
      if (!error && data) {
        setFees(p => p.map(f => f.id === data.id ? data : f))
        // Always sync student fee_status with the fee status
        await supabase.from('students').update({ fee_status: form.status }).eq('id', form.student_id)
        setStudents(p => p.map(s => s.id === form.student_id ? { ...s, fee_status: form.status } : s))
      }
    } else {
      const receipt = 'RCP-' + Date.now().toString(36).toUpperCase()
      const { data, error } = await supabase.from('fees').insert({
        ...form, school_id: schoolId, amount: parseFloat(form.amount),
        receipt_number: receipt,
        paid_date: form.status === 'paid' ? form.paid_date : null,
      }).select('*, students(full_name, roll_number, class_name)').single()
      
      if (!error && data) {
        setFees(p => [data, ...p])
        // Always sync student fee_status with the fee status
        await supabase.from('students').update({ fee_status: form.status }).eq('id', form.student_id)
        setStudents(p => p.map(s => s.id === form.student_id ? { ...s, fee_status: form.status } : s))
      }
    }
    setSaving(false); setShowForm(false); setEditingFee(null)
  }

  async function updateStudentStatus(studentId: string, newStatus: string) {
    const { error } = await supabase.from('students').update({ fee_status: newStatus }).eq('id', studentId)
    if (!error) {
      // Update local students state immediately — no page reload needed
      setStudents(p => p.map(s => s.id === studentId ? { ...s, fee_status: newStatus } : s))
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this record?')) return
    const { error } = await supabase.from('fees').delete().eq('id', id)
    if (!error) setFees(p => p.filter(f => f.id !== id))
  }

  function openEdit(fee: any) {
    setEditingFee(fee)
    setForm({
      student_id: fee.student_id,
      amount: fee.amount.toString(),
      fee_type: fee.fee_type,
      month: fee.month,
      due_date: fee.due_date,
      paid_date: fee.paid_date ?? now.toISOString().split('T')[0],
      status: fee.status,
      payment_method: fee.payment_method,
      notes: fee.notes ?? '',
    })
    setShowForm(true)
  }

  function openAdd() {
    setEditingFee(null)
    setForm({
      student_id: '', amount: '', fee_type: 'monthly',
      month: `${now.toLocaleString('default',{month:'long'})} ${now.getFullYear()}`,
      due_date: now.toISOString().split('T')[0],
      paid_date: now.toISOString().split('T')[0],
      status: 'paid', payment_method: 'cash', notes: '',
    })
    setShowForm(true)
  }

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a' }}>Fee Collection</h1>
          <p style={{ color: '#64748b', fontSize: 13, marginTop: 2 }}>{fees.length} records</p>
        </div>
        <button onClick={openAdd} style={{
          padding: '9px 18px', background: '#4f46e5', color: 'white',
          border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
        }}>+ Record Payment</button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 20, borderBottom: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
        {['fees', 'students'].map(t => (
          <button
            key={t}
            onClick={() => setActiveTab(t as any)}
            style={{
              padding: '8px 4px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === t ? '2px solid #4f46e5' : '2px solid transparent',
              color: activeTab === t ? '#4f46e5' : '#64748b',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              textTransform: 'capitalize',
            }}
          >
            {t === 'fees' ? 'Transactions' : 'Student Status'}
          </button>
        ))}
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Collected', value: `Rs ${collected.toLocaleString()}`, color: '#16a34a', bg: '#f0fdf4' },
          { label: 'Pending',   value: `Rs ${pending.toLocaleString()}`,   color: '#d97706', bg: '#fffbeb' },
          { label: 'Total Records', value: fees.length,                    color: '#4f46e5', bg: '#eef2ff' },
        ].map((s, i) => (
          <div key={i} className="card" style={{ padding: '1.25rem' }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{s.label}</p>
            <p style={{ fontSize: '1.6rem', fontWeight: 700, color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <input placeholder="Search student, receipt…" value={search} onChange={e => setSearch(e.target.value)} style={{ ...inp, width: 260 }} />
        <select value={filterStatus} onChange={e => setFilter(e.target.value)} style={{ ...inp, width: 'auto' }}>
          <option value="">All statuses</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
          <option value="overdue">Overdue</option>
        </select>
      </div>

      {/* Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          {activeTab === 'fees' ? (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  {['Receipt', 'Student', 'Type', 'Month', 'Amount', 'Method', 'Status', 'Date', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: 12, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredFees.length === 0
                  ? <tr><td colSpan={9} style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>No records found.</td></tr>
                  : filteredFees.map((f, i) => (
                    <tr key={f.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 ? '#fafafa' : 'white' }}>
                      <td style={{ padding: '11px 14px', fontFamily: 'monospace', fontSize: 11, color: '#6366f1', fontWeight: 500 }}>{f.receipt_number ?? '—'}</td>
                      <td style={{ padding: '11px 14px' }}>
                        <div style={{ fontWeight: 500, color: '#0f172a' }}>{f.students?.full_name ?? '—'}</div>
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>{f.students?.class_name} · #{f.students?.roll_number}</div>
                      </td>
                      <td style={{ padding: '11px 14px', color: '#475569', textTransform: 'capitalize' }}>{f.fee_type}</td>
                      <td style={{ padding: '11px 14px', color: '#475569' }}>{f.month ?? '—'}</td>
                      <td style={{ padding: '11px 14px', fontWeight: 600 }}>Rs {Number(f.amount).toLocaleString()}</td>
                      <td style={{ padding: '11px 14px', color: '#475569', textTransform: 'capitalize' }}>{f.payment_method ?? '—'}</td>
                      <td style={{ padding: '11px 14px' }}>{badge(f.status)}</td>
                      <td style={{ padding: '11px 14px', color: '#94a3b8', fontSize: 12 }}>{f.paid_date ?? f.due_date}</td>
                      <td style={{ padding: '11px 14px' }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => openEdit(f)} style={{ background: 'none', border: 'none', color: '#4f46e5', cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>Edit</button>
                          <button onClick={() => handleDelete(f.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  {['Roll No', 'Student', 'Class', 'Current Fee Status', 'Previous Months Records', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: 12, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredStudents.length === 0
                  ? <tr><td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>No students found.</td></tr>
                  : filteredStudents.map((s, i) => (
                    <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 ? '#fafafa' : 'white' }}>
                      <td style={{ padding: '11px 14px', fontFamily: 'monospace', color: '#6366f1', fontWeight: 500 }}>{s.roll_number}</td>
                      <td style={{ padding: '11px 14px', fontWeight: 500, color: '#0f172a' }}>{s.full_name}</td>
                      <td style={{ padding: '11px 14px', color: '#475569' }}>{s.class_name}</td>
                      <td style={{ padding: '11px 14px' }}>
                        <select
                          value={(s as any).fee_status}
                          onChange={(e) => updateStudentStatus(s.id, e.target.value)}
                          style={{ ...inp, width: 'auto', padding: '4px 8px' }}
                        >
                          <option value="paid">Paid</option>
                          <option value="pending">Pending</option>
                          <option value="overdue">Overdue</option>
                        </select>
                      </td>
                      <td style={{ padding: '11px 14px' }}>
                        {(() => {
                          const studentFees = fees.filter(f => f.student_id === s.id && f.month)
                            .sort((a, b) => new Date(b.due_date).getTime() - new Date(a.due_date).getTime())
                          if (studentFees.length === 0) {
                            return <span style={{ color: '#94a3b8', fontSize: 11 }}>No history</span>
                          }
                          return (
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', maxWidth: '320px' }}>
                              {studentFees.map(f => {
                                const isPaid = f.status === 'paid'
                                const isOverdue = f.status === 'overdue'
                                const bg = isPaid ? '#ecfdf5' : isOverdue ? '#fef2f2' : '#fffbeb'
                                const color = isPaid ? '#047857' : isOverdue ? '#b91c1c' : '#b45309'
                                const border = isPaid ? '#a7f3d0' : isOverdue ? '#fecaca' : '#fde68a'
                                return (
                                  <span
                                    key={f.id}
                                    onClick={() => openEdit(f)}
                                    title={`Click to edit: ${f.fee_type} fee of Rs ${f.amount}`}
                                    style={{
                                      background: bg,
                                      color,
                                      border: `1.5px solid ${border}`,
                                      fontSize: 10,
                                      fontWeight: 600,
                                      padding: '2px 8px',
                                      borderRadius: 12,
                                      whiteSpace: 'nowrap',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      cursor: 'pointer',
                                      transition: 'all 0.15s ease',
                                    }}
                                  >
                                    {f.month} ({f.status})
                                  </span>
                                )
                              })}
                            </div>
                          )
                        })()}
                      </td>
                      <td style={{ padding: '11px 14px' }}>
                        <button
                          onClick={() => {
                            setEditingFee(null)
                            setForm(f => ({ ...f, student_id: s.id, status: (s as any).fee_status }))
                            setShowForm(true)
                          }}
                          style={{ background: '#4f46e5', color: 'white', border: 'none', borderRadius: 6, padding: '5px 12px', fontSize: 11, cursor: 'pointer' }}
                        >
                          Record Payment
                        </button>
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
          <div className="card fade-up" style={{ width: '100%', maxWidth: 500, padding: '1.75rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{editingFee ? 'Edit' : 'Record'} Fee Payment</h2>
              <button onClick={() => { setShowForm(false); setEditingFee(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#64748b' }}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gap: '0.875rem' }}>
                <div>
                  <label style={lbl}>Student *</label>
                  <select required style={inp} value={form.student_id} onChange={e => setForm(f => ({ ...f, student_id: e.target.value }))}>
                    <option value="">Select student…</option>
                    {students.map(s => <option key={s.id} value={s.id}>{s.full_name} — {s.class_name} (#{s.roll_number})</option>)}
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
                  <div>
                    <label style={lbl}>Fee Type *</label>
                    <select required style={inp} value={form.fee_type} onChange={e => setForm(f => ({ ...f, fee_type: e.target.value }))}>
                      {['monthly','admission','exam','other'].map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={lbl}>Amount (Rs) *</label>
                    <input required type="number" min="1" style={inp} value={form.amount} placeholder="3500"
                      onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
                  <div>
                    <label style={lbl}>Month</label>
                    <input style={inp} value={form.month} onChange={e => setForm(f => ({ ...f, month: e.target.value }))} />
                  </div>
                  <div>
                    <label style={lbl}>Status *</label>
                    <select required style={inp} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                      <option value="paid">Paid</option>
                      <option value="pending">Pending</option>
                      <option value="overdue">Overdue</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
                  <div>
                    <label style={lbl}>Payment Method</label>
                    <select style={inp} value={form.payment_method} onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))}>
                      {['cash','bank','jazzcash','easypaisa'].map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase()+m.slice(1)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={lbl}>Due Date *</label>
                    <input required type="date" style={inp} value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
                  </div>
                </div>
                {form.status === 'paid' && (
                  <div>
                    <label style={lbl}>Paid Date</label>
                    <input type="date" style={inp} value={form.paid_date} onChange={e => setForm(f => ({ ...f, paid_date: e.target.value }))} />
                  </div>
                )}
                <div>
                  <label style={lbl}>Notes</label>
                  <input style={inp} value={form.notes} placeholder="Optional…" onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: '1.25rem' }}>
                <button type="button" onClick={() => setShowForm(false)} style={{
                  flex: 1, padding: 10, border: '1px solid #e2e8f0', borderRadius: 8,
                  background: 'white', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit',
                }}>Cancel</button>
                <button type="submit" disabled={saving} style={{
                  flex: 2, padding: 10, background: saving ? '#a5b4fc' : '#4f46e5',
                  color: 'white', border: 'none', borderRadius: 8, fontSize: 13,
                  fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                }}>{saving ? 'Saving…' : (editingFee ? 'Update Record' : 'Save Record')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
