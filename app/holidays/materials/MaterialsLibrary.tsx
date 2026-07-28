'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { StudyMaterial } from '@/types'
import Link from 'next/link'

const MATERIAL_TYPES = [
  { value: 'pdf',   label: 'PDF Document', icon: '📄', color: '#dc2626', bg: '#fef2f2' },
  { value: 'video', label: 'Video',         icon: '🎬', color: '#7c3aed', bg: '#f5f3ff' },
  { value: 'link',  label: 'Web Link',      icon: '🔗', color: '#0284c7', bg: '#f0f9ff' },
  { value: 'note',  label: 'Text Note',     icon: '📝', color: '#d97706', bg: '#fffbeb' },
]

const SUBJECTS = ['Mathematics','Science','English','Urdu','Islamiat','Social Studies','Physics','Chemistry','Biology','Computer','Arts','Other']

function getTypeInfo(type: string) {
  return MATERIAL_TYPES.find(t => t.value === type) ?? MATERIAL_TYPES[0]
}

interface Props {
  materials: StudyMaterial[]
  classes: string[]
  schoolId: string
  teacherId: string
  userRole: string
  plan: string
}

export default function MaterialsLibrary({ materials: initial, classes, schoolId, teacherId, userRole, plan }: Props) {
  const supabase = createClient()
  const canManage = plan === 'basic' || plan === 'pro'
  const canUpload = canManage && (userRole === 'admin' || userRole === 'principal' || userRole === 'teacher')

  const [materials, setMaterials] = useState<StudyMaterial[]>(initial)
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState<StudyMaterial | null>(null)
  const [saving, setSaving] = useState(false)
  const [filterClass, setFilterClass] = useState('all')
  const [filterType, setFilterType] = useState('all')
  const [form, setForm] = useState({
    class_name: classes[0] ?? '',
    subject: 'Mathematics',
    title: '',
    type: 'pdf' as StudyMaterial['type'],
    url: '',
    content: '',
  })

  const filtered = useMemo(() => {
    return materials.filter(m => {
      if (filterClass !== 'all' && m.class_name !== filterClass) return false
      if (filterType !== 'all' && m.type !== filterType) return false
      return true
    })
  }, [materials, filterClass, filterType])

  function openAdd() {
    setEditItem(null)
    setForm({ class_name: classes[0] ?? '', subject: 'Mathematics', title: '', type: 'pdf', url: '', content: '' })
    setShowModal(true)
  }

  function openEdit(m: StudyMaterial) {
    setEditItem(m)
    setForm({ class_name: m.class_name, subject: m.subject, title: m.title, type: m.type, url: m.url ?? '', content: m.content ?? '' })
    setShowModal(true)
  }

  async function save() {
    if (!form.title.trim() || !form.class_name) return
    setSaving(true)
    try {
      const payload = {
        class_name: form.class_name,
        subject: form.subject,
        title: form.title.trim(),
        type: form.type,
        url: form.url.trim() || null,
        content: form.content.trim() || null,
      }
      if (editItem) {
        const { data, error } = await supabase.from('study_materials')
          .update(payload).eq('id', editItem.id)
          .select('*, teacher:users(full_name)').single()
        if (!error && data) setMaterials(prev => prev.map(m => m.id === editItem.id ? data : m))
      } else {
        const { data, error } = await supabase.from('study_materials')
          .insert({ school_id: schoolId, teacher_id: teacherId, ...payload })
          .select('*, teacher:users(full_name)').single()
        if (!error && data) setMaterials(prev => [data, ...prev])
      }
      setShowModal(false)
    } finally {
      setSaving(false)
    }
  }

  async function deleteMat(id: string) {
    if (!confirm('Delete this study material?')) return
    await supabase.from('study_materials').delete().eq('id', id)
    setMaterials(prev => prev.filter(m => m.id !== id))
  }

  const needsUrl = form.type === 'pdf' || form.type === 'video' || form.type === 'link'
  const needsContent = form.type === 'note'

  return (
    <div style={{ padding: '2rem', maxWidth: 1100 }}>
      {/* Breadcrumb */}
      <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#64748b' }}>
        <Link href="/holidays" style={{ color: '#4f46e5', textDecoration: 'none', fontWeight: 500 }}>🏖️ Holidays</Link>
        <span>›</span>
        <span>Study Materials</span>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>📚 Study Materials</h1>
          <p style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>Upload resources for students to study during holidays</p>
        </div>
        {canUpload && (
          <button onClick={openAdd} style={{ padding: '10px 20px', borderRadius: 8, background: '#4f46e5', color: 'white', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
            + Upload Material
          </button>
        )}
        {!canManage && (
          <div style={{ padding: '8px 14px', borderRadius: 8, background: '#f1f5f9', border: '1px solid #e2e8f0', fontSize: 13, color: '#64748b' }}>
            🔒 Upgrade to Basic to upload materials
          </div>
        )}
      </div>

      {/* Type legend + filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        {MATERIAL_TYPES.map(t => (
          <button key={t.value} onClick={() => setFilterType(filterType === t.value ? 'all' : t.value)}
            style={{ padding: '5px 12px', borderRadius: 20, border: `1.5px solid ${filterType === t.value ? t.color : '#e2e8f0'}`, background: filterType === t.value ? t.bg : 'white', color: filterType === t.value ? t.color : '#64748b', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'inherit' }}>
            {t.icon} {t.label}
          </button>
        ))}
        <select value={filterClass} onChange={e => setFilterClass(e.target.value)}
          style={{ padding: '7px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 13, background: 'white', cursor: 'pointer', fontFamily: 'inherit', marginLeft: 'auto' }}>
          <option value="all">All Classes</option>
          {classes.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', background: 'white', borderRadius: 12, border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📂</div>
          <p style={{ color: '#64748b', fontSize: 15 }}>No study materials found.</p>
          {canUpload && (
            <button onClick={openAdd} style={{ marginTop: 12, padding: '9px 18px', borderRadius: 8, background: '#4f46e5', color: 'white', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>
              Upload First Material
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
          {filtered.map(m => {
            const t = getTypeInfo(m.type)
            return (
              <div key={m.id} style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0, border: `1px solid ${t.color}22` }}>
                    {t.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: 5, marginBottom: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10, background: t.bg, color: t.color, border: `1px solid ${t.color}33` }}>{t.label}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10, background: '#eef2ff', color: '#4f46e5' }}>{m.class_name}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10, background: '#f0fdf4', color: '#16a34a' }}>{m.subject}</span>
                    </div>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: 0, lineHeight: 1.3 }}>{m.title}</h3>
                  </div>
                </div>

                {m.content && (
                  <p style={{ fontSize: 13, color: '#475569', margin: 0, lineHeight: 1.5, background: '#f8fafc', padding: '8px 10px', borderRadius: 6 }}>{m.content}</p>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: '1px solid #f1f5f9' }}>
                  <div>
                    {m.teacher && <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>By: {(m.teacher as any).full_name}</p>}
                    <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0' }}>{new Date(m.created_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {m.url && (
                      <a href={m.url} target="_blank" rel="noopener noreferrer" style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #bfdbfe', background: '#eff6ff', color: '#1d4ed8', fontSize: 12, textDecoration: 'none', fontWeight: 600 }}>
                        Open →
                      </a>
                    )}
                    {canUpload && (
                      <>
                        <button onClick={() => openEdit(m)} style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontSize: 12 }}>✏️</button>
                        <button onClick={() => deleteMat(m.id)} style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #fecaca', background: '#fef2f2', cursor: 'pointer', fontSize: 12 }}>🗑️</button>
                      </>
                    )}
                  </div>
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
              {editItem ? '✏️ Edit Material' : '📚 Upload Study Material'}
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
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Material Type *</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                  {MATERIAL_TYPES.map(t => (
                    <button key={t.value} onClick={() => setForm(f => ({ ...f, type: t.value as StudyMaterial['type'] }))}
                      style={{ padding: '8px 4px', borderRadius: 8, border: `1.5px solid ${form.type === t.value ? t.color : '#e2e8f0'}`, background: form.type === t.value ? t.bg : 'white', color: form.type === t.value ? t.color : '#64748b', cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, fontFamily: 'inherit' }}>
                      <span style={{ fontSize: 18 }}>{t.icon}</span>
                      <span style={{ fontSize: 10 }}>{t.label.split(' ')[0]}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Title *</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Chapter 3 Notes PDF"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                />
              </div>
              {needsUrl && (
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>{form.type === 'pdf' ? 'PDF URL' : form.type === 'video' ? 'Video URL' : 'Link URL'}</label>
                  <input value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                    placeholder="https://..."
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                  />
                </div>
              )}
              {needsContent && (
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Note Content</label>
                  <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                    rows={4} placeholder="Write your note here..."
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 14, outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
                  />
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: '1.25rem' }}>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: 'white', cursor: 'pointer', fontSize: 14, fontWeight: 500, color: '#475569', fontFamily: 'inherit' }}>Cancel</button>
              <button onClick={save} disabled={saving || !form.title.trim()} style={{ flex: 2, padding: '10px', borderRadius: 8, border: 'none', background: '#4f46e5', color: 'white', cursor: saving ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 600, opacity: saving ? 0.7 : 1, fontFamily: 'inherit' }}>
                {saving ? 'Saving...' : editItem ? 'Update' : 'Upload Material'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
