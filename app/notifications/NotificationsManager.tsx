'use client'
import { useState } from 'react'
import type { NotificationLog, NotificationTemplate } from '@/types'

interface Student { id: string; full_name: string; roll_number: string; class_name: string; section: string; parent_name: string; parent_phone: string; fee_status?: string }
interface ClassOption { id: string; name: string; section: string }

type TabType = 'quick' | 'bulk' | 'custom' | 'logs' | 'templates'

const TYPE_CFG: Record<string, { label: string; icon: string; color: string; bg: string }> = {
  attendance:   { label: 'Attendance', icon: '📋', color: '#dc2626', bg: '#fef2f2' },
  fee:          { label: 'Fee',        icon: '💰', color: '#d97706', bg: '#fffbeb' },
  exam:         { label: 'Exam',       icon: '📝', color: '#7c3aed', bg: '#f5f3ff' },
  leave:        { label: 'Leave',      icon: '🏖️', color: '#0284c7', bg: '#f0f9ff' },
  announcement: { label: 'Notice',     icon: '📢', color: '#16a34a', bg: '#f0fdf4' },
  custom:       { label: 'Custom',     icon: '✏️', color: '#475569', bg: '#f8fafc' },
}

const STATUS_CFG: Record<string, { color: string; bg: string; icon: string }> = {
  sent:    { color: '#16a34a', bg: '#f0fdf4', icon: '✅' },
  failed:  { color: '#dc2626', bg: '#fef2f2', icon: '❌' },
  pending: { color: '#d97706', bg: '#fffbeb', icon: '⏳' },
}

const inp: React.CSSProperties = {
  width: '100%', padding: '8px 12px', border: '1.5px solid #e2e8f0',
  borderRadius: 8, fontSize: 13, background: '#f8fafc', fontFamily: 'inherit', outline: 'none',
}
const lbl: React.CSSProperties = { fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 5 }

