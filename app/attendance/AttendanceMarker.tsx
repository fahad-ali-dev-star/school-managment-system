'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Status = 'present' | 'absent' | 'late' | 'leave'

const STATUS: Record<Status, { label: string; color: string; bg: string; border: string }> = {
  present: { label: 'Present', color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
  absent:  { label: 'Absent',  color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
  late:    { label: 'Late',    color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  leave:   { label: 'Leave',   color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
}

interface Student { id: string; full_name: string; roll_number: string; class_name: string; section: string }
interface Props {
  students: Student[]; classes: string[]; initialAttendance: Record<string, string>
  teacherId: string; schoolId: string; date: string
  todayHoliday?: { title: string; type: string } | null
}

import { revalidateDashboard } from './actions'
import { isOffline, queueOfflineMutation, getOfflineQueue } from '@/lib/offlineSync'

export default function AttendanceMarker({ students, classes, initialAttendance, teacherId, schoolId, date, todayHoliday }: Props) {
  const [att, setAtt]         = useState<Record<string, Status>>(() => {
    const state = { ...initialAttendance } as Record<string, Status>
    if (typeof window !== 'undefined') {
      const queue = getOfflineQueue()
      const relevantUpserts = queue.filter(
        item => item.target === 'attendance' && item.operation === 'upsert'
      )
      relevantUpserts.forEach(item => {
        const records = Array.isArray(item.payload) ? item.payload : [item.payload]
        records.forEach((r: any) => {
          if (r.date === date) {
            state[r.student_id] = r.status
          }
        })
      })
    }
    return state
  })
  const [selClass, setClass]  = useState(classes[0] ?? '')
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const supabase = createClient()

  const classStudents = students.filter(s => s.class_name === selClass)
  const marked  = classStudents.filter(s => att[s.id]).length
  const present = classStudents.filter(s => att[s.id] === 'present').length

  const router = useRouter()

  function markAll(status: Status) {
    const next = { ...att }
    classStudents.forEach(s => { next[s.id] = status })
    setAtt(next)
  }

  async function save() {
    setSaving(true)

    const studentIds = classStudents.map(s => s.id)

    if (isOffline()) {
      const records = classStudents.filter(s => att[s.id]).map(s => {
        const row: any = {
          school_id: schoolId, student_id: s.id, teacher_id: teacherId,
          date, status: att[s.id],
        }
        return row
      })

      queueOfflineMutation({
        type: 'supabase',
        target: 'attendance',
        operation: 'upsert',
        payload: records
      })

      setSaving(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      alert('Attendance saved locally. Your changes will sync automatically when you are back online.')
      return
    }

    const { data: existing } = await supabase.from('attendance')
      .select('id, student_id')
      .eq('school_id', schoolId)
      .eq('date', date)
      .in('student_id', studentIds)

    const existingMap = new Map(existing?.map(e => [e.student_id, e.id]))

    const records = classStudents.filter(s => att[s.id]).map(s => {
      const row: any = {
        school_id: schoolId, student_id: s.id, teacher_id: teacherId,
        date, status: att[s.id],
      }
      if (existingMap.has(s.id)) row.id = existingMap.get(s.id)
      return row
    })

    const { error } = await supabase.from('attendance').upsert(records)
    if (error) {
      alert('Error saving: ' + error.message)
      console.error('Save error:', error)
      setSaving(false)
      return
    }
    await revalidateDashboard()
    router.refresh()
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const displayDate = new Date(date + 'T12:00:00').toLocaleDateString('en-PK', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  return (
    <div className="responsive-page-container" style={{ maxWidth: 860 }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a' }}>Attendance</h1>
        <p style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>{displayDate}</p>
      </div>

      {/* Holiday Banner */}
      {todayHoliday && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14, padding: '1rem 1.25rem',
          borderRadius: 10, background: '#fffbeb', border: '1.5px solid #fcd34d',
          marginBottom: '1.5rem', boxShadow: '0 2px 8px rgba(251,191,36,0.15)',
        }}>
          <span style={{ fontSize: 32, flexShrink: 0 }}>🏖️</span>
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#92400e', margin: 0 }}>
              School is closed today — {todayHoliday.title}
            </p>
            <p style={{ fontSize: 13, color: '#a16207', margin: '3px 0 0' }}>
              Today is a holiday. Attendance marking is optional. Any records saved will still be stored.
            </p>
          </div>
          <a href="/holidays" style={{ marginLeft: 'auto', padding: '6px 14px', borderRadius: 8, background: '#fef3c7', border: '1px solid #fcd34d', color: '#92400e', fontSize: 12, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}>
            View Calendar →
          </a>
        </div>
      )}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        {classes.map(c => (
          <button key={c} onClick={() => setClass(c)} style={{
            padding: '6px 14px', borderRadius: 20, fontSize: 13,
            fontWeight: selClass === c ? 600 : 400,
            background: selClass === c ? '#4f46e5' : 'white',
            color: selClass === c ? 'white' : '#475569',
            border: `1px solid ${selClass === c ? '#4f46e5' : '#e2e8f0'}`,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>{c}</button>
        ))}
      </div>

      {/* Summary + bulk */}
      <div className="card" style={{ padding: '0.875rem 1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', gap: 16 }}>
          <div>
            <span style={{ fontSize: 20, fontWeight: 700, color: '#4f46e5' }}>{marked}</span>
            <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 4 }}>/ {classStudents.length} marked</span>
          </div>
          <div style={{ borderLeft: '1px solid #e2e8f0', paddingLeft: 16 }}>
            <span style={{ fontSize: 20, fontWeight: 700, color: '#16a34a' }}>{present}</span>
            <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 4 }}>present</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11.5, color: '#64748b' }}>Mark all:</span>
          {(['present', 'absent'] as Status[]).map(s => (
            <button key={s} onClick={() => markAll(s)} style={{
              padding: '4px 10px', borderRadius: 6, fontSize: 11.5, fontWeight: 500,
              background: STATUS[s].bg, color: STATUS[s].color,
              border: `1px solid ${STATUS[s].border}`, cursor: 'pointer', fontFamily: 'inherit',
            }}>{STATUS[s].label}</button>
          ))}
        </div>
      </div>

      {/* Student rows */}
      <div className="card" style={{ overflow: 'hidden', marginBottom: '1.5rem' }}>
        {classStudents.length === 0
          ? <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: '#94a3b8' }}>No students in {selClass}</div>
          : classStudents.map((st, i) => {
            const cur = att[st.id] as Status | undefined
            return (
              <div key={st.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', gap: 10, flexWrap: 'wrap',
                borderBottom: i < classStudents.length - 1 ? '1px solid #f1f5f9' : 'none',
                background: cur ? STATUS[cur].bg + '30' : 'white', transition: 'background 0.2s',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: '1 1 180px', minWidth: 0 }}>
                  {/* Avatar */}
                  <div style={{
                    width: 34, height: 34, borderRadius: '50%', background: '#eef2ff',
                    color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11.5, fontWeight: 600, flexShrink: 0,
                  }}>
                    {st.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ margin: 0, fontWeight: 600, color: '#0f172a', fontSize: 13.5, wordBreak: 'break-word' }}>{st.full_name}</p>
                    <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>#{st.roll_number} · {st.section}</p>
                  </div>
                </div>
                {/* Buttons */}
                <div style={{ display: 'flex', gap: 4, flexShrink: 0, flexWrap: 'wrap' }}>
                  {(Object.entries(STATUS) as [Status, typeof STATUS[Status]][]).map(([s, cfg]) => (
                    <button key={s} onClick={() => setAtt(p => ({ ...p, [st.id]: s }))} style={{
                      padding: '4px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                      cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                      background: cur === s ? cfg.color : 'white',
                      color: cur === s ? 'white' : cfg.color,
                      border: `1px solid ${cur === s ? cfg.color : cfg.border}`,
                    }}>{cfg.label}</button>
                  ))}
                </div>
              </div>
            )
          })
        }
      </div>

      <button onClick={save} disabled={saving || marked === 0} style={{
        padding: '11px 24px', borderRadius: 8, border: 'none', cursor: marked === 0 ? 'not-allowed' : 'pointer',
        background: saved ? '#16a34a' : saving ? '#a5b4fc' : '#4f46e5',
        color: 'white', fontSize: 13.5, fontWeight: 600, fontFamily: 'inherit', transition: 'background 0.3s',
        width: '100%', maxWidth: 320, display: 'block'
      }}>
        {saved ? '✓ Saved!' : saving ? 'Saving…' : `Save Attendance (${marked} students)`}
      </button>
    </div>
  )
}
