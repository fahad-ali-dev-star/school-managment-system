'use client'
import { useState } from 'react'
import type { Exam, Subject } from '@/types'

interface ClassOption { id: string; name: string; section: string }

const inp: React.CSSProperties = {
  width: '100%', padding: '8px 12px', border: '1.5px solid #e2e8f0',
  borderRadius: 8, fontSize: 13, background: '#f8fafc', fontFamily: 'inherit', outline: 'none',
}
const lbl: React.CSSProperties = { fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 5 }

const EXAM_TYPES = ['midterm','final','unit','monthly','other']
const DEFAULT_SUBJECTS = ['English','Mathematics','Science','Urdu','Social Study','Islamiat','Computer']

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  upcoming:  { bg: '#eff6ff', color: '#1d4ed8', label: 'Upcoming' },
  ongoing:   { bg: '#fefce8', color: '#ca8a04', label: 'Ongoing' },
  completed: { bg: '#f0fdf4', color: '#15803d', label: 'Completed' },
  published: { bg: '#f5f3ff', color: '#6d28d9', label: 'Published' },
}

function gradeColor(g?: string) {
  if (!g) return '#94a3b8'
  if (g === 'A+' || g === 'A') return '#16a34a'
  if (g === 'B') return '#0284c7'
  if (g === 'C') return '#d97706'
  if (g === 'D') return '#ea580c'
  return '#dc2626'
}

type View = 'list' | 'create' | 'detail' | 'marks'

