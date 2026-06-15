'use client'
import { useState } from 'react'
import { generateReportCardPDF } from '@/lib/pdfGenerator'

interface Child { id: string; full_name: string; roll_number: string; class_name: string; section: string }
interface ExamOption { id: string; title: string; class_name: string; section: string; exam_date: string; status: string; exam_type: string }

function gradeColor(g: string) {
  if (g === 'A+' || g === 'A') return '#16a34a'
  if (g === 'B') return '#0284c7'
  if (g === 'C') return '#d97706'
  if (g === 'D') return '#ea580c'
  return '#dc2626'
}

export default function ParentReportCards({
  exams, children_, parentEmail,
}: {
  exams: ExamOption[]; children_: Child[]; parentEmail: string
}) {
  const [selectedChild, setSelectedChild] = useState<string>(children_[0]?.id ?? '')
  const [selectedExam,  setSelectedExam]  = useState<string>('')
  const [reportData,    setReportData]    = useState<any>(null)
  const [loading,       setLoading]       = useState(false)
  const [downloading,   setDownloading]   = useState(false)
  const [error,         setError]         = useState('')

  const child = children_.find(c => c.id === selectedChild)
  const availableExams = exams.filter(e => e.class_name === child?.class_name)

  async function loadReport(examId: string) {
    if (!examId || !selectedChild) return
    setLoading(true); setError(''); setReportData(null)
    try {
      const res = await fetch(`/api/report-cards?exam_id=${examId}&student_id=${selectedChild}`)
      if (!res.ok) { const err = await res.json(); setError(err.error ?? 'Failed'); }
      else { setReportData(await res.json()) }
    } catch { setError('Network error.') }
    setLoading(false)
  }

  async function downloadPDF() {
    if (!reportData) return
    setDownloading(true)
    try { generateReportCardPDF(reportData) } catch (e) { console.error(e) }
    setTimeout(() => setDownloading(false), 1500)
  }

  const activeReport = reportData?.reports?.[0]

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Report Cards</h1>
        <p style={{ color: '#64748b', fontSize: 13, marginTop: 3 }}>View and download your child&apos;s result cards</p>
      </div>

      {children_.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
          No children linked to your account. Contact the school admin.
        </div>
      ) : (
        <>
          {/* Selectors */}
          <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 5 }}>Select Child</label>
                <select
                  value={selectedChild}
                  onChange={e => { setSelectedChild(e.target.value); setSelectedExam(''); setReportData(null) }}
                  style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, background: '#f8fafc', fontFamily: 'inherit' }}
                >
                  {children_.map(c => (
                    <option key={c.id} value={c.id}>{c.full_name} — {c.class_name} Sec {c.section}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 5 }}>Select Exam</label>
                <select
                  value={selectedExam}
                  onChange={e => { setSelectedExam(e.target.value); loadReport(e.target.value) }}
                  style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, background: '#f8fafc', fontFamily: 'inherit' }}
                >
                  <option value="">Choose exam…</option>
                  {availableExams.map(e => (
                    <option key={e.id} value={e.id}>{e.title} ({new Date(e.exam_date + 'T12:00:00').toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })})</option>
                  ))}
                </select>
              </div>
            </div>
            {availableExams.length === 0 && child && (
              <p style={{ fontSize: 13, color: '#94a3b8', margin: '10px 0 0' }}>No published exams found for {child.class_name}.</p>
            )}
          </div>

          {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 16px', color: '#dc2626', fontSize: 13, marginBottom: '1rem' }}>⚠ {error}</div>}

          {loading && (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
              <div style={{ width: 36, height: 36, border: '3px solid #e2e8f0', borderTop: '3px solid #7c3aed', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 12px' }} />
              Loading report…
              <style>{`@keyframes spin { to { transform:rotate(360deg) } }`}</style>
            </div>
          )}

          {activeReport && !loading && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: 10 }}>
                <h2 style={{ fontSize: 15, fontWeight: 600, color: '#0f172a', margin: 0 }}>{activeReport.student.full_name}&apos;s Report Card</h2>
                <button onClick={downloadPDF} disabled={downloading} style={{
                  padding: '8px 18px', background: downloading ? '#a5b4fc' : '#7c3aed',
                  color: 'white', border: 'none', borderRadius: 8, fontSize: 13,
                  fontWeight: 600, cursor: downloading ? 'wait' : 'pointer', fontFamily: 'inherit',
                }}>
                  {downloading ? '⏳ Generating…' : '⬇ Download PDF'}
                </button>
              </div>

              {/* Preview */}
              <div className="card" style={{ overflow: 'hidden' }}>
                <div style={{ background: '#7c3aed', padding: '1.25rem', textAlign: 'center' }}>
                  <p style={{ fontSize: 18, fontWeight: 700, color: 'white', margin: '0 0 2px' }}>{reportData.school.name.toUpperCase()}</p>
                  <p style={{ fontSize: 11, color: '#ddd6fe', margin: 0 }}>{reportData.school.address}</p>
                  <div style={{ display: 'inline-block', background: 'white', color: '#7c3aed', fontSize: 11, fontWeight: 700, padding: '3px 14px', borderRadius: 20, marginTop: 8 }}>STUDENT RESULT CARD</div>
                </div>

                <div style={{ padding: '1.25rem', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem', alignItems: 'start' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px', fontSize: 13 }}>
                      {[
                        ['Student', activeReport.student.full_name],
                        ['Roll No', activeReport.student.roll_number],
                        ['Father', activeReport.student.parent_name],
                        ['Class', `${activeReport.student.class_name} — Sec ${activeReport.student.section}`],
                        ['Rank', `${activeReport.rank} of ${activeReport.totalStudents}`],
                      ].map(([k, v]) => (
                        <div key={k}>
                          <span style={{ color: '#94a3b8', fontSize: 11 }}>{k}: </span>
                          <span style={{ fontWeight: 500, color: '#0f172a' }}>{v}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ width: 72, height: 72, borderRadius: '50%', background: gradeColor(activeReport.overallGrade), display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: 22, fontWeight: 700, color: 'white' }}>{activeReport.overallGrade}</span>
                      </div>
                      <p style={{ fontSize: 11, color: '#64748b', margin: '4px 0 0' }}>{activeReport.totalObtained}/{activeReport.totalPossible}</p>
                      <p style={{ fontSize: 11, fontWeight: 700, color: activeReport.passed ? '#16a34a' : '#dc2626', margin: '2px 0 0' }}>{activeReport.passed ? '✓ PASS' : '✗ FAIL'}</p>
                    </div>
                  </div>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#7c3aed' }}>
                      {['Subject', 'Max', 'Obtained', '%', 'Grade', 'Result'].map(h => (
                        <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontWeight: 600, color: 'white', fontSize: 12 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {activeReport.subjectMarks.map((sm: any, i: number) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 ? '#fafafa' : 'white' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 500 }}>{sm.subject}</td>
                        <td style={{ padding: '10px 12px', color: '#64748b' }}>{sm.total_marks}</td>
                        <td style={{ padding: '10px 12px', fontWeight: 600 }}>{sm.obtained !== null ? sm.obtained : '—'}</td>
                        <td style={{ padding: '10px 12px', color: '#64748b' }}>{sm.obtained !== null ? `${Math.round((sm.obtained / sm.total_marks) * 100)}%` : '—'}</td>
                        <td style={{ padding: '10px 12px' }}>{sm.grade && <span style={{ fontWeight: 700, color: gradeColor(sm.grade) }}>{sm.grade}</span>}</td>
                        <td style={{ padding: '10px 12px' }}>{sm.passed !== null && <span style={{ fontSize: 11, fontWeight: 700, color: sm.passed ? '#16a34a' : '#dc2626' }}>{sm.passed ? 'PASS' : 'FAIL'}</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div style={{ padding: '1.25rem', borderTop: '1px solid #f1f5f9' }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', margin: '0 0 10px' }}>Attendance Summary</p>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {[
                      { label: 'Total Days', value: activeReport.attendance.totalDays,    bg: '#f8fafc', color: '#475569' },
                      { label: 'Present',    value: activeReport.attendance.presentDays,  bg: '#f0fdf4', color: '#16a34a' },
                      { label: 'Absent',     value: activeReport.attendance.absentDays,   bg: '#fef2f2', color: '#dc2626' },
                      { label: 'Rate',       value: `${activeReport.attendance.attPercent}%`, bg: activeReport.attendance.attPercent >= 75 ? '#f0fdf4' : '#fef2f2', color: activeReport.attendance.attPercent >= 75 ? '#16a34a' : '#dc2626' },
                    ].map((a, i) => (
                      <div key={i} style={{ background: a.bg, borderRadius: 8, padding: '10px 16px', textAlign: 'center', flex: 1, minWidth: 70 }}>
                        <p style={{ fontSize: 18, fontWeight: 700, color: a.color, margin: 0 }}>{a.value}</p>
                        <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0' }}>{a.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
