'use client'
import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Student } from '@/types'

interface ClassOption { id: string; name: string; section: string }

const inp: React.CSSProperties = {
  width: '100%', padding: '8px 12px', border: '1.5px solid #e2e8f0',
  borderRadius: 8, fontSize: 13, background: '#f8fafc', fontFamily: 'inherit', outline: 'none',
}
const lbl: React.CSSProperties = { fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 5 }

export default function PromoteStudentsModal({
  students,
  classes,
  onClose,
  onSuccess
}: {
  students: Student[]
  classes: ClassOption[]
  onClose: () => void
  onSuccess: () => void
}) {
  const [fromClass, setFromClass] = useState('')
  const [toClassId, setToClassId] = useState('')
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  
  const supabase = createClient()

  // Find all unique class names (for the "From" dropdown, grouping by class name)
  const fromClassNames = useMemo(() => {
    return Array.from(new Set(students.map(s => s.class_name))).sort()
  }, [students])

  // Filter students by selected "From" class
  const studentsInClass = useMemo(() => {
    if (!fromClass) return []
    return students.filter(s => s.class_name === fromClass)
  }, [fromClass, students])

  // Auto-select all students when "From" class changes
  const handleFromClassChange = (cls: string) => {
    setFromClass(cls)
    const inClass = students.filter(s => s.class_name === cls)
    setSelectedStudentIds(new Set(inClass.map(s => s.id)))
    setError('')
  }

  const toggleStudent = (id: string) => {
    const newSet = new Set(selectedStudentIds)
    if (newSet.has(id)) newSet.delete(id)
    else newSet.add(id)
    setSelectedStudentIds(newSet)
  }

  const handlePromote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!toClassId) { setError('Please select a destination class.'); return }
    if (selectedStudentIds.size === 0) { setError('Please select at least one student to promote.'); return }
    
    const targetClass = classes.find(c => c.id === toClassId)
    if (!targetClass) { setError('Target class not found.'); return }
    if (targetClass.name === fromClass) { setError('Destination class must be different from current class.'); return }

    setSaving(true)
    setError('')
    try {
      const idsToUpdate = Array.from(selectedStudentIds)
      const { error: err } = await supabase
        .from('students')
        .update({
          class_name: targetClass.name,
          section: targetClass.section,
          class_id: targetClass.id
        })
        .in('id', idsToUpdate)

      if (err) {
        setError(err.message)
        setSaving(false)
        return
      }
      
      onSuccess()
    } catch (err) {
      setError('Network error. Try again.')
      setSaving(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
      <div className="card" style={{ width: '100%', maxWidth: 640, padding: '1.75rem', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>Promote Students</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#64748b' }}>×</button>
        </div>
        
        {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', color: '#dc2626', fontSize: 13, marginBottom: '1rem' }}>⚠ {error}</div>}
        
        <form onSubmit={handlePromote} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={lbl}>From Current Class</label>
              <select style={inp} value={fromClass} onChange={e => handleFromClassChange(e.target.value)}>
                <option value="">Select current class…</option>
                {fromClassNames.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>To Next Class</label>
              <select style={{ ...inp, borderColor: toClassId ? '#6366f1' : '#e2e8f0' }} value={toClassId} onChange={e => setToClassId(e.target.value)}>
                <option value="">Select next class…</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name} — Section {c.section}</option>)}
              </select>
            </div>
          </div>

          {fromClass && (
            <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 8, marginTop: '0.5rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', borderBottom: '1px solid #e2e8f0', zIndex: 10 }}>
                  <tr>
                    <th style={{ padding: '10px 14px', textAlign: 'left', width: 40 }}>
                      <input 
                        type="checkbox" 
                        checked={studentsInClass.length > 0 && selectedStudentIds.size === studentsInClass.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedStudentIds(new Set(studentsInClass.map(s => s.id)))
                          } else {
                            setSelectedStudentIds(new Set())
                          }
                        }}
                      />
                    </th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: 12 }}>Roll No</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: 12 }}>Student Name</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: 12 }}>Section</th>
                  </tr>
                </thead>
                <tbody>
                  {studentsInClass.length === 0 ? (
                    <tr><td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>No students in this class.</td></tr>
                  ) : (
                    studentsInClass.map((s, i) => (
                      <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 ? '#fafafa' : 'white' }}>
                        <td style={{ padding: '10px 14px' }}>
                          <input 
                            type="checkbox" 
                            checked={selectedStudentIds.has(s.id)}
                            onChange={() => toggleStudent(s.id)}
                          />
                        </td>
                        <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: '#6366f1' }}>{s.roll_number}</td>
                        <td style={{ padding: '10px 14px', fontWeight: 500, color: '#0f172a' }}>{s.full_name}</td>
                        <td style={{ padding: '10px 14px', color: '#475569' }}>{s.section}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: 10, border: '1px solid #e2e8f0', borderRadius: 8, background: 'white', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>Cancel</button>
            <button type="submit" disabled={saving || !fromClass || !toClassId || selectedStudentIds.size === 0} style={{ flex: 2, padding: 10, background: (saving || !fromClass || !toClassId || selectedStudentIds.size === 0) ? '#a5b4fc' : '#4f46e5', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: (saving || !fromClass || !toClassId || selectedStudentIds.size === 0) ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
              {saving ? 'Promoting…' : `Promote ${selectedStudentIds.size} Student${selectedStudentIds.size === 1 ? '' : 's'}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
