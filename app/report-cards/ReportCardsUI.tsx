'use client'
import { useState } from 'react'
import { generateReportCardPDF } from '@/lib/pdfGenerator'

interface ExamOption {
  id: string; title: string; class_name: string
  section: string; exam_date: string; status: string; exam_type: string
}

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  completed: { bg: '#f0fdf4', color: '#15803d' },
  published: { bg: '#f5f3ff', color: '#6d28d9' },
}

function gradeColor(g: string) {
  if (g === 'A+' || g === 'A') return '#16a34a'
  if (g === 'B') return '#0284c7'
  if (g === 'C') return '#d97706'
  if (g === 'D') return '#ea580c'
  return '#dc2626'
}

export default function ReportCardsUI({ exams }: { exams: ExamOption[] }) {
  const [selectedExam, setSelectedExam] = useState<string>('')
  const [reportData, setReportData]     = useState<any>(null)
  const [loading, setLoading]           = useState(false)
  const [downloading, setDownloading]   = useState<string | null>(null)
  const [error, setError]               = useState('')
  const [activeStudent, setActiveStudent] = useState<string | null>(null)

  async function loadReports(examId: string) {
    if (!examId) return
    setLoading(true); setError(''); setReportData(null); setActiveStudent(null)
    try {
      const res = await fetch(`/api/report-cards?exam_id=${examId}`)
      if (!res.ok) {
        const err = await res.json()
        setError(err.error ?? 'Failed to load report data')
      } else {
        const data = await res.json()
        setReportData(data)
        if (data.reports?.length > 0) setActiveStudent(data.reports[0].student.id)
      }
    } catch { setError('Network error. Please try again.') }
    setLoading(false)
  }

  async function downloadPDF(studentId?: string) {
    const key = studentId ?? 'all'
    setDownloading(key)
    try {
      let data = reportData
      if (studentId) {
        data = { ...reportData, reports: reportData.reports.filter((r: any) => r.student.id === studentId) }
      }
      generateReportCardPDF(data)
    } catch (e) { console.error(e) }
    setTimeout(() => setDownloading(null), 1500)
  }

  const activeReport = reportData?.reports?.find((r: any) => r.student.id === activeStudent)

  return (
    <div style={{ padding: '2rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>📄 Report Cards</h1>
        <p style={{ color: '#64748b', fontSize: 13, marginTop: 3 }}>Generate and download PDF result cards per student</p>
      </div>

      {/* Exam selector */}
      <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', margin: '0 0 10px' }}>Select an exam to generate report cards</p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: 260 }}>
            <select
              value={selectedExam}
              onChange={e => { setSelectedExam(e.target.value); loadReports(e.target.value) }}
              style={{
                width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0',
                borderRadius: 8, fontSize: 13, background: '#f8fafc', fontFamily: 'inherit', outline: 'none',
              }}
            >
              <option value="">Choose exam…</option>
              {exams.map(e => (
                <option key={e.id} value={e.id}>
                  {e.title} — {e.class_name} Sec {e.section} ({new Date(e.exam_date + 'T12:00:00').toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })})
                </option>
              ))}
            </select>
          </div>
          {exams.length === 0 && (
            <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>
              No completed or published exams yet. Complete an exam in the Exams section first.
            </p>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 16px', color: '#dc2626', fontSize: 13, marginBottom: '1rem' }}>
          ⚠ {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
          <div style={{ width: 36, height: 36, border: '3px solid #e2e8f0', borderTop: '3px solid #4f46e5', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 12px' }} />
          Loading report data…
          <style>{`@keyframes spin { to { transform:rotate(360deg) } }`}</style>
        </div>
      )}

      {/* Report cards UI */}
      {reportData && !loading && (
        <>
          {/* Exam summary + Download All */}
          <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h2 style={{ fontSize: 15, fontWeight: 600, color: '#0f172a', margin: '0 0 4px' }}>{reportData.exam.title}</h2>
                <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
                  {reportData.exam.class_name} — Section {reportData.exam.section} &nbsp;·&nbsp;
                  {reportData.reports.length} students &nbsp;·&nbsp;
                  Total marks: {reportData.exam.total_marks} &nbsp;·&nbsp;
                  Pass marks: {reportData.exam.passing_marks}
                </p>
              </div>
              <button
                onClick={() => downloadPDF()}
                disabled={downloading === 'all'}
                style={{
                  padding: '9px 20px', background: downloading === 'all' ? '#a5b4fc' : '#4f46e5',
                  color: 'white', border: 'none', borderRadius: 8, fontSize: 13,
                  fontWeight: 600, cursor: downloading === 'all' ? 'wait' : 'pointer', fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', gap: 7,
                }}
              >
                {downloading === 'all' ? '⏳ Generating…' : '⬇ Download All PDFs'}
              </button>
            </div>
          </div>

          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            {[
              { label: 'Total Students', value: reportData.reports.length, color: '#4f46e5' },
              { label: 'Passed', value: reportData.reports.filter((r: any) => r.passed).length, color: '#16a34a' },
              { label: 'Failed', value: reportData.reports.filter((r: any) => !r.passed).length, color: '#dc2626' },
              { label: 'Avg Score', value: reportData.reports.length ? `${Math.round(reportData.reports.reduce((s: number, r: any) => s + r.percentage, 0) / reportData.reports.length)}%` : '0%', color: '#0284c7' },
              { label: 'Top Score', value: `${Math.max(...reportData.reports.map((r: any) => r.percentage))}%`, color: '#d97706' },
            ].map((s, i) => (
              <div key={i} className="card" style={{ padding: '1rem' }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 6px' }}>{s.label}</p>
                <p style={{ fontSize: '1.5rem', fontWeight: 700, color: s.color, margin: 0 }}>{s.value}</p>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '1.5rem', alignItems: 'start' }}>
            {/* Student list */}
            <div className="card" style={{ overflow: 'hidden', position: 'sticky', top: 20 }}>
              <div style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#475569', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Students ({reportData.reports.length})
                </p>
              </div>
              {reportData.reports.map((r: any) => (
                <button
                  key={r.student.id}
                  onClick={() => setActiveStudent(r.student.id)}
                  style={{
                    width: '100%', padding: '10px 14px', border: 'none',
                    borderBottom: '1px solid #f1f5f9', cursor: 'pointer',
                    background: activeStudent === r.student.id ? '#eef2ff' : 'white',
                    textAlign: 'left', fontFamily: 'inherit',
                    transition: 'background 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: activeStudent === r.student.id ? 600 : 400, color: '#0f172a', margin: 0 }}>{r.student.full_name}</p>
                      <p style={{ fontSize: 11, color: '#94a3b8', margin: '1px 0 0', fontFamily: 'monospace' }}>{r.student.roll_number}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: gradeColor(r.overallGrade) }}>{r.overallGrade}</span>
                      <p style={{ fontSize: 10, color: r.passed ? '#16a34a' : '#dc2626', margin: '1px 0 0', fontWeight: 600 }}>
                        {r.passed ? 'PASS' : 'FAIL'}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Report preview + download */}
            {activeReport && (
              <div>
                {/* Download single */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h2 style={{ fontSize: 15, fontWeight: 600, color: '#0f172a', margin: 0 }}>
                    {activeReport.student.full_name}'s Report Card
                  </h2>
                  <button
                    onClick={() => downloadPDF(activeReport.student.id)}
                    disabled={downloading === activeReport.student.id}
                    style={{
                      padding: '8px 18px',
                      background: downloading === activeReport.student.id ? '#a5b4fc' : '#4f46e5',
                      color: 'white', border: 'none', borderRadius: 8, fontSize: 13,
                      fontWeight: 600, cursor: downloading === activeReport.student.id ? 'wait' : 'pointer',
                      fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6,
                    }}
                  >
                    {downloading === activeReport.student.id ? '⏳ Generating…' : '⬇ Download PDF'}
                  </button>
                </div>

                {/* Preview card */}
                <div className="card" style={{ overflow: 'hidden' }}>
                  {/* Header */}
                  <div style={{ background: '#4f46e5', padding: '1.25rem', textAlign: 'center' }}>
                    <p style={{ fontSize: 18, fontWeight: 700, color: 'white', margin: '0 0 2px' }}>{reportData.school.name.toUpperCase()}</p>
                    <p style={{ fontSize: 11, color: '#c7d2fe', margin: 0 }}>{reportData.school.address}</p>
                    <div style={{ display: 'inline-block', background: 'white', color: '#4f46e5', fontSize: 11, fontWeight: 700, padding: '3px 14px', borderRadius: 20, marginTop: 8 }}>
                      STUDENT RESULT CARD
                    </div>
                  </div>

                  {/* Exam + student info */}
                  <div style={{ padding: '1.25rem', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ background: '#f8fafc', borderRadius: 8, padding: '8px 12px', marginBottom: '1rem', fontSize: 12, color: '#475569', textAlign: 'center' }}>
                      <strong>{activeReport.exam.title}</strong> &nbsp;·&nbsp;
                      {activeReport.exam.class_name} — Section {activeReport.exam.section} &nbsp;·&nbsp;
                      {new Date(activeReport.exam.exam_date + 'T12:00:00').toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem', alignItems: 'start' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px', fontSize: 13 }}>
                        {[
                          ['Student', activeReport.student.full_name],
                          ['Roll No', activeReport.student.roll_number],
                          ['Father', activeReport.student.parent_name],
                          ['Class', `${activeReport.student.class_name} — Sec ${activeReport.student.section}`],
                          ['Rank', `${activeReport.rank} of ${activeReport.totalStudents}`],
                          ['Contact', activeReport.student.parent_phone],
                        ].map(([k, v]) => (
                          <div key={k}>
                            <span style={{ color: '#94a3b8', fontSize: 11 }}>{k}: </span>
                            <span style={{ fontWeight: 500, color: '#0f172a' }}>{v}</span>
                          </div>
                        ))}
                      </div>

                      {/* Grade circle */}
                      <div style={{ textAlign: 'center' }}>
                        <div style={{
                          width: 72, height: 72, borderRadius: '50%',
                          background: gradeColor(activeReport.overallGrade),
                          display: 'flex', flexDirection: 'column',
                          alignItems: 'center', justifyContent: 'center',
                        }}>
                          <span style={{ fontSize: 22, fontWeight: 700, color: 'white' }}>{activeReport.overallGrade}</span>
                        </div>
                        <p style={{ fontSize: 11, color: '#64748b', margin: '4px 0 0' }}>
                          {activeReport.totalObtained}/{activeReport.totalPossible}
                        </p>
                        <p style={{ fontSize: 11, fontWeight: 700, color: activeReport.passed ? '#16a34a' : '#dc2626', margin: '2px 0 0' }}>
                          {activeReport.passed ? '✓ PASS' : '✗ FAIL'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Subject marks table */}
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: '#4f46e5' }}>
                        {['Subject', 'Max', 'Pass', 'Obtained', '%', 'Grade', 'Result'].map(h => (
                          <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontWeight: 600, color: 'white', fontSize: 12 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {activeReport.subjectMarks.map((sm: any, i: number) => (
                        <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 ? '#fafafa' : 'white' }}>
                          <td style={{ padding: '10px 12px', fontWeight: 500, color: '#0f172a' }}>{sm.subject}</td>
                          <td style={{ padding: '10px 12px', color: '#64748b' }}>{sm.total_marks}</td>
                          <td style={{ padding: '10px 12px', color: '#64748b' }}>{sm.passing_marks}</td>
                          <td style={{ padding: '10px 12px', fontWeight: 600, color: '#0f172a' }}>
                            {sm.obtained !== null ? sm.obtained : <span style={{ color: '#94a3b8' }}>—</span>}
                          </td>
                          <td style={{ padding: '10px 12px', color: '#64748b' }}>
                            {sm.obtained !== null ? `${Math.round((sm.obtained / sm.total_marks) * 100)}%` : '—'}
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            {sm.grade && <span style={{ fontWeight: 700, color: gradeColor(sm.grade) }}>{sm.grade}</span>}
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            {sm.passed !== null && (
                              <span style={{ fontSize: 11, fontWeight: 700, color: sm.passed ? '#16a34a' : '#dc2626' }}>
                                {sm.passed ? 'PASS' : 'FAIL'}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {/* Total row */}
                      <tr style={{ background: '#f1f5f9', borderTop: '2px solid #e2e8f0' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 700, color: '#0f172a' }}>TOTAL</td>
                        <td style={{ padding: '10px 12px', fontWeight: 700 }}>{activeReport.totalPossible}</td>
                        <td style={{ padding: '10px 12px', fontWeight: 700 }}>{reportData.exam.passing_marks}</td>
                        <td style={{ padding: '10px 12px', fontWeight: 700, color: gradeColor(activeReport.overallGrade) }}>
                          {activeReport.totalObtained}
                        </td>
                        <td style={{ padding: '10px 12px', fontWeight: 700, color: gradeColor(activeReport.overallGrade) }}>
                          {activeReport.percentage}%
                        </td>
                        <td style={{ padding: '10px 12px', fontWeight: 700, color: gradeColor(activeReport.overallGrade) }}>
                          {activeReport.overallGrade}
                        </td>
                        <td style={{ padding: '10px 12px', fontWeight: 700, color: activeReport.passed ? '#16a34a' : '#dc2626' }}>
                          {activeReport.passed ? '✓ PASS' : '✗ FAIL'}
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Attendance */}
                  <div style={{ padding: '1.25rem', borderTop: '1px solid #f1f5f9' }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', margin: '0 0 10px' }}>Attendance Summary</p>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      {[
                        { label: 'Total Days', value: activeReport.attendance.totalDays, bg: '#f8fafc', color: '#475569' },
                        { label: 'Present',    value: activeReport.attendance.presentDays, bg: '#f0fdf4', color: '#16a34a' },
                        { label: 'Absent',     value: activeReport.attendance.absentDays,  bg: '#fef2f2', color: '#dc2626' },
                        { label: 'Late',       value: activeReport.attendance.lateDays,    bg: '#fffbeb', color: '#d97706' },
                        { label: 'Rate',       value: `${activeReport.attendance.attPercent}%`, bg: activeReport.attendance.attPercent >= 75 ? '#f0fdf4' : '#fef2f2', color: activeReport.attendance.attPercent >= 75 ? '#16a34a' : '#dc2626' },
                      ].map((a, i) => (
                        <div key={i} style={{ background: a.bg, borderRadius: 8, padding: '10px 16px', textAlign: 'center', flex: 1, minWidth: 70 }}>
                          <p style={{ fontSize: 18, fontWeight: 700, color: a.color, margin: 0 }}>{a.value}</p>
                          <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0' }}>{a.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Grading scale */}
                  <div style={{ padding: '1rem 1.25rem', background: '#f8fafc', borderTop: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#64748b' }}>GRADING SCALE:</span>
                      {[['A+','90-100%'],['A','80-89%'],['B','70-79%'],['C','60-69%'],['D','40-59%'],['F','<40%']].map(([g,r]) => (
                        <span key={g} style={{ fontSize: 11, color: '#64748b' }}>
                          <strong style={{ color: gradeColor(g) }}>{g}</strong> {r}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
