'use client'
import { useState } from 'react'
import type { LeaveApplication, LeaveType } from '@/types'

interface Student { id: string; full_name: string; roll_number: string; class_name: string; section: string }

const STATUS_CFG: Record<string, { bg: string; color: string; border: string; label: string; icon: string }> = {
  pending:   { bg: '#fffbeb', color: '#d97706', border: '#fde68a', label: 'Pending',   icon: '⏳' },
  approved:  { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0', label: 'Approved',  icon: '✅' },
  rejected:  { bg: '#fef2f2', color: '#dc2626', border: '#fecaca', label: 'Rejected',  icon: '❌' },
  cancelled: { bg: '#f8fafc', color: '#94a3b8', border: '#e2e8f0', label: 'Cancelled', icon: '🚫' },
}

const inp: React.CSSProperties = {
  width: '100%', padding: '8px 12px', border: '1.5px solid #e2e8f0',
  borderRadius: 8, fontSize: 13, background: '#f8fafc', fontFamily: 'inherit', outline: 'none',
}
const lbl: React.CSSProperties = { fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 5 }

type TabType = 'all' | 'pending' | 'approved' | 'rejected' | 'apply' | 'balance'

export default function LeavesManager({
  applications: init, leaveTypes, students, userRole, schoolId,
}: {
  applications: any[]
  leaveTypes: LeaveType[]
  students: Student[]
  userRole: string
  schoolId: string
}) {
  const [applications, setApplications] = useState<any[]>(init)
  const [tab, setTab]                   = useState<TabType>('all')
  const [processing, setProcessing]     = useState<string | null>(null)
  const [remarkMap, setRemarkMap]       = useState<Record<string, string>>({})
  const [showRemark, setShowRemark]     = useState<string | null>(null)
  const [saving, setSaving]             = useState(false)
  const [error, setError]               = useState('')
  const [balances, setBalances]         = useState<any[]>([])
  const [balStudent, setBalStudent]     = useState('')
  const [loadingBal, setLoadingBal]     = useState(false)
  const [filterSearch, setSearch]       = useState('')

  // Apply form state
  const [applyForm, setApplyForm] = useState({
    student_id: '', leave_type_id: '', from_date: '', to_date: '', reason: '',
  })

  const today = new Date().toISOString().split('T')[0]

  // Filtered applications
  const filtered = applications.filter(a => {
    const matchTab    = tab === 'all' || tab === 'apply' || tab === 'balance' || a.status === tab
    const q           = filterSearch.toLowerCase()
    const matchSearch = !q ||
      a.student?.full_name?.toLowerCase().includes(q) ||
      a.student?.roll_number?.includes(q) ||
      a.leave_type?.name?.toLowerCase().includes(q)
    return matchTab && matchSearch
  })

  // Stats
  const pending   = applications.filter(a => a.status === 'pending').length
  const approved  = applications.filter(a => a.status === 'approved').length
  const rejected  = applications.filter(a => a.status === 'rejected').length

  // Calc total days between dates
  function calcDays(from: string, to: string) {
    if (!from || !to) return 0
    const diff = new Date(to).getTime() - new Date(from).getTime()
    return Math.max(1, Math.ceil(diff / 86400000) + 1)
  }

  async function handleAction(id: string, status: 'approved' | 'rejected') {
    setProcessing(id)
    const res = await fetch(`/api/leaves/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, remarks: remarkMap[id] ?? '' }),
    })
    if (res.ok) {
      const data = await res.json()
      setApplications(p => p.map(a => a.id === id ? data : a))
      setShowRemark(null)
    }
    setProcessing(null)
  }

  async function handleCancel(id: string) {
    if (!confirm('Cancel this leave application?')) return
    setProcessing(id)
    const res = await fetch(`/api/leaves/${id}`, { method: 'DELETE' })
    if (res.ok) setApplications(p => p.map(a => a.id === id ? { ...a, status: 'cancelled' } : a))
    setProcessing(null)
  }

  async function handleApply(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError('')
    const res = await fetch('/api/leaves', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(applyForm),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setSaving(false); return }
    setApplications(p => [data, ...p])
    setApplyForm({ student_id: '', leave_type_id: '', from_date: '', to_date: '', reason: '' })
    setTab('pending')
    setSaving(false)
  }

  async function loadBalance(studentId: string) {
    if (!studentId) return
    setLoadingBal(true)
    const res = await fetch(`/api/leaves/balance?student_id=${studentId}`)
    if (res.ok) setBalances(await res.json())
    setLoadingBal(false)
  }

  const totalDays = calcDays(applyForm.from_date, applyForm.to_date)

  const TABS: { key: TabType; label: string; count?: number }[] = [
    { key: 'all',      label: 'All Applications', count: applications.length },
    { key: 'pending',  label: 'Pending',           count: pending },
    { key: 'approved', label: 'Approved',           count: approved },
    { key: 'rejected', label: 'Rejected',           count: rejected },
    { key: 'apply',    label: '+ Apply Leave' },
    { key: 'balance',  label: '📊 Leave Balance' },
  ]

  return (
    <div style={{ padding: '2rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Leave Management</h1>
        <p style={{ color: '#64748b', fontSize: 13, marginTop: 3 }}>{applications.length} total applications</p>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total',     value: applications.length, color: '#4f46e5' },
          { label: 'Pending',   value: pending,             color: '#d97706' },
          { label: 'Approved',  value: approved,            color: '#16a34a' },
          { label: 'Rejected',  value: rejected,            color: '#dc2626' },
        ].map((s, i) => (
          <div key={i} className="card" style={{ padding: '1rem' }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 6px' }}>{s.label}</p>
            <p style={{ fontSize: '1.6rem', fontWeight: 700, color: s.color, margin: 0 }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '7px 14px', borderRadius: 20, fontSize: 13, border: 'none',
            fontWeight: tab === t.key ? 600 : 400, cursor: 'pointer', fontFamily: 'inherit',
            background: tab === t.key ? '#4f46e5' : 'white',
            color: tab === t.key ? 'white' : '#475569',
            boxShadow: tab === t.key ? 'none' : '0 1px 2px rgba(0,0,0,0.06)',
          }}>
            {t.label}{t.count !== undefined ? ` (${t.count})` : ''}
          </button>
        ))}
      </div>

      {/* ── Apply Leave Form ── */}
      {tab === 'apply' && (
        <div className="card" style={{ padding: '1.75rem', maxWidth: 560 }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a', margin: '0 0 1.25rem' }}>New Leave Application</h2>
          {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', color: '#dc2626', fontSize: 13, marginBottom: '1rem' }}>⚠ {error}</div>}
          <form onSubmit={handleApply}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={lbl}>Student *</label>
                <select required style={inp} value={applyForm.student_id}
                  onChange={e => setApplyForm(f => ({ ...f, student_id: e.target.value }))}>
                  <option value="">Select student…</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.full_name} — {s.class_name}-{s.section} (#{s.roll_number})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ gridColumn: '1/-1' }}>
                <label style={lbl}>Leave Type *</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 8 }}>
                  {leaveTypes.map(lt => (
                    <button key={lt.id} type="button"
                      onClick={() => setApplyForm(f => ({ ...f, leave_type_id: lt.id }))}
                      style={{
                        padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                        border: `2px solid ${applyForm.leave_type_id === lt.id ? lt.color : '#e2e8f0'}`,
                        background: applyForm.leave_type_id === lt.id ? lt.color + '15' : 'white',
                        fontFamily: 'inherit', textAlign: 'left',
                      }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: lt.color, margin: 0 }}>{lt.name}</p>
                      <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0' }}>Max {lt.max_days} days</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={lbl}>From Date *</label>
                <input required type="date" style={inp} min={today} value={applyForm.from_date}
                  onChange={e => setApplyForm(f => ({ ...f, from_date: e.target.value }))} />
              </div>
              <div>
                <label style={lbl}>To Date *</label>
                <input required type="date" style={inp} min={applyForm.from_date || today} value={applyForm.to_date}
                  onChange={e => setApplyForm(f => ({ ...f, to_date: e.target.value }))} />
              </div>

              {applyForm.from_date && applyForm.to_date && (
                <div style={{ gridColumn: '1/-1' }}>
                  <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#0284c7' }}>
                    📅 <strong>{totalDays} day{totalDays !== 1 ? 's' : ''}</strong> of leave requested
                    ({new Date(applyForm.from_date + 'T12:00:00').toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}
                    {' → '}
                    {new Date(applyForm.to_date + 'T12:00:00').toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })})
                  </div>
                </div>
              )}

              <div style={{ gridColumn: '1/-1' }}>
                <label style={lbl}>Reason *</label>
                <textarea required rows={3} style={{ ...inp, resize: 'none' } as React.CSSProperties}
                  placeholder="Explain the reason for leave…"
                  value={applyForm.reason}
                  onChange={e => setApplyForm(f => ({ ...f, reason: e.target.value }))} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: '1.25rem' }}>
              <button type="button" onClick={() => setTab('all')} style={{ flex: 1, padding: 10, border: '1px solid #e2e8f0', borderRadius: 8, background: 'white', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>Cancel</button>
              <button type="submit" disabled={saving} style={{ flex: 2, padding: 10, background: saving ? '#a5b4fc' : '#4f46e5', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                {saving ? 'Submitting…' : 'Submit Application'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Leave Balance View ── */}
      {tab === 'balance' && (
        <div>
          <div className="card" style={{ padding: '1.25rem', marginBottom: '1.25rem', maxWidth: 500 }}>
            <label style={lbl}>Select student to view leave balance</label>
            <select style={inp} value={balStudent}
              onChange={e => { setBalStudent(e.target.value); loadBalance(e.target.value) }}>
              <option value="">Choose student…</option>
              {students.map(s => (
                <option key={s.id} value={s.id}>
                  {s.full_name} — {s.class_name}-{s.section} (#{s.roll_number})
                </option>
              ))}
            </select>
          </div>

          {loadingBal && <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>Loading balance…</div>}

          {!loadingBal && balStudent && balances.length === 0 && (
            <div className="card" style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
              No leave balance records found for this student.
            </div>
          )}

          {balances.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 }}>
              {balances.map(b => {
                const used      = b.used_days
                const allowed   = b.total_allowed
                const remaining = allowed - used
                const pct       = Math.round((used / allowed) * 100)
                const barColor  = pct >= 90 ? '#dc2626' : pct >= 60 ? '#d97706' : '#16a34a'
                const lt        = b.leave_type

                return (
                  <div key={b.id} className="card" style={{ padding: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 600, color: lt?.color ?? '#4f46e5', margin: 0 }}>{lt?.name ?? 'Leave'}</p>
                        <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0' }}>{lt?.description}</p>
                      </div>
                      <span style={{ fontSize: 20, fontWeight: 700, color: remaining > 0 ? '#16a34a' : '#dc2626' }}>
                        {remaining}
                      </span>
                    </div>
                    {/* Progress bar */}
                    <div style={{ height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden', marginBottom: 8 }}>
                      <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: barColor, borderRadius: 3, transition: 'width 0.4s' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748b' }}>
                      <span>Used: <strong>{used}</strong></span>
                      <span>Allowed: <strong>{allowed}</strong></span>
                      <span style={{ color: remaining > 0 ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                        {remaining > 0 ? `${remaining} left` : 'Exhausted'}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Applications List ── */}
      {tab !== 'apply' && tab !== 'balance' && (
        <>
          {/* Search */}
          <div style={{ marginBottom: '1rem' }}>
            <input placeholder="Search student name, roll no, leave type…" value={filterSearch}
              onChange={e => setSearch(e.target.value)}
              style={{ ...inp, width: 300 }} />
          </div>

          {filtered.length === 0
            ? <div className="card" style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                No {tab !== 'all' ? tab : ''} applications found.
              </div>
            : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filtered.map(app => {
                const cfg = STATUS_CFG[app.status] ?? STATUS_CFG.pending
                const isPending = app.status === 'pending'
                const days = app.total_days
                const fromDate = new Date(app.from_date + 'T12:00:00').toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })
                const toDate   = new Date(app.to_date   + 'T12:00:00').toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })

                return (
                  <div key={app.id} className="card" style={{ padding: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>

                      {/* Left: student + details */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                          {/* Status badge */}
                          <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
                            {cfg.icon} {cfg.label}
                          </span>
                          {/* Leave type badge */}
                          <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: (app.leave_type?.color ?? '#4f46e5') + '15', color: app.leave_type?.color ?? '#4f46e5' }}>
                            {app.leave_type?.name ?? 'Leave'}
                          </span>
                          <span style={{ fontSize: 11, color: '#94a3b8' }}>
                            {days} day{days !== 1 ? 's' : ''} • {fromDate}{days > 1 ? ` → ${toDate}` : ''}
                          </span>
                        </div>

                        <p style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', margin: '0 0 2px' }}>
                          {app.student?.full_name ?? '—'}
                        </p>
                        <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 8px' }}>
                          {app.student?.class_name} — Section {app.student?.section} · #{app.student?.roll_number}
                        </p>

                        <div style={{ background: '#f8fafc', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#475569', marginBottom: app.remarks ? 6 : 0 }}>
                          <strong>Reason:</strong> {app.reason}
                        </div>

                        {app.remarks && (
                          <div style={{ background: '#eff6ff', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#1d4ed8', marginTop: 6 }}>
                            <strong>Admin remarks:</strong> {app.remarks}
                          </div>
                        )}

                        <p style={{ fontSize: 11, color: '#94a3b8', margin: '6px 0 0' }}>
                          Applied: {new Date(app.created_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
                          {app.reviewed_at && ` · Reviewed: ${new Date(app.reviewed_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}`}
                        </p>
                      </div>

                      {/* Right: action buttons (admin only, pending only) */}
                      {isPending && (userRole === 'principal' || userRole === 'admin') && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                          {/* Remark input */}
                          {showRemark === app.id && (
                            <input
                              style={{ ...inp, width: 220, marginBottom: 4 }}
                              placeholder="Add remarks (optional)"
                              value={remarkMap[app.id] ?? ''}
                              onChange={e => setRemarkMap(p => ({ ...p, [app.id]: e.target.value }))}
                            />
                          )}
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              onClick={() => setShowRemark(showRemark === app.id ? null : app.id)}
                              style={{ padding: '6px 12px', border: '1px solid #e2e8f0', borderRadius: 6, background: 'white', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit', color: '#475569' }}>
                              {showRemark === app.id ? 'Hide' : '✏ Remark'}
                            </button>
                            <button
                              onClick={() => handleAction(app.id, 'approved')}
                              disabled={processing === app.id}
                              style={{ padding: '6px 14px', border: '1px solid #bbf7d0', borderRadius: 6, background: '#f0fdf4', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit', color: '#16a34a', fontWeight: 600 }}>
                              {processing === app.id ? '…' : '✓ Approve'}
                            </button>
                            <button
                              onClick={() => handleAction(app.id, 'rejected')}
                              disabled={processing === app.id}
                              style={{ padding: '6px 14px', border: '1px solid #fecaca', borderRadius: 6, background: '#fef2f2', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit', color: '#dc2626', fontWeight: 600 }}>
                              {processing === app.id ? '…' : '✗ Reject'}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Cancel button for pending */}
                      {isPending && userRole === 'teacher' && (
                        <button onClick={() => handleCancel(app.id)} disabled={processing === app.id}
                          style={{ padding: '6px 14px', border: '1px solid #fecaca', borderRadius: 6, background: '#fef2f2', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit', color: '#dc2626' }}>
                          {processing === app.id ? '…' : 'Cancel'}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          }
        </>
      )}
    </div>
  )
}
