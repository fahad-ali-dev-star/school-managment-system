'use client'
import { useState } from 'react'
import type { Subject } from '@/types'

const inp: React.CSSProperties = {
  width: '100%', padding: '8px 12px', border: '1.5px solid #e2e8f0',
  borderRadius: 8, fontSize: 13, background: '#f8fafc', fontFamily: 'inherit', outline: 'none',
}

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

export default function TeacherExamsManager({
  exams: init, schoolId, className, section,
}: {
  exams: any[]; schoolId: string; className: string; section: string
}) {
  const [exams] = useState<any[]>(init)
  const [view, setView]           = useState<'list' | 'marks'>('list')
  const [activeExam, setActiveExam] = useState<any>(null)
  const [marksData, setMarksData]   = useState<Record<string, Record<string, string>>>({})
  const [students, setStudents]     = useState<any[]>([])
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [savingMarks, setSavingMarks] = useState(false)
  const [savedMarks, setSavedMarks]   = useState(false)

  async function openMarksEntry(exam: any) {
    setActiveExam(exam); setView('marks')
    setLoadingStudents(true); setMarksData({})
    const res = await fetch(`/api/students?class_name=${encodeURIComponent(exam.class_name)}&section=${encodeURIComponent(exam.section)}`)
    if (res.ok) setStudents(await res.json())
    const mRes = await fetch(`/api/exams/${exam.id}/marks`)
    if (mRes.ok) {
      const mData = await mRes.json()
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

  if (view === 'marks' && activeExam) {
    const subjects: Subject[] = activeExam.subjects ?? []
    return (
      <div style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.5rem' }}>
          <button onClick={() => setView('list')} style={{ padding: '7px 14px', border: '1px solid #e2e8f0', borderRadius: 8, background: 'white', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>← Back</button>
          <div>
            <h1 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Enter / Edit Marks</h1>
            <p style={{ fontSize: 13, color: '#64748b', margin: '2px 0 0' }}>{activeExam.title} · {activeExam.class_name} Section {activeExam.section}</p>
          </div>
        </div>

        {loadingStudents
          ? <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>Loading…</div>
          : subjects.length === 0
          ? <div className="card" style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>No subjects added to this exam.</div>
          : subjects.map(subject => (
            <div key={subject.id} className="card" style={{ marginBottom: '1.25rem', overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>{subject.name}</span>
                <span style={{ fontSize: 12, color: '#94a3b8' }}>Max: {subject.total_marks} | Pass: {subject.passing_marks}</span>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    {['Roll No', 'Student', 'Marks', 'Grade'].map(h => (
                      <th key={h} style={{ padding: '8px 14px', textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: 12 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {students.map((st: any, i: number) => {
                    const val  = marksData[subject.id]?.[st.id] ?? ''
                    const num  = Number(val)
                    const pct  = val ? (num / subject.total_marks) * 100 : null
                    const grade = pct !== null ? (pct >= 90 ? 'A+' : pct >= 80 ? 'A' : pct >= 70 ? 'B' : pct >= 60 ? 'C' : pct >= 40 ? 'D' : 'F') : ''
                    return (
                      <tr key={st.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 ? '#fafafa' : 'white' }}>
                        <td style={{ padding: '8px 14px', fontFamily: 'monospace', color: '#6366f1' }}>{st.roll_number}</td>
                        <td style={{ padding: '8px 14px', fontWeight: 500, color: '#0f172a' }}>{st.full_name}</td>
                        <td style={{ padding: '8px 14px' }}>
                          <input type="number" min="0" max={subject.total_marks} value={val} placeholder="0"
                            onChange={e => setMarksData(p => ({ ...p, [subject.id]: { ...(p[subject.id] ?? {}), [st.id]: e.target.value } }))}
                            style={{ ...inp, width: 110, padding: '6px 10px' }} />
                        </td>
                        <td style={{ padding: '8px 14px' }}>
                          {grade && <span style={{ fontWeight: 700, color: gradeColor(grade) }}>{grade}</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ))
        }

        {!loadingStudents && subjects.length > 0 && students.length > 0 && (
          <button onClick={handleSaveMarks} disabled={savingMarks} style={{
            padding: '11px 28px', background: savedMarks ? '#16a34a' : savingMarks ? '#a5b4fc' : '#4f46e5',
            color: 'white', border: 'none', borderRadius: 8, fontSize: 14,
            fontWeight: 600, cursor: savingMarks ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
          }}>
            {savedMarks ? '✓ Marks Saved!' : savingMarks ? 'Saving…' : 'Save All Marks'}
          </button>
        )}
      </div>
    )
  }

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Exams & Marks</h1>
        <p style={{ color: '#64748b', fontSize: 13, marginTop: 3 }}>{className} — Section {section} &nbsp;·&nbsp; {exams.length} exam(s)</p>
      </div>

      {exams.length === 0
        ? <div className="card" style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>No exams found for your class yet.</div>
        : <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {exams.map(exam => {
            const ss = STATUS_STYLE[exam.status] ?? STATUS_STYLE.upcoming
            const subjects: Subject[] = exam.subjects ?? []
            return (
              <div key={exam.id} className="card" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                      <h2 style={{ fontSize: 15, fontWeight: 600, color: '#0f172a', margin: 0 }}>{exam.title}</h2>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: ss.bg, color: ss.color }}>{ss.label}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13, color: '#475569' }}>
                      <span>📅 {new Date(exam.exam_date + 'T12:00:00').toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      <span>📊 {exam.total_marks} marks</span>
                      <span>📚 {subjects.length} subjects</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap' }}>
                    <button onClick={() => openMarksEntry(exam)} style={{ padding: '6px 14px', border: '1px solid #bbf7d0', borderRadius: 6, background: '#f0fdf4', cursor: 'pointer', fontSize: 12, color: '#16a34a', fontFamily: 'inherit', fontWeight: 500 }}>
                      ✏ Enter / Edit Marks
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
