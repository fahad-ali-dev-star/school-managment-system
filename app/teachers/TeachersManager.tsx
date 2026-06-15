'use client'
import { useState } from 'react'
import type { Teacher } from '@/types'

const SUBJECTS = ['English','Mathematics','Science','Urdu','Social Study','Islamiat','Computer','Physics','Chemistry','Biology','History','Geography','Art','Physical Education']
const QUALIFICATIONS = ['B.Ed','M.Ed','B.Sc','M.Sc','B.A','M.A','M.Phil','PhD','Other']

const inp: React.CSSProperties = {
  width: '100%', padding: '8px 12px', border: '1.5px solid #e2e8f0',
  borderRadius: 8, fontSize: 13, background: '#f8fafc', fontFamily: 'inherit', outline: 'none',
}
const lbl: React.CSSProperties = { fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 5 }

const EMPTY: Partial<Teacher> = {
  full_name: '', email: '', phone: '', employee_id: '',
  qualification: '', subject: '', class_assigned: '',
  experience_years: 0, gender: 'female', salary: undefined,
}

export default function TeachersManager({ teachers: init, schoolId }: { teachers: Teacher[]; schoolId: string }) {
  const [teachers, setTeachers] = useState<Teacher[]>(init)
  const [showForm, setShowForm]   = useState(false)
  const [viewing, setViewing]     = useState<Teacher | null>(null)
  const [editing, setEditing]     = useState<Teacher | null>(null)
  const [saving, setSaving]       = useState(false)
  const [deleting, setDeleting]   = useState<string | null>(null)
  const [error, setError]         = useState('')
  const [search, setSearch]       = useState('')
  const [filterSubject, setFilterSubject] = useState('')
  const [form, setForm]           = useState<Partial<Teacher>>(EMPTY)

  const subjects = [...new Set(teachers.map(t => t.subject).filter(Boolean))]
  const filtered = teachers.filter(t => {
    const q = search.toLowerCase()
    return (!q || t.full_name.toLowerCase().includes(q) || (t.subject ?? '').toLowerCase().includes(q) || (t.employee_id ?? '').toLowerCase().includes(q))
      && (!filterSubject || t.subject === filterSubject)
  })

  function openAdd() {
    setEditing(null); setForm(EMPTY); setError(''); setShowForm(true)
  }
  function openEdit(t: Teacher) {
    setEditing(t); setForm({ ...t }); setError(''); setShowForm(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError('')
    try {
      // New teachers go through admin API (creates Supabase Auth account)
      // Existing teachers use regular PUT (email change handled by admin API)
      const url    = editing ? `/api/admin/teachers/${editing.id}` : '/api/admin/teachers'
      const method = editing ? 'PUT' : 'POST'
      const res    = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, experience_years: Number(form.experience_years), salary: form.salary ? Number(form.salary) : null }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Something went wrong'); setSaving(false); return }
      if (editing) setTeachers(p => p.map(t => t.id === editing.id ? data : t))
      else setTeachers(p => [...p, data])
      setShowForm(false)
    } catch { setError('Network error. Try again.') }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Remove this teacher? Their login account will also be deleted.')) return
    setDeleting(id)
    await fetch(`/api/admin/teachers/${id}`, { method: 'DELETE' })
    setTeachers(p => p.filter(t => t.id !== id))
    setDeleting(null)
  }

  const genderIcon = (g?: string) => g === 'male' ? '👨‍🏫' : '👩‍🏫'
  const expColor   = (y: number)  => y >= 8 ? '#16a34a' : y >= 4 ? '#d97706' : '#6366f1'

  return (
    <div style={{ padding: '2rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Teachers</h1>
          <p style={{ color: '#64748b', fontSize: 13, marginTop: 3 }}>{teachers.length} active staff members</p>
        </div>
        <button onClick={openAdd} style={{ padding: '9px 18px', background: '#4f46e5', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          + Add Teacher
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total teachers', value: teachers.length,                                                    color: '#4f46e5' },
          { label: 'Female staff',   value: teachers.filter(t => t.gender === 'female').length,                 color: '#db2777' },
          { label: 'Male staff',     value: teachers.filter(t => t.gender === 'male').length,                   color: '#0284c7' },
          { label: 'Avg experience', value: teachers.length ? `${Math.round(teachers.reduce((s,t) => s + t.experience_years, 0) / teachers.length)}y` : '0y', color: '#16a34a' },
        ].map((s, i) => (
          <div key={i} className="card" style={{ padding: '1rem' }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{s.label}</p>
            <p style={{ fontSize: '1.6rem', fontWeight: 700, color: s.color, margin: 0 }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <input placeholder="Search name, subject, ID..." value={search}
          onChange={e => setSearch(e.target.value)} style={{ ...inp, width: 260 }} />
        <select value={filterSubject} onChange={e => setFilterSubject(e.target.value)} style={{ ...inp, width: 'auto' }}>
          <option value="">All subjects</option>
          {subjects.map(s => <option key={s} value={s!}>{s}</option>)}
        </select>
      </div>

      {/* Teacher cards grid */}
      {filtered.length === 0
        ? <div className="card" style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>No teachers found.</div>
        : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 14 }}>
          {filtered.map(t => (
            <div key={t.id} className="card" style={{ padding: '1.25rem' }}>
              {/* Top */}
              <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#eef2ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                  {genderIcon(t.gender)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 600, color: '#0f172a', fontSize: 14, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.full_name}</p>
                  <p style={{ fontSize: 12, color: '#4f46e5', margin: '2px 0 0', fontWeight: 500 }}>{t.subject ?? 'No subject'}</p>
                  {t.employee_id && <p style={{ fontSize: 11, color: '#94a3b8', margin: '1px 0 0', fontFamily: 'monospace' }}>{t.employee_id}</p>}
                </div>
              </div>

              {/* Info rows */}
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 5 }}>
                {t.class_assigned && <p style={{ fontSize: 12, color: '#475569', margin: 0 }}>🏫 {t.class_assigned}</p>}
                {t.phone          && <p style={{ fontSize: 12, color: '#475569', margin: 0 }}>📞 {t.phone}</p>}
                {t.email          && <p style={{ fontSize: 12, color: '#475569', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>✉ {t.email}</p>}
                {t.qualification  && <p style={{ fontSize: 12, color: '#475569', margin: 0 }}>🎓 {t.qualification}</p>}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: expColor(t.experience_years) }}>
                    {t.experience_years} yrs experience
                  </span>
                  {t.salary && <span style={{ fontSize: 11, color: '#94a3b8' }}>Rs {Number(t.salary).toLocaleString()}/mo</span>}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 6, marginTop: 12, borderTop: '1px solid #f1f5f9', paddingTop: 10 }}>
                <button onClick={() => setViewing(t)} style={{ flex: 1, padding: '6px', border: '1px solid #e2e8f0', borderRadius: 6, background: 'white', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit', color: '#475569' }}>
                  View
                </button>
                <button onClick={() => openEdit(t)} style={{ flex: 1, padding: '6px', border: '1px solid #c7d2fe', borderRadius: 6, background: '#eef2ff', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit', color: '#4f46e5' }}>
                  Edit
                </button>
                <button onClick={() => handleDelete(t.id)} disabled={deleting === t.id} style={{ flex: 1, padding: '6px', border: '1px solid #fecaca', borderRadius: 6, background: '#fef2f2', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit', color: '#dc2626' }}>
                  {deleting === t.id ? '...' : 'Remove'}
                </button>
              </div>
            </div>
          ))}
        </div>
      }

      {/* ── Add/Edit Modal ── */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: 560, padding: '1.75rem', maxHeight: '92vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>{editing ? 'Edit Teacher' : 'Add New Teacher'}</h2>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#64748b' }}>×</button>
            </div>
            {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', color: '#dc2626', fontSize: 13, marginBottom: '1rem' }}>⚠ {error}</div>}
            <form onSubmit={handleSave}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={lbl}>Full Name *</label>
                  <input required style={inp} value={form.full_name ?? ''} placeholder="e.g. Ms. Sara Ahmed"
                    onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
                </div>
                <div>
                  <label style={lbl}>Employee ID</label>
                  <input style={inp} value={form.employee_id ?? ''} placeholder="EMP-001"
                    onChange={e => setForm(f => ({ ...f, employee_id: e.target.value }))} />
                </div>
                <div>
                  <label style={lbl}>Gender *</label>
                  <select required style={inp} value={form.gender ?? 'female'} onChange={e => setForm(f => ({ ...f, gender: e.target.value as any }))}>
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label style={lbl}>Subject</label>
                  <select style={inp} value={form.subject ?? ''} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}>
                    <option value="">Select subject…</option>
                    {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Qualification</label>
                  <select style={inp} value={form.qualification ?? ''} onChange={e => setForm(f => ({ ...f, qualification: e.target.value }))}>
                    <option value="">Select…</option>
                    {QUALIFICATIONS.map(q => <option key={q} value={q}>{q}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Class Assigned</label>
                  <input style={inp} value={form.class_assigned ?? ''} placeholder="e.g. Grade 5-A"
                    onChange={e => setForm(f => ({ ...f, class_assigned: e.target.value }))} />
                </div>
                <div>
                  <label style={lbl}>Experience (years)</label>
                  <input type="number" min="0" max="50" style={inp} value={form.experience_years ?? 0}
                    onChange={e => setForm(f => ({ ...f, experience_years: Number(e.target.value) }))} />
                </div>
                <div>
                  <label style={lbl}>Phone</label>
                  <input style={inp} value={form.phone ?? ''} placeholder="+92-300-0000000"
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={lbl}>Gmail / Email <span style={{ color: '#64748b', fontWeight: 400 }}>(login email)</span></label>
                  <input type="email" style={inp} value={form.email ?? ''} placeholder="teacher@gmail.com"
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  />
                  {!editing && (
                    <p style={{ fontSize: 11, color: '#16a34a', margin: '4px 0 0' }}>
                      Initial password will be: <strong>teacher1122</strong> — teacher can change it after login
                    </p>
                  )}
                  {editing && (
                    <p style={{ fontSize: 11, color: '#64748b', margin: '4px 0 0' }}>
                      Email is editable only in this admin panel. Changing this will update their login email.
                    </p>
                  )}
                </div>
                <div>
                  <label style={lbl}>Monthly Salary (Rs)</label>
                  <input type="number" min="0" style={inp} value={form.salary ?? ''} placeholder="45000"
                    onChange={e => setForm(f => ({ ...f, salary: e.target.value ? Number(e.target.value) : undefined }))} />
                </div>
                <div>
                  <label style={lbl}>Join Date</label>
                  <input type="date" style={inp} value={form.join_date ?? ''}
                    onChange={e => setForm(f => ({ ...f, join_date: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: '1.25rem' }}>
                <button type="button" onClick={() => setShowForm(false)} style={{ flex: 1, padding: 10, border: '1px solid #e2e8f0', borderRadius: 8, background: 'white', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>Cancel</button>
                <button type="submit" disabled={saving} style={{ flex: 2, padding: 10, background: saving ? '#a5b4fc' : '#4f46e5', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                  {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Teacher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── View Profile Modal ── */}
      {viewing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: 480, padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>Teacher Profile</h2>
              <button onClick={() => setViewing(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#64748b' }}>×</button>
            </div>
            <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#eef2ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, flexShrink: 0 }}>
                {genderIcon(viewing.gender)}
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#0f172a', margin: '0 0 2px' }}>{viewing.full_name}</h3>
                <p style={{ fontSize: 13, color: '#4f46e5', margin: 0, fontWeight: 500 }}>{viewing.subject}</p>
                {viewing.employee_id && <p style={{ fontSize: 12, color: '#94a3b8', margin: '2px 0 0', fontFamily: 'monospace' }}>{viewing.employee_id}</p>}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { label: 'Class',        value: viewing.class_assigned },
                { label: 'Qualification',value: viewing.qualification },
                { label: 'Experience',   value: `${viewing.experience_years} years` },
                { label: 'Gender',       value: viewing.gender },
                { label: 'Phone',        value: viewing.phone },
                { label: 'Email',        value: viewing.email },
                { label: 'Join Date',    value: viewing.join_date },
                { label: 'Salary',       value: viewing.salary ? `Rs ${Number(viewing.salary).toLocaleString()}/mo` : null },
              ].filter(r => r.value).map(row => (
                <div key={row.label} style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 12px' }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 3px' }}>{row.label}</p>
                  <p style={{ fontSize: 13, color: '#0f172a', margin: 0, textTransform: 'capitalize' }}>{row.value}</p>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: '1.25rem' }}>
              <button onClick={() => { setViewing(null); openEdit(viewing) }} style={{ flex: 1, padding: 10, border: '1px solid #c7d2fe', borderRadius: 8, background: '#eef2ff', color: '#4f46e5', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', fontWeight: 500 }}>Edit</button>
              <button onClick={() => setViewing(null)} style={{ flex: 1, padding: 10, border: '1px solid #e2e8f0', borderRadius: 8, background: 'white', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