export default function ExamsManager({
  exams: init, classes, schoolId,
}: {
  exams: any[]; classes: ClassOption[]; schoolId: string
}) {
  const [exams, setExams]         = useState<any[]>(init)
  const [view, setView]           = useState<View>('list')
  const [activeExam, setActiveExam] = useState<any>(null)
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')
  const [filterStatus, setFilter] = useState('')
  const [filterClass, setFilterClass] = useState('')

  // Marks entry state
  const [marksData, setMarksData]     = useState<Record<string, Record<string, string>>>({}) // subjectId → studentId → marks
  const [students, setStudents]       = useState<any[]>([])
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [savingMarks, setSavingMarks] = useState(false)
  const [savedMarks, setSavedMarks]   = useState(false)
  const [existingMarks, setExistingMarks] = useState<any[]>([])

  // Create exam form
  const [examForm, setExamForm] = useState({
    title: '', exam_type: 'midterm', class_name: '', section: '',
    total_marks: 500, passing_marks: 200,
    exam_date: new Date().toISOString().split('T')[0],
    status: 'upcoming', description: '',
  })
  const [subjectList, setSubjectList] = useState<{ name: string; total_marks: number; passing_marks: number }[]>([
    { name: 'English', total_marks: 100, passing_marks: 40 },
    { name: 'Mathematics', total_marks: 100, passing_marks: 40 },
    { name: 'Science', total_marks: 100, passing_marks: 40 },
    { name: 'Urdu', total_marks: 100, passing_marks: 40 },
    { name: 'Social Study', total_marks: 100, passing_marks: 40 },
  ])

  function handleClassSelect(classId: string) {
    const c = classes.find(cl => cl.id === classId)
    if (c) setExamForm(f => ({ ...f, class_name: c.name, section: c.section }))
  }

  function addSubject() {
    setSubjectList(p => [...p, { name: '', total_marks: 100, passing_marks: 40 }])
  }

  function removeSubject(i: number) {
    setSubjectList(p => p.filter((_, idx) => idx !== i))
  }

  async function handleCreateExam(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError('')
    try {
      const res = await fetch('/api/exams', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...examForm, subjects: subjectList }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); setSaving(false); return }
      setExams(p => [{ ...data, subjects: subjectList }, ...p])
      setView('list')
    } catch { setError('Network error.') }
    setSaving(false)
  }

  async function openMarksEntry(exam: any) {
    setActiveExam(exam); setView('marks')
    setLoadingStudents(true); setMarksData({}); setExistingMarks([])
    // Fetch students for this class
    const res = await fetch(`/api/students?class_name=${encodeURIComponent(exam.class_name)}&section=${encodeURIComponent(exam.section)}`)
    if (res.ok) {
      const data = await res.json()
      setStudents(data)
    }
    // Fetch existing marks
    const mRes = await fetch(`/api/exams/${exam.id}/marks`)
    if (mRes.ok) {
      const mData = await mRes.json()
      setExistingMarks(mData)
      // Pre-fill marksData
      const filled: Record<string, Record<string, string>> = {}
      mData.forEach((m: any) => {
        if (!filled[m.subject_id]) filled[m.subject_id] = {}
        filled[m.subject_id][m.student_id] = String(m.marks_obtained)
      })
      setMarksData(filled)
    }
    setLoadingStudents(false)
  }

  async function handleSaveMarks() {
    setSavingMarks(true)
    const marks: any[] = []
    Object.entries(marksData).forEach(([subjectId, studentMap]) => {
      Object.entries(studentMap).forEach(([studentId, val]) => {
        if (val !== '') marks.push({ subject_id: subjectId, student_id: studentId, marks_obtained: Number(val) })
      })
    })
    await fetch(`/api/exams/${activeExam.id}/marks`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ marks }),
    })
    setSavingMarks(false); setSavedMarks(true)
    setTimeout(() => setSavedMarks(false), 3000)
  }

  async function handleDeleteExam(id: string) {
    if (!confirm('Delete this exam? All marks will be lost.')) return
    const res = await fetch(`/api/exams/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setExams(p => p.filter(e => e.id !== id))
    } else {
      const data = await res.json()
      alert(`Failed to delete exam: ${data.error || 'Unknown error'}`)
    }
  }

  async function handleStatusChange(exam: any, status: string) {
    await fetch(`/api/exams/${exam.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setExams(p => p.map(e => e.id === exam.id ? { ...e, status } : e))
  }

  const filtered = exams.filter(e =>
    (!filterStatus || e.status === filterStatus) &&
    (!filterClass || e.class_name === filterClass)
  )

  const classNames = [...new Set(exams.map(e => e.class_name))].sort()

  // ── Marks entry view ──────────────────────────────────────
  if (view === 'marks' && activeExam) {
    const subjects: Subject[] = activeExam.subjects ?? []
    return (
      <div style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.5rem' }}>
          <button onClick={() => setView('list')} style={{ padding: '7px 14px', border: '1px solid #e2e8f0', borderRadius: 8, background: 'white', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>← Back</button>
          <div>
            <h1 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Enter Marks</h1>
            <p style={{ fontSize: 13, color: '#64748b', margin: '2px 0 0' }}>{activeExam.title} · {activeExam.class_name} Section {activeExam.section}</p>
          </div>
        </div>

        {loadingStudents
          ? <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>Loading students…</div>
          : subjects.length === 0
          ? <div className="card" style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>No subjects added to this exam. Edit the exam to add subjects.</div>
          : students.length === 0
          ? <div className="card" style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>No students found in {activeExam.class_name} Section {activeExam.section}.</div>
          : (
            <>
              {/* Subject tabs */}
              {subjects.map(subject => (
                <div key={subject.id} className="card" style={{ marginBottom: '1.25rem', overflow: 'hidden' }}>
                  <div style={{ padding: '12px 16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontWeight: 600, color: '#0f172a', fontSize: 14 }}>{subject.name}</span>
                      <span style={{ fontSize: 12, color: '#94a3b8', marginLeft: 8 }}>Total: {subject.total_marks} marks | Pass: {subject.passing_marks}</span>
                    </div>
                    <span style={{ fontSize: 12, color: '#64748b' }}>
                      {Object.values(marksData[subject.id] ?? {}).filter(v => v !== '').length}/{students.length} entered
                    </span>
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <th style={{ padding: '8px 14px', textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: 12 }}>Roll No</th>
                        <th style={{ padding: '8px 14px', textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: 12 }}>Student Name</th>
                        <th style={{ padding: '8px 14px', textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: 12, width: 140 }}>Marks (out of {subject.total_marks})</th>
                        <th style={{ padding: '8px 14px', textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: 12, width: 60 }}>Grade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((st: any, i: number) => {
                        const val = marksData[subject.id]?.[st.id] ?? ''
                        const num = Number(val)
                        const pct = val ? (num / subject.total_marks) * 100 : null
                        const grade = pct !== null ? (pct >= 90 ? 'A+' : pct >= 80 ? 'A' : pct >= 70 ? 'B' : pct >= 60 ? 'C' : pct >= 40 ? 'D' : 'F') : ''
                        return (
                          <tr key={st.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 ? '#fafafa' : 'white' }}>
                            <td style={{ padding: '8px 14px', fontFamily: 'monospace', color: '#6366f1', fontWeight: 500 }}>{st.roll_number}</td>
                            <td style={{ padding: '8px 14px', fontWeight: 500, color: '#0f172a' }}>{st.full_name}</td>
                            <td style={{ padding: '8px 14px' }}>
                              <input
                                type="number" min="0" max={subject.total_marks}
                                value={val}
                                onChange={e => {
                                  const v = e.target.value
                                  setMarksData(p => ({
                                    ...p,
                                    [subject.id]: { ...(p[subject.id] ?? {}), [st.id]: v }
                                  }))
                                }}
                                style={{ ...inp, width: 110, padding: '6px 10px' }}
                                placeholder="0"
                              />
                            </td>
                            <td style={{ padding: '8px 14px' }}>
                              {grade && (
                                <span style={{ fontWeight: 700, color: gradeColor(grade), fontSize: 14 }}>{grade}</span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ))}

              <button onClick={handleSaveMarks} disabled={savingMarks} style={{
                padding: '11px 28px', background: savedMarks ? '#16a34a' : savingMarks ? '#a5b4fc' : '#4f46e5',
                color: 'white', border: 'none', borderRadius: 8, fontSize: 14,
                fontWeight: 600, cursor: savingMarks ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
              }}>
                {savedMarks ? '✓ Marks Saved!' : savingMarks ? 'Saving…' : 'Save All Marks'}
              </button>
            </>
          )
        }
      </div>
    )
  }

  // ── Create exam view ──────────────────────────────────────
  if (view === 'create') {
    return (
      <div style={{ padding: '2rem', maxWidth: 700 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.5rem' }}>
          <button onClick={() => setView('list')} style={{ padding: '7px 14px', border: '1px solid #e2e8f0', borderRadius: 8, background: 'white', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>← Back</button>
          <h1 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Create New Exam</h1>
        </div>

        {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', color: '#dc2626', fontSize: 13, marginBottom: '1rem' }}>⚠ {error}</div>}

        <form onSubmit={handleCreateExam}>
          {/* Exam details */}
          <div className="card" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', margin: '0 0 1rem' }}>Exam Details</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={lbl}>Exam Title *</label>
                <input required style={inp} value={examForm.title} placeholder="e.g. Mid Term Exam 2026"
                  onChange={e => setExamForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div>
                <label style={lbl}>Exam Type *</label>
                <select required style={inp} value={examForm.exam_type} onChange={e => setExamForm(f => ({ ...f, exam_type: e.target.value }))}>
                  {EXAM_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Class *</label>
                <select required style={inp} value={classes.find(c => c.name === examForm.class_name && c.section === examForm.section)?.id ?? ''}
                  onChange={e => handleClassSelect(e.target.value)}>
                  <option value="">Select class…</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name} — Section {c.section}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Exam Date *</label>
                <input required type="date" style={inp} value={examForm.exam_date}
                  onChange={e => setExamForm(f => ({ ...f, exam_date: e.target.value }))} />
              </div>
              <div>
                <label style={lbl}>Total Marks</label>
                <input type="number" style={inp} value={examForm.total_marks}
                  onChange={e => setExamForm(f => ({ ...f, total_marks: Number(e.target.value) }))} />
              </div>
              <div>
                <label style={lbl}>Passing Marks</label>
                <input type="number" style={inp} value={examForm.passing_marks}
                  onChange={e => setExamForm(f => ({ ...f, passing_marks: Number(e.target.value) }))} />
              </div>
              <div>
                <label style={lbl}>Status</label>
                <select style={inp} value={examForm.status} onChange={e => setExamForm(f => ({ ...f, status: e.target.value }))}>
                  {Object.keys(STATUS_STYLE).map(s => <option key={s} value={s}>{STATUS_STYLE[s].label}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Description</label>
                <input style={inp} value={examForm.description} placeholder="Optional note…"
                  onChange={e => setExamForm(f => ({ ...f, description: e.target.value }))} />
              </div>
            </div>
          </div>

          {/* Subjects */}
          <div className="card" style={{ padding: '1.5rem', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', margin: 0 }}>Subjects ({subjectList.length})</h2>
              <button type="button" onClick={addSubject} style={{ padding: '5px 12px', border: '1px solid #c7d2fe', borderRadius: 6, background: '#eef2ff', cursor: 'pointer', fontSize: 12, color: '#4f46e5', fontFamily: 'inherit' }}>+ Add Subject</button>
            </div>
            {subjectList.map((sub, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 8, marginBottom: 8, alignItems: 'end' }}>
                <div>
                  {i === 0 && <label style={lbl}>Subject Name</label>}
                  <input style={inp} value={sub.name} placeholder="e.g. Mathematics"
                    onChange={e => setSubjectList(p => p.map((s, idx) => idx === i ? { ...s, name: e.target.value } : s))} />
                </div>
                <div>
                  {i === 0 && <label style={lbl}>Total</label>}
                  <input type="number" style={inp} value={sub.total_marks}
                    onChange={e => setSubjectList(p => p.map((s, idx) => idx === i ? { ...s, total_marks: Number(e.target.value) } : s))} />
                </div>
                <div>
                  {i === 0 && <label style={lbl}>Pass</label>}
                  <input type="number" style={inp} value={sub.passing_marks}
                    onChange={e => setSubjectList(p => p.map((s, idx) => idx === i ? { ...s, passing_marks: Number(e.target.value) } : s))} />
                </div>
                <button type="button" onClick={() => removeSubject(i)}
                  style={{ padding: '8px 10px', border: '1px solid #fecaca', borderRadius: 6, background: '#fef2f2', cursor: 'pointer', color: '#dc2626', fontFamily: 'inherit', marginTop: i === 0 ? 20 : 0 }}>
                  ×
                </button>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" onClick={() => setView('list')} style={{ padding: '10px 20px', border: '1px solid #e2e8f0', borderRadius: 8, background: 'white', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>Cancel</button>
            <button type="submit" disabled={saving} style={{ padding: '10px 28px', background: saving ? '#a5b4fc' : '#4f46e5', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
              {saving ? 'Creating…' : 'Create Exam'}
            </button>
          </div>
        </form>
      </div>
    )
  }

  // ── Main list view ────────────────────────────────────────
  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Exams & Marks</h1>
          <p style={{ color: '#64748b', fontSize: 13, marginTop: 3 }}>{exams.length} exams total</p>
        </div>
        <button onClick={() => setView('create')} style={{ padding: '9px 18px', background: '#4f46e5', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          + Create Exam
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {Object.entries(STATUS_STYLE).map(([status, cfg]) => (
          <div key={status} className="card" style={{ padding: '1rem' }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{cfg.label}</p>
            <p style={{ fontSize: '1.6rem', fontWeight: 700, color: cfg.color, margin: 0 }}>
              {exams.filter(e => e.status === status).length}
            </p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <select value={filterStatus} onChange={e => setFilter(e.target.value)} style={{ ...inp, width: 'auto' }}>
          <option value="">All statuses</option>
          {Object.entries(STATUS_STYLE).map(([s, cfg]) => <option key={s} value={s}>{cfg.label}</option>)}
        </select>
        <select value={filterClass} onChange={e => setFilterClass(e.target.value)} style={{ ...inp, width: 'auto' }}>
          <option value="">All classes</option>
          {classNames.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Exam cards */}
      {filtered.length === 0
        ? <div className="card" style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>No exams found. Create your first exam!</div>
        : <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(exam => {
            const ss = STATUS_STYLE[exam.status] ?? STATUS_STYLE.upcoming
            const subjects: Subject[] = exam.subjects ?? []
            return (
              <div key={exam.id} className="card" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                      <h2 style={{ fontSize: 15, fontWeight: 600, color: '#0f172a', margin: 0 }}>{exam.title}</h2>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: ss.bg, color: ss.color }}>
                        {ss.label}
                      </span>
                      <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, background: '#f1f5f9', color: '#475569', textTransform: 'capitalize' }}>
                        {exam.exam_type}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13, color: '#475569' }}>
                      <span>🏫 {exam.class_name} — Section {exam.section}</span>
                      <span>📅 {new Date(exam.exam_date + 'T12:00:00').toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      <span>📊 {exam.total_marks} marks | Pass: {exam.passing_marks}</span>
                      <span>📚 {subjects.length} subjects: {subjects.map(s => s.name).join(', ')}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap' }}>
                    {(exam.status === 'completed' || exam.status === 'ongoing') && (
                      <button onClick={() => openMarksEntry(exam)} style={{ padding: '6px 14px', border: '1px solid #bbf7d0', borderRadius: 6, background: '#f0fdf4', cursor: 'pointer', fontSize: 12, color: '#16a34a', fontFamily: 'inherit', fontWeight: 500 }}>
                        ✏ Enter Marks
                      </button>
                    )}
                    {exam.status === 'upcoming' && (
                      <button onClick={() => handleStatusChange(exam, 'ongoing')} style={{ padding: '6px 14px', border: '1px solid #fde68a', borderRadius: 6, background: '#fefce8', cursor: 'pointer', fontSize: 12, color: '#ca8a04', fontFamily: 'inherit' }}>
                        Start Exam
                      </button>
                    )}
                    {exam.status === 'ongoing' && (
                      <button onClick={() => handleStatusChange(exam, 'completed')} style={{ padding: '6px 14px', border: '1px solid #bbf7d0', borderRadius: 6, background: '#f0fdf4', cursor: 'pointer', fontSize: 12, color: '#16a34a', fontFamily: 'inherit' }}>
                        Mark Complete
                      </button>
                    )}
                    {exam.status === 'completed' && (
                      <button onClick={() => handleStatusChange(exam, 'published')} style={{ padding: '6px 14px', border: '1px solid #ddd6fe', borderRadius: 6, background: '#f5f3ff', cursor: 'pointer', fontSize: 12, color: '#6d28d9', fontFamily: 'inherit' }}>
                        Publish Results
                      </button>
                    )}
                    <button onClick={() => openMarksEntry(exam)} style={{ padding: '6px 14px', border: '1px solid #e0e7ff', borderRadius: 6, background: '#eef2ff', cursor: 'pointer', fontSize: 12, color: '#4f46e5', fontFamily: 'inherit' }}>
                      View Marks
                    </button>
                    <button onClick={() => handleDeleteExam(exam.id)} style={{ padding: '6px 14px', border: '1px solid #fecaca', borderRadius: 6, background: '#fef2f2', cursor: 'pointer', fontSize: 12, color: '#dc2626', fontFamily: 'inherit' }}>
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      }
    </div>
  )
}