export default function NotificationsManager({
  logs: initLogs, templates, students, classes,
  schoolName, pendingFeeStudents, absentToday, schoolId,
}: {
  logs: any[]
  templates: NotificationTemplate[]
  students: Student[]
  classes: ClassOption[]
  schoolName: string
  pendingFeeStudents: any[]
  absentToday: any[]
  schoolId: string
}) {
  const [logs, setLogs]             = useState<any[]>(initLogs)
  const [tab, setTab]               = useState<TabType>('quick')
  const [sending, setSending]       = useState(false)
  const [bulkSending, setBulkSending] = useState(false)
  const [result, setResult]         = useState<{ sent: number; failed: number } | null>(null)
  const [error, setError]           = useState('')
  const [filterType, setFilterType] = useState('')
  const [search, setSearch]         = useState('')

  // Quick send form
  const [quickForm, setQuickForm] = useState({
    student_id: '', type: 'attendance', channel: 'whatsapp' as 'whatsapp' | 'sms' | 'both',
  })

  // Bulk form
  const [bulkForm, setBulkForm] = useState({
    type: 'announcement', channel: 'whatsapp' as 'whatsapp' | 'sms' | 'both',
    class_name: '', section: '', custom_message: '',
    target: 'class' as 'class' | 'absent' | 'pending_fees' | 'all',
  })

  // Custom message form
  const [customForm, setCustomForm] = useState({
    student_id: '', channel: 'whatsapp' as 'whatsapp' | 'sms' | 'both', message: '',
  })

  // Template edit
  const [editingTpl, setEditingTpl] = useState<string | null>(null)
  const [tplMessage, setTplMessage] = useState('')

  const sentToday   = logs.filter(l => l.sent_at && new Date(l.sent_at).toDateString() === new Date().toDateString()).length
  const totalSent   = logs.filter(l => l.status === 'sent').length
  const totalFailed = logs.filter(l => l.status === 'failed').length

  const filteredLogs = logs.filter(l => {
    const q = search.toLowerCase()
    return (!filterType || l.type === filterType) &&
      (!q || l.student?.full_name?.toLowerCase().includes(q) || l.recipient.includes(q) || l.message.toLowerCase().includes(q))
  })

  async function handleQuickSend() {
    if (!quickForm.student_id) { setError('Please select a student'); return }
    setSending(true); setError(''); setResult(null)
    const res = await fetch('/api/notifications/send', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(quickForm),
    })
    const data = await res.json()
    if (res.ok && data.success) {
      setResult({ sent: 1, failed: 0 })
      if (data.log) setLogs(p => [data.log, ...p])
    } else {
      setError(data.error ?? 'Failed to send')
    }
    setSending(false)
  }

  async function handleBulkSend() {
    setBulkSending(true); setError(''); setResult(null)

    let studentIds: string[] | undefined
    let className: string | undefined
    let section: string | undefined

    if (bulkForm.target === 'absent') {
      studentIds = absentToday.map((s: any) => s.id)
      if (!studentIds.length) { setError('No absent students today'); setBulkSending(false); return }
    } else if (bulkForm.target === 'pending_fees') {
      studentIds = pendingFeeStudents.map((s: any) => s.id)
      if (!studentIds.length) { setError('No students with pending fees'); setBulkSending(false); return }
    } else if (bulkForm.target === 'class') {
      className = bulkForm.class_name
      section   = bulkForm.section
    }
    // 'all' = no filter

    const res = await fetch('/api/notifications/bulk', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: bulkForm.type, channel: bulkForm.channel,
        class_name: className, section,
        student_ids: studentIds,
        custom_message: bulkForm.custom_message || undefined,
      }),
    })
    const data = await res.json()
    if (res.ok) {
      setResult({ sent: data.sent, failed: data.failed })
      if (data.logs?.length) setLogs(p => [...data.logs, ...p])
    } else {
      setError(data.error ?? 'Failed to send bulk notifications')
    }
    setBulkSending(false)
  }

  async function handleCustomSend() {
    if (!customForm.student_id || !customForm.message) { setError('Fill in all fields'); return }
    setSending(true); setError(''); setResult(null)

    const student = students.find(s => s.id === customForm.student_id)
    if (!student) { setSending(false); return }

    const res = await fetch('/api/notifications/send', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        student_id: customForm.student_id,
        type: 'custom', channel: customForm.channel,
        custom_message: customForm.message,
      }),
    })
    const data = await res.json()
    if (res.ok && data.success) {
      setResult({ sent: 1, failed: 0 })
      if (data.log) setLogs(p => [data.log, ...p])
      setCustomForm(f => ({ ...f, message: '' }))
    } else {
      setError(data.error ?? 'Failed to send')
    }
    setSending(false)
  }

  function getPreview(type: string, student?: Student): string {
    const tpl = templates.find(t => t.type === type)
    if (!tpl || !student) return 'Select a student to preview message...'
    return tpl.message
      .replace('{{parent_name}}',  student.parent_name)
      .replace('{{student_name}}', student.full_name)
      .replace('{{roll_number}}',  student.roll_number)
      .replace('{{class_name}}',   `${student.class_name}-${student.section}`)
      .replace('{{school_name}}',  schoolName)
      .replace('{{date}}',         new Date().toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' }))
      .replace('{{status}}',       'approved')
      .replace('{{amount}}',       '3,500')
      .replace('{{percentage}}',   '85')
      .replace('{{grade}}',        'A')
      .replace('{{exam_title}}',   'Mid Term Exam')
      .replace('{{rank}}',         '2')
      .replace('{{total_students}}','30')
  }

  const quickStudent = students.find(s => s.id === quickForm.student_id)
  const customStudent = students.find(s => s.id === customForm.student_id)

  const TABS: { key: TabType; label: string; icon: string }[] = [
    { key: 'quick',     label: 'Quick Send',  icon: '⚡' },
    { key: 'bulk',      label: 'Bulk Send',   icon: '📢' },
    { key: 'custom',    label: 'Custom Msg',  icon: '✏️' },
    { key: 'logs',      label: `Logs (${logs.length})`, icon: '📋' },
    { key: 'templates', label: 'Templates',   icon: '📄' },
  ]

  return (
    <div style={{ padding: '2rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
          📱 WhatsApp & SMS Alerts
        </h1>
        <p style={{ color: '#64748b', fontSize: 13, marginTop: 3 }}>
          Auto-notify parents via WhatsApp or SMS
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Sent Today',      value: sentToday,                     color: '#4f46e5' },
          { label: 'Total Sent',      value: totalSent,                     color: '#16a34a' },
          { label: 'Failed',          value: totalFailed,                   color: '#dc2626' },
          { label: 'Absent Today',    value: absentToday.length,            color: '#d97706' },
          { label: 'Pending Fees',    value: pendingFeeStudents.length,     color: '#ea580c' },
          { label: 'Templates',       value: templates.length,              color: '#0284c7' },
        ].map((s, i) => (
          <div key={i} className="card" style={{ padding: '1rem' }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 6px' }}>{s.label}</p>
            <p style={{ fontSize: '1.6rem', fontWeight: 700, color: s.color, margin: 0 }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Quick action banners */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 12, marginBottom: '1.5rem' }}>
        {absentToday.length > 0 && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#dc2626', margin: 0 }}>
                📋 {absentToday.length} student{absentToday.length !== 1 ? 's' : ''} absent today
              </p>
              <p style={{ fontSize: 12, color: '#94a3b8', margin: '2px 0 0' }}>Notify all parents now</p>
            </div>
            <button onClick={() => { setBulkForm(f => ({ ...f, target: 'absent', type: 'attendance' })); setTab('bulk') }}
              style={{ padding: '7px 14px', background: '#dc2626', color: 'white', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
              Notify Now
            </button>
          </div>
        )}
        {pendingFeeStudents.length > 0 && (
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#d97706', margin: 0 }}>
                💰 {pendingFeeStudents.length} student{pendingFeeStudents.length !== 1 ? 's' : ''} with pending fees
              </p>
              <p style={{ fontSize: 12, color: '#94a3b8', margin: '2px 0 0' }}>Send fee reminders</p>
            </div>
            <button onClick={() => { setBulkForm(f => ({ ...f, target: 'pending_fees', type: 'fee' })); setTab('bulk') }}
              style={{ padding: '7px 14px', background: '#d97706', color: 'white', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
              Send Reminders
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); setResult(null); setError('') }} style={{
            padding: '7px 14px', borderRadius: 20, fontSize: 13, border: 'none',
            fontWeight: tab === t.key ? 600 : 400, cursor: 'pointer', fontFamily: 'inherit',
            background: tab === t.key ? '#4f46e5' : 'white',
            color: tab === t.key ? 'white' : '#475569',
            boxShadow: tab === t.key ? 'none' : '0 1px 2px rgba(0,0,0,0.06)',
          }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Result banner */}
      {result && (
        <div style={{ background: result.failed === 0 ? '#f0fdf4' : '#fffbeb', border: `1px solid ${result.failed === 0 ? '#bbf7d0' : '#fde68a'}`, borderRadius: 10, padding: '12px 16px', marginBottom: '1.25rem', fontSize: 13, color: result.failed === 0 ? '#16a34a' : '#d97706', fontWeight: 500 }}>
          {result.failed === 0
            ? `✅ ${result.sent} notification${result.sent !== 1 ? 's' : ''} sent successfully via WhatsApp/SMS!`
            : `⚠ ${result.sent} sent, ${result.failed} failed — check logs for details`}
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', color: '#dc2626', fontSize: 13, marginBottom: '1rem' }}>
          ⚠ {error}
        </div>
      )}

      {/* ── QUICK SEND ── */}
      {tab === 'quick' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
          <div className="card" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a', margin: '0 0 1.25rem' }}>Send to Single Student</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <div>
                <label style={lbl}>Student *</label>
                <select style={inp} value={quickForm.student_id}
                  onChange={e => setQuickForm(f => ({ ...f, student_id: e.target.value }))}>
                  <option value="">Select student…</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.full_name} — {s.class_name} #{s.roll_number}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Notification Type</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {Object.entries(TYPE_CFG).filter(([k]) => k !== 'custom').map(([type, cfg]) => (
                    <button key={type} type="button"
                      onClick={() => setQuickForm(f => ({ ...f, type }))}
                      style={{
                        padding: '8px 10px', borderRadius: 8, cursor: 'pointer', border: `2px solid ${quickForm.type === type ? cfg.color : '#e2e8f0'}`,
                        background: quickForm.type === type ? cfg.bg : 'white', fontFamily: 'inherit', textAlign: 'left',
                      }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: quickForm.type === type ? cfg.color : '#475569' }}>
                        {cfg.icon} {cfg.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={lbl}>Send via</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['whatsapp', 'sms', 'both'] as const).map(ch => (
                    <button key={ch} onClick={() => setQuickForm(f => ({ ...f, channel: ch }))}
                      style={{
                        flex: 1, padding: '8px', borderRadius: 8, cursor: 'pointer', border: `2px solid ${quickForm.channel === ch ? '#4f46e5' : '#e2e8f0'}`,
                        background: quickForm.channel === ch ? '#eef2ff' : 'white', fontFamily: 'inherit',
                        fontSize: 12, fontWeight: quickForm.channel === ch ? 600 : 400, color: quickForm.channel === ch ? '#4f46e5' : '#475569',
                      }}>
                      {ch === 'whatsapp' ? '💬 WhatsApp' : ch === 'sms' ? '📱 SMS' : '📲 Both'}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={handleQuickSend} disabled={sending || !quickForm.student_id}
                style={{ padding: '11px', background: sending ? '#a5b4fc' : '#4f46e5', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: sending ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                {sending ? '⏳ Sending…' : '📤 Send Notification'}
              </button>
            </div>
          </div>

          {/* Preview */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a', margin: '0 0 1rem' }}>Message Preview</h2>
            {quickStudent && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 12px', marginBottom: 12 }}>
                <p style={{ fontSize: 12, color: '#16a34a', margin: 0, fontWeight: 500 }}>
                  📱 To: {quickStudent.parent_name} ({quickStudent.parent_phone})
                </p>
              </div>
            )}
            <div style={{ background: '#f8fafc', borderRadius: 10, padding: '14px', border: '1px solid #e2e8f0', position: 'relative' }}>
              <div style={{ background: '#25D366', borderRadius: 8, padding: '10px 14px', color: 'white', fontSize: 13, lineHeight: 1.6, maxWidth: '85%', marginLeft: 'auto' }}>
                {getPreview(quickForm.type, quickStudent)}
              </div>
              <p style={{ fontSize: 11, color: '#94a3b8', margin: '8px 0 0', textAlign: 'right' }}>
                {quickForm.channel === 'whatsapp' ? '💬 WhatsApp' : quickForm.channel === 'sms' ? '📱 SMS' : '📲 Both'}
              </p>
            </div>
            <div style={{ marginTop: 12, padding: '12px 14px', background: '#fffbeb', borderRadius: 8, border: '1px solid #fde68a' }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#d97706', margin: '0 0 6px' }}>
                ⚠️ Parent must join sandbox first
              </p>
              <p style={{ fontSize: 12, color: '#92400e', margin: '0 0 6px', lineHeight: 1.6 }}>
                Ask the parent to open WhatsApp and send this message to <strong>+1 415 523 8886</strong>:
              </p>
              <div style={{ background: '#25D366', borderRadius: 6, padding: '8px 12px', color: 'white', fontSize: 13, fontWeight: 700, fontFamily: 'monospace', marginBottom: 6 }}>
                join &lt;your-sandbox-code&gt;
              </div>
              <p style={{ fontSize: 11, color: '#92400e', margin: 0 }}>
                Find your exact code at: <strong>console.twilio.com → Messaging → Try it → WhatsApp</strong>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── BULK SEND ── */}
      {tab === 'bulk' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
          <div className="card" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a', margin: '0 0 1.25rem' }}>Bulk Notification</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              {/* Target */}
              <div>
                <label style={lbl}>Send To</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {[
                    { key: 'absent',       label: `Absent Today (${absentToday.length})`,          color: '#dc2626' },
                    { key: 'pending_fees', label: `Pending Fees (${pendingFeeStudents.length})`,   color: '#d97706' },
                    { key: 'class',        label: 'Specific Class',                                color: '#4f46e5' },
                    { key: 'all',          label: `All Students (${students.length})`,             color: '#0284c7' },
                  ].map(t => (
                    <button key={t.key} onClick={() => setBulkForm(f => ({ ...f, target: t.key as any }))}
                      style={{
                        padding: '9px 10px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
                        border: `2px solid ${bulkForm.target === t.key ? t.color : '#e2e8f0'}`,
                        background: bulkForm.target === t.key ? t.color + '15' : 'white',
                        fontSize: 12, fontWeight: bulkForm.target === t.key ? 600 : 400,
                        color: bulkForm.target === t.key ? t.color : '#475569',
                      }}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Class filter */}
              {bulkForm.target === 'class' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>
                    <label style={lbl}>Class</label>
                    <select style={inp} value={bulkForm.class_name}
                      onChange={e => setBulkForm(f => ({ ...f, class_name: e.target.value }))}>
                      <option value="">All classes</option>
                      {[...new Set(classes.map(c => c.name))].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={lbl}>Section</label>
                    <select style={inp} value={bulkForm.section}
                      onChange={e => setBulkForm(f => ({ ...f, section: e.target.value }))}>
                      <option value="">All sections</option>
                      {['A','B','C','D'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
              )}

              {/* Type */}
              <div>
                <label style={lbl}>Notification Type</label>
                <select style={inp} value={bulkForm.type}
                  onChange={e => setBulkForm(f => ({ ...f, type: e.target.value }))}>
                  {Object.entries(TYPE_CFG).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
                </select>
              </div>

              {/* Channel */}
              <div>
                <label style={lbl}>Send via</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['whatsapp', 'sms', 'both'] as const).map(ch => (
                    <button key={ch} onClick={() => setBulkForm(f => ({ ...f, channel: ch }))}
                      style={{
                        flex: 1, padding: '8px', borderRadius: 8, cursor: 'pointer', border: `2px solid ${bulkForm.channel === ch ? '#4f46e5' : '#e2e8f0'}`,
                        background: bulkForm.channel === ch ? '#eef2ff' : 'white', fontFamily: 'inherit',
                        fontSize: 12, fontWeight: bulkForm.channel === ch ? 600 : 400, color: bulkForm.channel === ch ? '#4f46e5' : '#475569',
                      }}>
                      {ch === 'whatsapp' ? '💬' : ch === 'sms' ? '📱' : '📲'} {ch.charAt(0).toUpperCase() + ch.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom message override */}
              <div>
                <label style={lbl}>Custom Message (optional — overrides template)</label>
                <textarea rows={3} style={{ ...inp, resize: 'none' } as React.CSSProperties}
                  placeholder="Leave blank to use the default template…"
                  value={bulkForm.custom_message}
                  onChange={e => setBulkForm(f => ({ ...f, custom_message: e.target.value }))} />
              </div>

              <button onClick={handleBulkSend} disabled={bulkSending}
                style={{ padding: '11px', background: bulkSending ? '#a5b4fc' : '#4f46e5', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: bulkSending ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                {bulkSending ? '⏳ Sending…' : '📢 Send Bulk Notification'}
              </button>
            </div>
          </div>

          {/* Bulk preview */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a', margin: '0 0 1rem' }}>Bulk Summary</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'Recipients',   value: bulkForm.target === 'absent' ? absentToday.length : bulkForm.target === 'pending_fees' ? pendingFeeStudents.length : bulkForm.target === 'all' ? students.length : students.filter(s => (!bulkForm.class_name || s.class_name === bulkForm.class_name) && (!bulkForm.section || s.section === bulkForm.section)).length },
                { label: 'Channel',      value: bulkForm.channel === 'both' ? 'WhatsApp + SMS' : bulkForm.channel === 'whatsapp' ? 'WhatsApp' : 'SMS' },
                { label: 'Type',         value: TYPE_CFG[bulkForm.type]?.label ?? bulkForm.type },
              ].map(r => (
                <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: '#f8fafc', borderRadius: 8 }}>
                  <span style={{ fontSize: 13, color: '#64748b' }}>{r.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{r.value}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 14, background: '#f8fafc', borderRadius: 10, padding: '12px 14px', border: '1px solid #e2e8f0' }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#64748b', margin: '0 0 6px', textTransform: 'uppercase' }}>Template preview</p>
              <div style={{ background: '#25D366', borderRadius: 8, padding: '10px 14px', color: 'white', fontSize: 12, lineHeight: 1.6 }}>
                {bulkForm.custom_message || (templates.find(t => t.type === bulkForm.type)?.message?.slice(0, 200) ?? 'Select a type to preview...')}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── CUSTOM MESSAGE ── */}
      {tab === 'custom' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
          <div className="card" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a', margin: '0 0 1.25rem' }}>Send Custom Message</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <div>
                <label style={lbl}>Student *</label>
                <select style={inp} value={customForm.student_id}
                  onChange={e => setCustomForm(f => ({ ...f, student_id: e.target.value }))}>
                  <option value="">Select student…</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.full_name} — {s.class_name} #{s.roll_number}</option>)}
                </select>
              </div>
              {customStudent && (
                <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: '#0284c7' }}>
                  📱 Parent: <strong>{customStudent.parent_name}</strong> · {customStudent.parent_phone}
                </div>
              )}
              <div>
                <label style={lbl}>Channel</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['whatsapp', 'sms', 'both'] as const).map(ch => (
                    <button key={ch} onClick={() => setCustomForm(f => ({ ...f, channel: ch }))}
                      style={{
                        flex: 1, padding: '8px', borderRadius: 8, cursor: 'pointer', border: `2px solid ${customForm.channel === ch ? '#4f46e5' : '#e2e8f0'}`,
                        background: customForm.channel === ch ? '#eef2ff' : 'white', fontFamily: 'inherit',
                        fontSize: 12, fontWeight: customForm.channel === ch ? 600 : 400, color: customForm.channel === ch ? '#4f46e5' : '#475569',
                      }}>
                      {ch === 'whatsapp' ? '💬' : ch === 'sms' ? '📱' : '📲'} {ch.charAt(0).toUpperCase() + ch.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={lbl}>Message *</label>
                <textarea rows={5} style={{ ...inp, resize: 'none' } as React.CSSProperties}
                  placeholder="Type your message here…"
                  value={customForm.message}
                  onChange={e => setCustomForm(f => ({ ...f, message: e.target.value }))} />
                <p style={{ fontSize: 11, color: '#94a3b8', margin: '4px 0 0' }}>{customForm.message.length} characters</p>
              </div>
              <button onClick={handleCustomSend} disabled={sending || !customForm.student_id || !customForm.message}
                style={{ padding: '11px', background: sending ? '#a5b4fc' : '#4f46e5', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: sending ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                {sending ? '⏳ Sending…' : '📤 Send Message'}
              </button>
            </div>
          </div>
          {/* Live preview */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a', margin: '0 0 1rem' }}>Live Preview</h2>
            <div style={{ background: '#f8fafc', borderRadius: 10, padding: '14px', border: '1px solid #e2e8f0', minHeight: 120 }}>
              {customForm.message
                ? <div style={{ background: '#25D366', borderRadius: 8, padding: '10px 14px', color: 'white', fontSize: 13, lineHeight: 1.6, maxWidth: '85%', marginLeft: 'auto' }}>
                    {customForm.message}
                  </div>
                : <p style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', marginTop: 20 }}>Type a message to preview...</p>
              }
            </div>
          </div>
        </div>
      )}

      {/* ── LOGS ── */}
      {tab === 'logs' && (
        <>
          <div style={{ display: 'flex', gap: 10, marginBottom: '1.25rem', flexWrap: 'wrap' }}>
            <input placeholder="Search student, message, phone…" value={search}
              onChange={e => setSearch(e.target.value)} style={{ ...inp, width: 260 }} />
            <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ ...inp, width: 'auto' }}>
              <option value="">All types</option>
              {Object.entries(TYPE_CFG).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
            </select>
          </div>
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    {['Status','Type','Student','Channel','Recipient','Message','Time'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: 12, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.length === 0
                    ? <tr><td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>No notification logs found.</td></tr>
                    : filteredLogs.map((log, i) => {
                      const sc  = STATUS_CFG[log.status] ?? STATUS_CFG.pending
                      const tc  = TYPE_CFG[log.type] ?? TYPE_CFG.custom
                      return (
                        <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 ? '#fafafa' : 'white' }}>
                          <td style={{ padding: '11px 14px' }}>
                            <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6, background: sc.bg, color: sc.color }}>
                              {sc.icon} {log.status}
                            </span>
                          </td>
                          <td style={{ padding: '11px 14px' }}>
                            <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6, background: tc.bg, color: tc.color }}>
                              {tc.icon} {tc.label}
                            </span>
                          </td>
                          <td style={{ padding: '11px 14px', fontWeight: 500, color: '#0f172a' }}>
                            {log.student?.full_name ?? '—'}
                            {log.student?.roll_number && <div style={{ fontSize: 11, color: '#94a3b8' }}>#{log.student.roll_number}</div>}
                          </td>
                          <td style={{ padding: '11px 14px', color: '#475569', textTransform: 'capitalize' }}>
                            {log.channel === 'whatsapp' ? '💬' : log.channel === 'sms' ? '📱' : '📲'} {log.channel}
                          </td>
                          <td style={{ padding: '11px 14px', color: '#475569', fontFamily: 'monospace', fontSize: 12 }}>{log.recipient}</td>
                          <td style={{ padding: '11px 14px', color: '#475569', maxWidth: 300 }}>
                            <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 260, fontSize: 12 }}>
                              {log.message}
                            </div>
                          </td>
                          <td style={{ padding: '11px 14px', color: '#94a3b8', fontSize: 12, whiteSpace: 'nowrap' }}>
                            {new Date(log.created_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}
                            {' '}
                            {new Date(log.created_at).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}
                          </td>
                        </tr>
                      )
                    })
                  }
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── TEMPLATES ── */}
      {tab === 'templates' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
            These templates are used when sending notifications. Variables like {'{{student_name}}'} are auto-replaced.
          </p>
          {templates.map(tpl => {
            const tc = TYPE_CFG[tpl.type] ?? TYPE_CFG.custom
            const isEditing = editingTpl === tpl.id
            return (
              <div key={tpl.id} className="card" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: tc.bg, color: tc.color }}>
                      {tc.icon} {tc.label}
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{tpl.name}</span>
                  </div>
                  <button onClick={() => { setEditingTpl(isEditing ? null : tpl.id); setTplMessage(tpl.message) }}
                    style={{ padding: '5px 12px', border: '1px solid #e2e8f0', borderRadius: 6, background: 'white', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit', color: '#475569' }}>
                    {isEditing ? 'Cancel' : '✏ Edit'}
                  </button>
                </div>
                {isEditing
                  ? <div>
                    <textarea rows={4} style={{ ...inp, resize: 'none', marginBottom: 8 } as React.CSSProperties}
                      value={tplMessage} onChange={e => setTplMessage(e.target.value)} />
                    <button onClick={async () => {
                      await fetch('/api/notifications', { method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: tpl.id, message: tplMessage }),
                      })
                      setEditingTpl(null)
                    }} style={{ padding: '7px 16px', background: '#4f46e5', color: 'white', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                      Save Template
                    </button>
                  </div>
                  : <p style={{ fontSize: 13, color: '#475569', margin: 0, lineHeight: 1.6, background: '#f8fafc', padding: '10px 12px', borderRadius: 8 }}>
                    {tpl.message}
                  </p>
                }
                <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {tpl.message.match(/\{\{(\w+)\}\}/g)?.map(v => (
                    <span key={v} style={{ fontSize: 11, background: '#eef2ff', color: '#4f46e5', padding: '2px 8px', borderRadius: 4, fontFamily: 'monospace' }}>{v}</span>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
