'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Student } from '@/types'
import { PLAN_LIMITS, PlanType } from '@/lib/plans'
import { Lock } from 'lucide-react'
import PromoteStudentsModal from '@/components/PromoteStudentsModal'

interface ClassOption { id: string; name: string; section: string }

const inp: React.CSSProperties = {
  width: '100%', padding: '8px 12px', border: '1.5px solid #e2e8f0',
  borderRadius: 8, fontSize: 13, background: '#f8fafc', fontFamily: 'inherit', outline: 'none',
}
const lbl: React.CSSProperties = { fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 5 }

const EMPTY = {
  full_name: '', roll_number: '', class_name: '', section: '',
  gender: 'male', date_of_birth: '', parent_name: '', parent_phone: '', parent_email: '', class_id: '',
  fee_status: 'pending',
}

export default function StudentsList({
  students: init, classes, schoolId, plan = 'free'
}: {
  students: Student[]
  classes: ClassOption[]
  schoolId: string
  plan?: string
}) {
  const [students, setStudents] = useState<Student[]>(init)
  const [search, setSearch]     = useState('')
  const [cls, setCls]           = useState('')
  const [showForm, setShowForm] = useState(false)
  const [showPromote, setShowPromote] = useState(false)
  const [editing, setEditing]   = useState<Student | null>(null)
  const [saving, setSaving]     = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError]       = useState('')
  const [form, setForm]         = useState({ ...EMPTY })
  const supabase = createClient()

  const classNames = Array.from(new Set(students.map(s => s.class_name))).sort()

  const filtered = students.filter(s => {
    const q = search.toLowerCase()
    return (!q || s.full_name.toLowerCase().includes(q) || s.roll_number.includes(q) || s.parent_name.toLowerCase().includes(q))
      && (!cls || s.class_name === cls)
  })

  const currentPlan = (plan || 'free') as PlanType
  const limit = PLAN_LIMITS[currentPlan].maxStudents
  const isAtLimit = students.length >= limit

  function openAdd() {
    if (isAtLimit) {
      alert(`Limit Reached: Your ${currentPlan} plan allows up to ${limit} students. Please upgrade to add more.`)
      return
    }
    setEditing(null); setForm({ ...EMPTY }); setError(''); setShowForm(true)
  }

  function openEdit(s: Student) {
    setEditing(s)
    setForm({
      full_name: s.full_name, roll_number: s.roll_number,
      class_name: s.class_name, section: s.section, gender: s.gender,
      date_of_birth: s.date_of_birth ?? '',
      parent_name: s.parent_name, parent_phone: s.parent_phone,
      parent_email: s.parent_email ?? '', class_id: (s as any).class_id ?? '',
      fee_status: s.fee_status,
    })
    setError(''); setShowForm(true)
  }

  function handleClassSelect(classId: string) {
    const selected = classes.find(c => c.id === classId)
    if (selected) setForm(f => ({ ...f, class_id: classId, class_name: selected.name, section: selected.section }))
    else setForm(f => ({ ...f, class_id: '', class_name: '', section: '' }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError('')
    try {
      const payload = {
        full_name: form.full_name, roll_number: form.roll_number,
        class_name: form.class_name, section: form.section, gender: form.gender,
        date_of_birth: form.date_of_birth || null,
        parent_name: form.parent_name, parent_phone: form.parent_phone,
        parent_email: form.parent_email || null, class_id: form.class_id || null,
        fee_status: form.fee_status,
      }
      if (editing) {
        const { data, error: err } = await supabase.from('students').update(payload).eq('id', editing.id).select().single()
        if (err) { setError(err.message); setSaving(false); return }
        setStudents(p => p.map(s => s.id === editing.id ? data as Student : s))
      } else {
        const { data, error: err } = await supabase.from('students')
          .insert({ ...payload, school_id: schoolId }).select().single()
        if (err) { setError(err.message); setSaving(false); return }
        setStudents(p => [...p, data as Student])
      }
      setShowForm(false)
    } catch { setError('Network error. Try again.') }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this student? This cannot be undone.')) return
    setDeleting(id)
    await supabase.from('students').update({ is_active: false }).eq('id', id)
    setStudents(p => p.filter(s => s.id !== id))
    setDeleting(null)
  }

  const feeColor = (s: string) => s === 'paid' ? '#16a34a' : s === 'overdue' ? '#dc2626' : '#d97706'
  const feeBg    = (s: string) => s === 'paid' ? '#f0fdf4' : s === 'overdue' ? '#fef2f2' : '#fffbeb'

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Students</h1>
          <p style={{ color: '#64748b', fontSize: 13, marginTop: 3 }}>{students.length} active students</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          {isAtLimit && (
            <div style={{ padding: '0.5rem 1rem', background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: 8, color: '#92400e', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Lock size={14} /> Student limit reached ({limit})
            </div>
          )}
          <button 
            onClick={() => setShowPromote(true)}
            style={{ 
              padding: '9px 18px', 
              background: 'white', 
              color: '#4f46e5', 
              border: '1px solid #c7d2fe', 
              borderRadius: 8, 
              fontSize: 13, 
              fontWeight: 600, 
              cursor: 'pointer', 
              fontFamily: 'inherit',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            ↗ Promote Students
          </button>
          <button 
            onClick={openAdd} 
            disabled={isAtLimit}
            style={{ 
              padding: '9px 18px', 
              background: isAtLimit ? '#94a3b8' : '#4f46e5', 
              color: 'white', 
              border: 'none', 
              borderRadius: 8, 
              fontSize: 13, 
              fontWeight: 600, 
              cursor: isAtLimit ? 'not-allowed' : 'pointer', 
              fontFamily: 'inherit',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            {isAtLimit ? 'Limit Reached' : '+ Add Student'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <input placeholder="Search name, roll no, parent…" value={search} onChange={e => setSearch(e.target.value)} style={{ ...inp, width: 260 }} />
        <select value={cls} onChange={e => setCls(e.target.value)} style={{ ...inp, width: 'auto' }}>
          <option value="">All classes</option>
          {classNames.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                {['Roll No','Student','Class','Parent','Phone','Fee','Actions'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: 12, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0
                ? <tr><td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>No students found.</td></tr>
                : filtered.map((s, i) => (
                  <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 ? '#fafafa' : 'white' }}>
                    <td style={{ padding: '11px 14px', fontFamily: 'monospace', color: '#6366f1', fontWeight: 500 }}>{s.roll_number}</td>
                    <td style={{ padding: '11px 14px' }}>
                      <div style={{ fontWeight: 500, color: '#0f172a' }}>{s.full_name}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'capitalize' }}>{s.gender}</div>
                    </td>
                    <td style={{ padding: '11px 14px', color: '#475569' }}>{s.class_name} – {s.section}</td>
                    <td style={{ padding: '11px 14px', color: '#475569' }}>{s.parent_name}</td>
                    <td style={{ padding: '11px 14px', color: '#475569' }}>{s.parent_phone}</td>
                    <td style={{ padding: '11px 14px' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6, textTransform: 'capitalize', background: feeBg(s.fee_status), color: feeColor(s.fee_status) }}>
                        {s.fee_status}
                      </span>
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => openEdit(s)} style={{ padding: '4px 10px', border: '1px solid #c7d2fe', borderRadius: 6, background: '#eef2ff', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit', color: '#4f46e5', whiteSpace: 'nowrap' }}>✏ Edit</button>
                        <button onClick={() => handleDelete(s.id)} disabled={deleting === s.id} style={{ padding: '4px 10px', border: '1px solid #fecaca', borderRadius: 6, background: '#fef2f2', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit', color: '#dc2626', whiteSpace: 'nowrap' }}>
                          {deleting === s.id ? '...' : '🗑 Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: 540, padding: '1.75rem', maxHeight: '92vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>{editing ? 'Edit Student' : 'Add New Student'}</h2>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#64748b' }}>×</button>
            </div>
            {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', color: '#dc2626', fontSize: 13, marginBottom: '1rem' }}>⚠ {error}</div>}
            <form onSubmit={handleSave}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={lbl}>Select Class (auto-fills grade &amp; section)</label>
                  <select style={{ ...inp, borderColor: form.class_id ? '#6366f1' : '#e2e8f0' }}
                    value={form.class_id} onChange={e => handleClassSelect(e.target.value)}>
                    <option value="">Choose class…</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name} — Section {c.section}</option>)}
                  </select>
                  {form.class_name && (
                    <p style={{ fontSize: 11, color: '#16a34a', margin: '4px 0 0' }}>✓ Linked to {form.class_name} Section {form.section}</p>
                  )}
                </div>
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={lbl}>Full Name *</label>
                  <input required style={inp} value={form.full_name} placeholder="e.g. Ahmad Ali"
                    onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
                </div>
                <div>
                  <label style={lbl}>Roll Number *</label>
                  <input required style={inp} value={form.roll_number} placeholder="2024-013"
                    onChange={e => setForm(f => ({ ...f, roll_number: e.target.value }))} />
                </div>
                <div>
                  <label style={lbl}>Gender *</label>
                  <select required style={inp} value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label style={lbl}>Parent Name *</label>
                  <input required style={inp} value={form.parent_name} placeholder="Father's name"
                    onChange={e => setForm(f => ({ ...f, parent_name: e.target.value }))} />
                </div>
                <div>
                  <label style={lbl}>Parent Phone *</label>
                  <input required style={inp} value={form.parent_phone} placeholder="+92-300-0000000"
                    onChange={e => setForm(f => ({ ...f, parent_phone: e.target.value }))} />
                </div>
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={lbl}>Parent Email</label>
                  <input type="email" style={inp} value={form.parent_email} placeholder="optional"
                    onChange={e => setForm(f => ({ ...f, parent_email: e.target.value }))} />
                </div>
                <div>
                  <label style={lbl}>Fee Status</label>
                  <select style={inp} value={form.fee_status} onChange={e => setForm(f => ({ ...f, fee_status: e.target.value as any }))}>
                    <option value="paid">Paid</option>
                    <option value="pending">Pending</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </div>
                <div>
                  <label style={lbl}>Date of Birth (Optional)</label>
                  <input type="date" style={inp} value={form.date_of_birth}
                    onChange={e => setForm(f => ({ ...f, date_of_birth: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: '1.25rem' }}>
                <button type="button" onClick={() => setShowForm(false)} style={{ flex: 1, padding: 10, border: '1px solid #e2e8f0', borderRadius: 8, background: 'white', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>Cancel</button>
                <button type="submit" disabled={saving} style={{ flex: 2, padding: 10, background: saving ? '#a5b4fc' : '#4f46e5', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                  {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPromote && (
        <PromoteStudentsModal
          students={students}
          classes={classes}
          onClose={() => setShowPromote(false)}
          onSuccess={() => window.location.reload()}
        />
      )}
    </div>
  )
}
