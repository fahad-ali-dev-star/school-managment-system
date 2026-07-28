'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Holiday } from '@/types'

const HOLIDAY_TYPES = [
  { value: 'national',   label: 'National Holiday', color: '#dc2626', bg: '#fef2f2', emoji: '🇵🇰' },
  { value: 'school',     label: 'School Event',     color: '#7c3aed', bg: '#f5f3ff', emoji: '🏫' },
  { value: 'exam_break', label: 'Exam Break',       color: '#d97706', bg: '#fffbeb', emoji: '📝' },
  { value: 'summer',     label: 'Summer Break',     color: '#0284c7', bg: '#f0f9ff', emoji: '☀️' },
  { value: 'winter',     label: 'Winter Break',     color: '#0891b2', bg: '#ecfeff', emoji: '❄️' },
]

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

function getTypeInfo(type: string) {
  return HOLIDAY_TYPES.find(t => t.value === type) ?? HOLIDAY_TYPES[0]
}

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-PK', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
}

interface Props {
  holidays: Holiday[]
  schoolId: string
  userRole: string
  plan: string
}

export default function HolidayCalendar({ holidays: initial, schoolId, userRole, plan }: Props) {
  const supabase = createClient()
  const today = new Date()
  const canManage = plan === 'basic' || plan === 'pro'
  const isAdmin = userRole === 'admin' || userRole === 'principal'

  const [holidays, setHolidays] = useState<Holiday[]>(initial)
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState<Holiday | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    title: '', date: '', end_date: '', type: 'national' as Holiday['type'], description: '',
  })

  // Calendar grid data
  const year  = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const holidayMap = useMemo(() => {
    const map: Record<string, Holiday[]> = {}
    holidays.forEach(h => {
      if (!map[h.date]) map[h.date] = []
      map[h.date].push(h)
    })
    return map
  }, [holidays])

  // Upcoming holidays (next 60 days)
  const upcoming = useMemo(() => {
    const todayStr = today.toISOString().split('T')[0]
    const limit = new Date(today); limit.setDate(limit.getDate() + 60)
    const limitStr = limit.toISOString().split('T')[0]
    return holidays
      .filter(h => h.date >= todayStr && h.date <= limitStr)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 8)
  }, [holidays])

  function openAdd() {
    setEditItem(null)
    setForm({ title: '', date: today.toISOString().split('T')[0], end_date: '', type: 'national', description: '' })
    setShowModal(true)
  }

  function openEdit(h: Holiday) {
    setEditItem(h)
    setForm({ title: h.title, date: h.date, end_date: h.end_date ?? '', type: h.type, description: h.description ?? '' })
    setShowModal(true)
  }

  async function saveHoliday() {
    if (!form.title.trim() || !form.date) return
    setSaving(true)
    try {
      if (editItem) {
        const { data, error } = await supabase.from('holidays')
          .update({ title: form.title.trim(), date: form.date, end_date: form.end_date || null, type: form.type, description: form.description.trim() || null })
          .eq('id', editItem.id).select().single()
        if (!error && data) setHolidays(prev => prev.map(h => h.id === editItem.id ? data : h))
      } else {
        const { data, error } = await supabase.from('holidays')
          .insert({ school_id: schoolId, title: form.title.trim(), date: form.date, end_date: form.end_date || null, type: form.type, description: form.description.trim() || null })
          .select().single()
        if (!error && data) setHolidays(prev => [...prev, data].sort((a, b) => a.date.localeCompare(b.date)))
      }
      setShowModal(false)
    } finally {
      setSaving(false)
    }
  }

  async function deleteHoliday(id: string) {
    if (!confirm('Delete this holiday?')) return
    setDeleting(id)
    await supabase.from('holidays').delete().eq('id', id)
    setHolidays(prev => prev.filter(h => h.id !== id))
    setDeleting(null)
  }

  function prevMonth() { setViewDate(new Date(year, month - 1, 1)) }
  function nextMonth() { setViewDate(new Date(year, month + 1, 1)) }

  const todayStr = today.toISOString().split('T')[0]

  return (
    <div style={{ padding: '2rem', maxWidth: 1200 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>🏖️ Holiday Calendar</h1>
          <p style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>Manage school holidays and closures</p>
        </div>
        {isAdmin && canManage && (
          <button onClick={openAdd} style={{
            padding: '10px 20px', borderRadius: 8, background: '#4f46e5', color: 'white',
            border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8,
          }}>
            + Add Holiday
          </button>
        )}
        {isAdmin && !canManage && (
          <div style={{ padding: '8px 14px', borderRadius: 8, background: '#f1f5f9', border: '1px solid #e2e8f0', fontSize: 13, color: '#64748b' }}>
            🔒 Upgrade to Basic to manage holidays
          </div>
        )}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        {HOLIDAY_TYPES.map(t => (
          <div key={t.value} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 20, background: t.bg, border: `1px solid ${t.color}22`, fontSize: 12, fontWeight: 500, color: t.color }}>
            <span>{t.emoji}</span> {t.label}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1.5rem', alignItems: 'start' }}>
        {/* Calendar */}
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          {/* Month nav */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', borderBottom: '1px solid #f1f5f9', background: '#fafafa' }}>
            <button onClick={prevMonth} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontSize: 14, color: '#475569' }}>‹ Prev</button>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: 0 }}>{MONTHS[month]} {year}</h2>
            <button onClick={nextMonth} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontSize: 14, color: '#475569' }}>Next ›</button>
          </div>

          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid #f1f5f9' }}>
            {DAYS.map(d => (
              <div key={d} style={{ padding: '10px 0', textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {/* Empty cells before month start */}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} style={{ minHeight: 80, borderRight: '1px solid #f8fafc', borderBottom: '1px solid #f8fafc', background: '#fafafa' }} />
            ))}
            {/* Day cells */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
              const dayHolidays = holidayMap[dateStr] ?? []
              const isToday = dateStr === todayStr
              const isWeekend = new Date(year, month, dayNum).getDay() === 0 || new Date(year, month, dayNum).getDay() === 6

              return (
                <div key={dayNum} style={{
                  minHeight: 80, borderRight: '1px solid #f8fafc', borderBottom: '1px solid #f8fafc',
                  padding: '6px 8px', background: isToday ? '#eef2ff' : isWeekend ? '#fafafa' : 'white',
                  position: 'relative',
                }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 26, height: 26, borderRadius: '50%',
                    background: isToday ? '#4f46e5' : 'transparent',
                    color: isToday ? 'white' : isWeekend ? '#94a3b8' : '#0f172a',
                    fontSize: 13, fontWeight: isToday ? 700 : 400,
                  }}>{dayNum}</span>
                  <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {dayHolidays.map(h => {
                      const t = getTypeInfo(h.type)
                      return (
                        <div key={h.id} title={h.title} style={{
                          background: t.bg, color: t.color, fontSize: 10, fontWeight: 600,
                          padding: '2px 5px', borderRadius: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          cursor: isAdmin && canManage ? 'pointer' : 'default',
                          border: `1px solid ${t.color}33`,
                        }} onClick={() => isAdmin && canManage && openEdit(h)}>
                          {t.emoji} {h.title}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right panel — upcoming holidays */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #f1f5f9', background: '#fafafa' }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: 0 }}>📅 Upcoming Holidays</h3>
              <p style={{ fontSize: 12, color: '#94a3b8', margin: '2px 0 0' }}>Next 60 days</p>
            </div>
            <div style={{ padding: '0.75rem' }}>
              {upcoming.length === 0 ? (
                <p style={{ color: '#94a3b8', fontSize: 13, padding: '0.5rem', textAlign: 'center' }}>No upcoming holidays</p>
              ) : (
                upcoming.map(h => {
                  const t = getTypeInfo(h.type)
                  return (
                    <div key={h.id} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 8px',
                      borderRadius: 8, marginBottom: 4,
                      background: deleting === h.id ? '#fef2f2' : 'transparent',
                      transition: 'background 0.15s',
                    }}>
                      <div style={{ width: 36, height: 36, borderRadius: 8, background: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                        {t.emoji}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{h.title}</p>
                        <p style={{ fontSize: 11, color: '#64748b', margin: '2px 0 0' }}>{formatDate(h.date)}</p>
                        <span style={{ fontSize: 10, fontWeight: 600, color: t.color, background: t.bg, padding: '1px 6px', borderRadius: 4, display: 'inline-block', marginTop: 2 }}>{t.label}</span>
                      </div>
                      {isAdmin && canManage && (
                        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                          <button onClick={() => openEdit(h)} title="Edit" style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontSize: 12 }}>✏️</button>
                          <button onClick={() => deleteHoliday(h.id)} title="Delete" disabled={deleting === h.id} style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #fecaca', background: '#fef2f2', cursor: 'pointer', fontSize: 12 }}>🗑️</button>
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* All holidays count by type */}
          <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', padding: '1rem 1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: '0 0 10px' }}>📊 Holiday Summary</h3>
            {HOLIDAY_TYPES.map(t => {
              const count = holidays.filter(h => h.type === t.value).length
              return (
                <div key={t.value} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #f8fafc' }}>
                  <span style={{ fontSize: 13, color: '#475569', display: 'flex', alignItems: 'center', gap: 6 }}>{t.emoji} {t.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: t.color, background: t.bg, padding: '1px 8px', borderRadius: 12 }}>{count}</span>
                </div>
              )
            })}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, marginTop: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>Total</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#4f46e5' }}>{holidays.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 480, padding: '1.5rem', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: '0 0 1.25rem' }}>
              {editItem ? '✏️ Edit Holiday' : '+ Add Holiday'}
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Holiday Title *</label>
                <input
                  value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Eid ul-Fitr"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Start Date *</label>
                  <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>End Date (optional)</label>
                  <input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Holiday Type *</label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as Holiday['type'] }))}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 14, outline: 'none', background: 'white', fontFamily: 'inherit' }}
                >
                  {HOLIDAY_TYPES.map(t => <option key={t.value} value={t.value}>{t.emoji} {t.label}</option>)}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Description (optional)</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={2} placeholder="Additional details..."
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 14, outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: '1.25rem' }}>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: 'white', cursor: 'pointer', fontSize: 14, fontWeight: 500, color: '#475569', fontFamily: 'inherit' }}>
                Cancel
              </button>
              <button onClick={saveHoliday} disabled={saving || !form.title.trim() || !form.date} style={{
                flex: 2, padding: '10px', borderRadius: 8, border: 'none', background: '#4f46e5',
                color: 'white', cursor: saving ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 600,
                opacity: saving ? 0.7 : 1, fontFamily: 'inherit',
              }}>
                {saving ? 'Saving...' : editItem ? 'Update Holiday' : 'Add Holiday'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
