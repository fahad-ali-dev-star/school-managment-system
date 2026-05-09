'use client'
import { useState } from 'react'

interface ParentUser { id: string; email: string; full_name: string; created_at: string }
interface Student { id: string; full_name: string; roll_number: string; class_name: string; section: string; parent_email?: string }

const inp: React.CSSProperties = {
  width: '100%', padding: '8px 12px', border: '1.5px solid #e2e8f0',
  borderRadius: 8, fontSize: 13, background: '#f8fafc', fontFamily: 'inherit', outline: 'none',
}
const lbl: React.CSSProperties = { fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 5 }

export default function ParentsManager({ parents: init, students }: { parents: ParentUser[]; students: Student[] }) {
  const [parents, setParents] = useState<ParentUser[]>(init)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing]   = useState<ParentUser | null>(null)
  const [saving, setSaving]     = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError]       = useState('')
  const [search, setSearch]     = useState('')
  const [form, setForm] = useState({ email: '', full_name: '' })

  const filtered = parents.filter(p => {
    const q = search.toLowerCase()
    return !q || p.full_name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q)
  })

  function openAdd() { setEditing(null); setForm({ email: '', full_name: '' }); setError(''); setShowForm(true) }
  function openEdit(p: ParentUser) { setEditing(p); setForm({ email: p.email, full_name: p.full_name }); setError(''); setShowForm(true) }

  function childrenOf(email: string) {
    return students.filter(s => s.parent_email?.toLowerCase() === email.toLowerCase())
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError('')
    try {
      const url    = editing ? `/api/admin/parents/${editing.id}` : '/api/admin/parents'
      const method = editing ? 'PUT' : 'POST'
      const res    = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const data   = await res.json()
      if (!res.ok) { setError(data.error ?? 'Error'); setSaving(false); return }
      if (editing) setParents(p => p.map(x => x.id === editing.id ? { ...x, ...data } : x))
      else setParents(p => [...p, data])
      setShowForm(false)
    } catch { setError('Network error. Try again.') }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this parent account? They will no longer be able to log in.')) return
    setDeleting(id)
    await fetch(`/api/admin/parents/${id}`, { method: 'DELETE' })
    setParents(p => p.filter(x => x.id !== id))
    setDeleting(null)
  }

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Parent Accounts</h1>
          <p style={{ color: '#64748b', fontSize: 13, marginTop: 3 }}>{parents.length} parent login accounts</p>
        </div>
        <button onClick={openAdd} style={{ padding: '9px 18px', background: '#7c3aed', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          + Add Parent Account
        </button>
      </div>

      <div style={{ background: '#fdf4ff', border: '1px solid #e9d5ff', borderRadius: 10, padding: '12px 16px', marginBottom: '1.5rem', fontSize: 13, color: '#6b21a8' }}>
        <strong>How it works:</strong> Add a parent email that matches their child&apos;s <em>Parent Email</em> in Students. Initial password is <strong>parent1122</strong>. Parents can change their password but not their email (only admin can).
      </div>

      <div style={{ marginBottom: '1.25rem' }}>
        <input placeholder="Search by name or email…" value={search} onChange={e => setSearch(e.target.value)} style={{ ...inp, width: 300 }} />
      </div>

      {filtered.length === 0
        ? <div className="card" style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>No parent accounts yet.</div>
        : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 14 }}>
          {filtered.map(p => {
            const children = childrenOf(p.email)
            return (
              <div key={p.id} className="card" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#fdf4ff', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0, fontWeight: 700 }}>
                    {p.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 600, color: '#0f172a', fontSize: 14, margin: 0 }}>{p.full_name}</p>
                    <p style={{ fontSize: 12, color: '#7c3aed', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.email}</p>
                  </div>
                </div>
                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 10, marginBottom: 10 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#64748b', margin: '0 0 6px' }}>
                    Linked children ({children.length})
                  </p>
                  {children.length === 0
                    ? <p style={{ fontSize: 12, color: '#f59e0b' }}>No students linked — ensure parent_email in Students matches <strong>{p.email}</strong></p>
                    : children.map(c => (
                      <div key={c.id} style={{ fontSize: 12, color: '#475569', padding: '3px 0' }}>
                        {c.full_name} — {c.class_name} {c.section} (#{c.roll_number})
                      </div>
                    ))
                  }
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => openEdit(p)} style={{ flex: 1, padding: '6px', border: '1px solid #c7d2fe', borderRadius: 6, background: '#eef2ff', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit', color: '#4f46e5' }}>
                    Edit
                  </button>
                  <button onClick={() => handleDelete(p.id)} disabled={deleting === p.id} style={{ flex: 1, padding: '6px', border: '1px solid #fecaca', borderRadius: 6, background: '#fef2f2', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit', color: '#dc2626' }}>
                    {deleting === p.id ? '...' : 'Delete'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      }

      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: 440, padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>{editing ? 'Edit Parent Account' : 'Add Parent Account'}</h2>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#64748b' }}>×</button>
            </div>
            {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', color: '#dc2626', fontSize: 13, marginBottom: '1rem' }}>⚠ {error}</div>}
            <form onSubmit={handleSave}>
              <div style={{ marginBottom: '0.875rem' }}>
                <label style={lbl}>Parent Full Name *</label>
                <input required style={inp} value={form.full_name} placeholder="e.g. Mr. Khalid Ahmed"
                  onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
              </div>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={lbl}>Gmail / Email * {editing ? <span style={{ color: '#64748b', fontWeight: 400 }}>(admin can change)</span> : <span style={{ color: '#64748b', fontWeight: 400 }}>(must match student's parent email)</span>}</label>
                <input required type="email" style={inp} value={form.email} placeholder="parent@gmail.com"
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                {!editing && (
                  <p style={{ fontSize: 11, color: '#16a34a', margin: '4px 0 0' }}>
                    Initial password: <strong>parent1122</strong> — parent can change after login
                  </p>
                )}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" onClick={() => setShowForm(false)} style={{ flex: 1, padding: 10, border: '1px solid #e2e8f0', borderRadius: 8, background: 'white', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>Cancel</button>
                <button type="submit" disabled={saving} style={{ flex: 2, padding: 10, background: saving ? '#a5b4fc' : '#7c3aed', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                  {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
