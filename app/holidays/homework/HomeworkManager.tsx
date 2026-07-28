'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { HolidayHomework } from '@/types'
import Link from 'next/link'

const SUBJECTS = ['Mathematics','Science','English','Urdu','Islamiat','Social Studies','Physics','Chemistry','Biology','Computer','Arts','Other']

interface Props {
  homework: HolidayHomework[]
  classes: string[]
  schoolId: string
  teacherId: string
  userRole: string
  plan: string
}

function statusBadge(dueDate: string, submissionCount: number) {
  const now = new Date().toISOString().split('T')[0]
  if (dueDate < now) return { label: 'Overdue', color: '#dc2626', bg: '#fef2f2' }
  const diff = Math.ceil((new Date(dueDate).getTime() - Date.now()) / 86400000)
  if (diff <= 2) return { label: `Due in ${diff}d`, color: '#d97706', bg: '#fffbeb' }
  return { label: 'Active', color: '#16a34a', bg: '#f0fdf4' }
}

export default function HomeworkManager({ homework: initial, classes, schoolId, teacherId, userRole, plan }: Props) {
  const supabase = createClient()
  const canManage = plan === 'basic' || plan === 'pro'
  const isAdminOrTeacher = userRole === 'admin' || userRole === 'principal' || userRole === 'teacher'

  const [homework, setHomework] = useState<HolidayHomework[]>(initial)
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState<HolidayHomework | null>(null)
  const [saving, setSaving] = useState(false)
  const [filterClass, setFilterClass] = useState('all')
  const [filterSubject, setFilterSubject] = useState('all')
  const [form, setForm] = useState({
    class_name: classes[0] ?? '',
    subject: 'Mathematics',
    title: '',
    description: '',
    due_date: '',
  })

  const filtered = useMemo(() => {
    return homework.filter(h => {
      if (filterClass !== 'all' && h.class_name !== filterClass) return false
      if (filterSubject !== 'all' && h.subject !== filterSubject) return false
      return true
    })
  }, [homework, filterClass, filterSubject])

  function openAdd() {
    setEditItem(null)
    const nextWeek = new Date(); nextWeek.setDate(nextWeek.getDate() + 7)
    setForm({ class_name: classes[0] ?? '', subject: 'Mathematics', title: '', description: '', due_date: nextWeek.toISOString().split('T')[0] })
    setShowModal(true)
  }

  function openEdit(h: HolidayHomework) {
    setEditItem(h)
    setForm({ class_name: h.class_name, subject: h.subject, title: h.title, description: h.description ?? '', due_date: h.due_date })
    setShowModal(true)
  }

  async function save() {
    if (!form.title.trim() || !form.due_date || !form.class_name) return
    setSaving(true)
    try {
      if (editItem) {
        const { data, error } = await supabase.from('holiday_homework')
          .update({ class_name: form.class_name, subject: form.subject, title: form.title.trim(), description: form.description.trim() || null, due_date: form.due_date })
          .eq('id', editItem.id).select('*, teacher:users(full_name)').single()
        if (!error && data) setHomework(prev => prev.map(h => h.id === editItem.id ? data : h))
      } else {
        const { data, error } = await supabase.from('holiday_homework')
          .insert({ school_id: schoolId, teacher_id: teacherId, class_name: form.class_name, subject: form.subject, title: form.title.trim(), description: form.description.trim() || null, due_date: form.due_date })
          .select('*, teacher:users(full_name)').single()
        if (!error && data) setHomework(prev => [data, ...prev])
      }
      setShowModal(false)
    } finally {
      setSaving(false)
    }
  }

  async function deleteHw(id: string) {
    if (!confirm('Delete this homework assignment?')) return
    await supabase.from('holiday_homework').delete().eq('id', id)
    setHomework(prev => prev.filter(h => h.id !== id))
  }

  const subjects = Array.from(new Set(homework.map(h => h.subject))).sort()

  return (
    <div style={{ padding: '2rem', maxWidth: 1100 }}>
      {/* Breadcrumb */}
      <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#64748b' }}>
        <Link href="/holidays" style={{ color: '#4f46e5', textDecoration: 'none', fontWeight: 500 }}>🏖️ Holidays</Link>
        <span>›</span>
        <span>Holiday Homework</span>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>📝 Holiday Homework</h1>
          <p style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>Assign and track homework during school breaks</p>
        </div>
        {isAdminOrTeacher && canManage && (
          <button onClick={openAdd} style={{ padding: '10px 20px', borderRadius: 8, background: '#4f46e5', color: 'white', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
            + Assign Homework
          </button>
        )}
        {!canManage && (
          <div style={{ padding: '8px 14px', borderRadius: 8, background: '#f1f5f9', border: '1px solid #e2e8f0', fontSize: 13, color: '#64748b' }}>
            🔒 Upgrade to Basic to assign homework
          </div>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <select value={filterClass} onChange={e => setFilterClass(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 13, background: 'white', cursor: 'pointer', fontFamily: 'inherit' }}>
          <option value="all">All Classes</option>
          {classes.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterSubject} onChange={e => setFilterSubject(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 13, background: 'white', cursor: 'pointer', fontFamily: 'inherit' }}>
          <option value="all">All Subjects</option>
          {subjects.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#64748b' }}>
          Showing <strong style={{ color: '#0f172a' }}>{filtered.length}</strong> assignment{filtered.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Cards grid */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', background: 'white', borderRadius: 12, border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📚</div>
          <p style={{ color: '#64748b', fontSize: 15 }}>No homework assignments found.</p>
          {isAdminOrTeacher && canManage && (
            <button onClick={openAdd} style={{ marginTop: 12, padding: '9px 18px', borderRadius: 8, background: '#4f46e5', color: 'white', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>
              Assign First Homework
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
          {filtered.map(h => {
            const status = statusBadge(h.due_date, h.submission_count ?? 0)
            return (
              <div key={h.id} style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 12, background: '#eef2ff', color: '#4f46e5' }}>{h.class_name}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 12, background: '#f0fdf4', color: '#16a34a' }}>{h.subject}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 12, background: status.bg, color: status.color }}>{status.label}</span>
                    </div>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0, lineHeight: 1.3 }}>{h.title}</h3>
                  </div>
                </div>
                {h.description && (
                  <p style={{ fontSize: 13, color: '#475569', margin: 0, lineHeight: 1.5 }}>{h.description}</p>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, paddingTop: 10, borderTop: '1px solid #f1f5f9' }}>
                  <div>
                    <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>Due: <strong style={{ color: '#374151' }}>{new Date(h.due_date + 'T00:00:00').toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}</strong></p>
                    {h.teacher && <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0' }}>By: {(h.teacher as any).full_name}</p>}
                  </div>
                  {isAdminOrTeacher && canManage && (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => openEdit(h)} style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontSize: 12 }}>✏️</button>
                      <button onClick={() => deleteHw(h.id)} style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #fecaca', background: '#fef2f2', cursor: 'pointer', fontSize: 12 }}>🗑️</button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 500, padding: '1.5rem', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: '0 0 1.25rem' }}>
              {editItem ? '✏️ Edit Homework' : '📝 Assign Holiday Homework'}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Class *</label>
                  <select value={form.class_name} onChange={e => setForm(f => ({ ...f, class_name: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 14, background: 'white', fontFamily: 'inherit' }}>
                    {classes.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Subject *</label>
                  <select value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 14, background: 'white', fontFamily: 'inherit' }}>
                    {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Title *</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Chapter 5 Exercises"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Instructions / Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={3} placeholder="Describe the homework task..."
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 14, outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Due Date *</label>
                <input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 14, outline: 'none', fontFamily: 'inherit' }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: '1.25rem' }}>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: 'white', cursor: 'pointer', fontSize: 14, fontWeight: 500, color: '#475569', fontFamily: 'inherit' }}>Cancel</button>
              <button onClick={save} disabled={saving || !form.title.trim() || !form.due_date} style={{ flex: 2, padding: '10px', borderRadius: 8, border: 'none', background: '#4f46e5', color: 'white', cursor: saving ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 600, opacity: saving ? 0.7 : 1, fontFamily: 'inherit' }}>
                {saving ? 'Saving...' : editItem ? 'Update' : 'Assign Homework'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
