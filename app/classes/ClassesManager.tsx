'use client'
import { useState } from 'react'
import type { Class } from '@/types'
import { isOffline, queueOfflineMutation, getMergedOfflineState, generateUUID } from '@/lib/offlineSync'

const GRADES = ['Play-Group','Nursery','Prep','Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6','Grade 7','Grade 8','Grade 9','Grade 10']
const SECTIONS = ['A','B','C','D','E']

const inp: React.CSSProperties = {
  width: '100%', padding: '8px 12px', border: '1.5px solid #e2e8f0',
  borderRadius: 8, fontSize: 13, background: '#f8fafc', fontFamily: 'inherit', outline: 'none',
}
const lbl: React.CSSProperties = { fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 5 }

const EMPTY_FORM = { name: '', section: 'A', class_teacher: '', capacity: 35, description: '' }

export default function ClassesManager({ classes: init, schoolId }: { classes: any[]; schoolId: string }) {
  const [classes, setClasses]       = useState<any[]>(() => getMergedOfflineState('/api/classes', init))
  const [showForm, setShowForm]     = useState(false)
  const [editing, setEditing]       = useState<any>(null)
  const [viewing, setViewing]       = useState<any>(null)
  const [viewStudents, setViewStudents] = useState<any[]>([])
  const [loadingView, setLoadingView] = useState(false)
  const [saving, setSaving]         = useState(false)
  const [deleting, setDeleting]     = useState<string | null>(null)
  const [error, setError]           = useState('')
  const [form, setForm]             = useState(EMPTY_FORM)
  const [search, setSearch]         = useState('')

  const filtered = classes.filter(c =>
    !search ||
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.section.toLowerCase().includes(search.toLowerCase()) ||
    (c.class_teacher ?? '').toLowerCase().includes(search.toLowerCase())
  )

  // Group by grade name
  const grouped = filtered.reduce((acc: Record<string, any[]>, c) => {
    if (!acc[c.name]) acc[c.name] = []
    acc[c.name].push(c)
    return acc
  }, {})

  function openAdd() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setError('')
    setShowForm(true)
  }

  function openEdit(cls: any) {
    setEditing(cls)
    setForm({ name: cls.name, section: cls.section, class_teacher: cls.class_teacher ?? '', capacity: cls.capacity, description: cls.description ?? '' })
    setError('')
    setShowForm(true)
  }

  async function openView(cls: any) {
    setViewing(cls)
    setLoadingView(true)
    setViewStudents([])
    const res = await fetch(`/api/classes/${cls.id}`)
    if (res.ok) {
      const data = await res.json()
      setViewStudents(data.students ?? [])
    }
    setLoadingView(false)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const url   = editing ? `/api/classes/${editing.id}` : '/api/classes'
      const method = editing ? 'PUT' : 'POST'

      if (isOffline()) {
        const classId = editing ? editing.id : generateUUID()
        const classRecord = {
          id: classId,
          school_id: schoolId,
          name: form.name,
          section: form.section,
          class_teacher: form.class_teacher || null,
          capacity: Number(form.capacity),
          description: form.description || null,
          is_active: true,
          created_at: new Date().toISOString(),
          student_count: editing ? editing.student_count : 0
        }

        queueOfflineMutation({
          type: 'fetch',
          target: url,
          operation: method,
          payload: classRecord,
          matchKey: 'id',
          matchValue: classId
        })

        if (editing) {
          setClasses(p => p.map(c => c.id === editing.id ? classRecord : c))
        } else {
          setClasses(p => [...p, classRecord])
        }

        alert('Class details saved locally. Changes will sync automatically when online.')
        setShowForm(false)
        setSaving(false)
        return
      }

      const res   = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, capacity: Number(form.capacity) }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Something went wrong'); setSaving(false); return }
      if (editing) {
        setClasses(p => p.map(c => c.id === editing.id ? { ...c, ...data } : c))
      } else {
        setClasses(p => [...p, { ...data, student_count: 0 }])
      }
      setShowForm(false)
    } catch { setError('Network error. Try again.') }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Archive this class? Students will not be deleted.')) return
    setDeleting(id)
    if (isOffline()) {
      queueOfflineMutation({
        type: 'fetch',
        target: `/api/classes/${id}`,
        operation: 'DELETE',
        payload: { id },
        matchKey: 'id',
        matchValue: id
      })
      setClasses(p => p.filter(c => c.id !== id))
      alert('Class deletion saved locally. Will sync automatically when online.')
      setDeleting(null)
      return
    }
    await fetch(`/api/classes/${id}`, { method: 'DELETE' })
    setClasses(p => p.filter(c => c.id !== id))
    setDeleting(null)
  }

  const totalStudents = classes.reduce((s, c) => s + (c.student_count ?? 0), 0)
  const totalCapacity = classes.reduce((s, c) => s + c.capacity, 0)

  return (
    <div style={{ padding: '2rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Classes &amp; Sections</h1>
          <p style={{ color: '#64748b', fontSize: 13, marginTop: 3 }}>{classes.length} sections · {totalStudents} students enrolled</p>
        </div>
        <button onClick={openAdd} style={{ padding: '9px 18px', background: '#4f46e5', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          + Add Class
        </button>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total sections', value: classes.length, color: '#4f46e5' },
          { label: 'Students enrolled', value: totalStudents, color: '#16a34a' },
          { label: 'Total capacity', value: totalCapacity, color: '#0284c7' },
          { label: 'Available seats', value: totalCapacity - totalStudents, color: '#d97706' },
        ].map((s, i) => (
          <div key={i} className="card" style={{ padding: '1rem' }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{s.label}</p>
            <p style={{ fontSize: '1.6rem', fontWeight: 700, color: s.color, margin: 0 }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{ marginBottom: '1.25rem' }}>
        <input placeholder="Search by grade, section or teacher..." value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ ...inp, width: 300 }} />
      </div>

      {/* Classes grouped by grade */}
      {Object.keys(grouped).sort().length === 0
        ? <div className="card" style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>No classes yet. Add your first class!</div>
        : Object.entries(grouped).sort(([a],[b]) => a.localeCompare(b)).map(([grade, sections]) => (
          <div key={grade} style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: '#475569', marginBottom: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{grade}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 12 }}>
              {(sections as any[]).map(cls => {
                const fill = Math.round(((cls.student_count ?? 0) / cls.capacity) * 100)
                const fillColor = fill >= 90 ? '#dc2626' : fill >= 70 ? '#d97706' : '#16a34a'
                return (
                  <div key={cls.id} className="card" style={{ padding: '1.25rem' }}>
                    {/* Top row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <div>
                        <span style={{ background: '#eef2ff', color: '#4f46e5', fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>
                          Section {cls.section}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => openView(cls)} style={{ padding: '4px 10px', border: '1px solid #e2e8f0', borderRadius: 6, background: 'white', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit', color: '#475569' }}>
                          Students
                        </button>
                        <button onClick={() => openEdit(cls)} style={{ padding: '4px 10px', border: '1px solid #e2e8f0', borderRadius: 6, background: 'white', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit', color: '#475569' }}>
                          Edit
                        </button>
                        <button onClick={() => handleDelete(cls.id)} disabled={deleting === cls.id} style={{ padding: '4px 10px', border: '1px solid #fecaca', borderRadius: 6, background: '#fef2f2', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit', color: '#dc2626' }}>
                          {deleting === cls.id ? '...' : 'Archive'}
                        </button>
                      </div>
                    </div>

                    {/* Teacher */}
                    <p style={{ fontSize: 13, color: '#0f172a', fontWeight: 500, margin: '0 0 4px' }}>
                      {cls.class_teacher ? `👩‍🏫 ${cls.class_teacher}` : 'No teacher assigned'}
                    </p>

                    {/* Capacity bar */}
                    <div style={{ margin: '10px 0 6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748b', marginBottom: 4 }}>
                        <span>{cls.student_count ?? 0} students</span>
                        <span>{cls.capacity} capacity</span>
                      </div>
                      <div style={{ height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.min(fill, 100)}%`, background: fillColor, borderRadius: 3, transition: 'width 0.4s' }} />
                      </div>
                    </div>

                    <p style={{ fontSize: 11, color: fill >= 90 ? '#dc2626' : '#94a3b8', margin: 0 }}>
                      {fill >= 90 ? '⚠ Almost full' : `${cls.capacity - (cls.student_count ?? 0)} seats available`}
                    </p>
                    {cls.description && <p style={{ fontSize: 12, color: '#94a3b8', margin: '6px 0 0', fontStyle: 'italic' }}>{cls.description}</p>}
                  </div>
                )
              })}
            </div>
          </div>
        ))
      }

      {/* ── Add / Edit Modal ── */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: 480, padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>{editing ? 'Edit Class' : 'Add New Class'}</h2>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#64748b' }}>×</button>
            </div>
            {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', color: '#dc2626', fontSize: 13, marginBottom: '1rem' }}>⚠ {error}</div>}
            <form onSubmit={handleSave}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
                <div>
                  <label style={lbl}>Grade / Class *</label>
                  <select required style={inp} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}>
                    <option value="">Select grade…</option>
                    {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Section *</label>
                  <select required style={inp} value={form.section} onChange={e => setForm(f => ({ ...f, section: e.target.value }))}>
                    {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={lbl}>Class teacher</label>
                  <input style={inp} value={form.class_teacher} placeholder="e.g. Ms. Sara"
                    onChange={e => setForm(f => ({ ...f, class_teacher: e.target.value }))} />
                </div>
                <div>
                  <label style={lbl}>Capacity</label>
                  <input type="number" min="1" max="100" style={inp} value={form.capacity}
                    onChange={e => setForm(f => ({ ...f, capacity: Number(e.target.value) }))} />
                </div>
                <div>
                  <label style={lbl}>Description</label>
                  <input style={inp} value={form.description} placeholder="Optional note…"
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: '1.25rem' }}>
                <button type="button" onClick={() => setShowForm(false)} style={{ flex: 1, padding: 10, border: '1px solid #e2e8f0', borderRadius: 8, background: 'white', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>
                  Cancel
                </button>
                <button type="submit" disabled={saving} style={{ flex: 2, padding: 10, background: saving ? '#a5b4fc' : '#4f46e5', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                  {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Class'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── View Students Modal ── */}
      {viewing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: 600, padding: '1.75rem', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>{viewing.name} — Section {viewing.section}</h2>
                <p style={{ fontSize: 13, color: '#64748b', margin: '2px 0 0' }}>
                  {loadingView ? 'Loading…' : `${viewStudents.length} students`}
                  {viewing.class_teacher && ` · ${viewing.class_teacher}`}
                </p>
              </div>
              <button onClick={() => setViewing(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#64748b' }}>×</button>
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {loadingView
                ? <p style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem' }}>Loading students…</p>
                : viewStudents.length === 0
                ? <p style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem' }}>No students assigned to this class yet.</p>
                : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        {['Roll No', 'Name', 'Gender', 'Fee Status'].map(h => (
                          <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: 12 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {viewStudents.map((s: any, i: number) => (
                        <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 ? '#fafafa' : 'white' }}>
                          <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: '#6366f1', fontWeight: 500 }}>{s.roll_number}</td>
                          <td style={{ padding: '10px 14px', fontWeight: 500, color: '#0f172a' }}>{s.full_name}</td>
                          <td style={{ padding: '10px 14px', color: '#475569', textTransform: 'capitalize' }}>{s.gender}</td>
                          <td style={{ padding: '10px 14px' }}>
                            <span style={{
                              fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6,
                              textTransform: 'capitalize',
                              background: s.fee_status === 'paid' ? '#f0fdf4' : s.fee_status === 'overdue' ? '#fef2f2' : '#fffbeb',
                              color: s.fee_status === 'paid' ? '#16a34a' : s.fee_status === 'overdue' ? '#dc2626' : '#d97706',
                            }}>{s.fee_status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              }
            </div>
            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1rem', marginTop: '1rem' }}>
              <button onClick={() => setViewing(null)} style={{ padding: '9px 20px', border: '1px solid #e2e8f0', borderRadius: 8, background: 'white', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
