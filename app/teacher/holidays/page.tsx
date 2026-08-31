import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getProfile } from '@/lib/supabase/getProfile'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const HOLIDAY_TYPES: Record<string, { label: string; color: string; bg: string; emoji: string }> = {
  national:   { label: 'National Holiday', color: '#dc2626', bg: '#fef2f2', emoji: '🇵🇰' },
  school:     { label: 'School Event',     color: '#7c3aed', bg: '#f5f3ff', emoji: '🏫' },
  exam_break: { label: 'Exam Break',       color: '#d97706', bg: '#fffbeb', emoji: '📝' },
  summer:     { label: 'Summer Break',     color: '#0284c7', bg: '#f0f9ff', emoji: '☀️' },
  winter:     { label: 'Winter Break',     color: '#0891b2', bg: '#ecfeff', emoji: '❄️' },
}

export default async function TeacherHolidaysPage() {
  const profile = await getProfile()
  if (!profile) redirect('/login')

  const supabase = createClient()

  const todayStr = new Date().toISOString().split('T')[0]
  const limit = new Date(); limit.setDate(limit.getDate() + 90)
  const limitStr = limit.toISOString().split('T')[0]

  let holidays: any[] = []
  let myHomework: any[] = []
  let myMaterials: any[] = []

  try {
    const [holRes, hwRes, matRes] = await Promise.all([
      supabase.from('holidays')
        .select('*')
        .eq('school_id', profile.school_id)
        .gte('date', todayStr).lte('date', limitStr)
        .order('date', { ascending: true }),
      supabase.from('holiday_homework')
        .select('*')
        .eq('school_id', profile.school_id)
        .eq('teacher_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(10),
      supabase.from('study_materials')
        .select('*')
        .eq('school_id', profile.school_id)
        .eq('teacher_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(10),
    ])
    holidays    = holRes.data  ?? []
    myHomework  = hwRes.data   ?? []
    myMaterials = matRes.data  ?? []
  } catch (err) {
    console.warn('TeacherHolidaysPage: Supabase fetch failed (offline?):', err)
  }

  const firstName = profile.full_name.split(' ')[0]

  return (
    <div className="responsive-page-container" style={{ maxWidth: 1100 }}>
      <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>🏖️ Holiday Hub</h1>
      <p style={{ color: '#64748b', fontSize: 13, marginBottom: '1.25rem' }}>Hi {firstName}! Manage holiday homework and study materials for your students.</p>

      {/* Quick actions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 160px), 1fr))', gap: 8, marginBottom: '1.5rem' }}>
        <Link href="/holidays" style={{ padding: '9px 14px', borderRadius: 8, background: '#eef2ff', color: '#4f46e5', fontWeight: 600, fontSize: 13, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, border: '1px solid #c7d2fe', textAlign: 'center' }}>
          📅 View Full Calendar
        </Link>
        <Link href="/holidays/homework" style={{ padding: '9px 14px', borderRadius: 8, background: '#f0fdf4', color: '#16a34a', fontWeight: 600, fontSize: 13, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, border: '1px solid #bbf7d0', textAlign: 'center' }}>
          📝 Manage Homework
        </Link>
        <Link href="/holidays/materials" style={{ padding: '9px 14px', borderRadius: 8, background: '#fffbeb', color: '#d97706', fontWeight: 600, fontSize: 13, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, border: '1px solid #fde68a', textAlign: 'center' }}>
          📚 Study Materials
        </Link>
      </div>

      <div className="portal-2col-grid">
        {/* Upcoming Holidays */}
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #f1f5f9', background: '#fafafa', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: 0 }}>📅 Upcoming Holidays</h2>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>Next 90 days</span>
          </div>
          <div style={{ padding: '0.75rem', maxHeight: 320, overflowY: 'auto' }}>
            {holidays.length === 0 ? (
              <p style={{ color: '#94a3b8', fontSize: 13, padding: '1rem', textAlign: 'center' }}>No upcoming holidays</p>
            ) : holidays.map(h => {
              const t = HOLIDAY_TYPES[h.type] ?? HOLIDAY_TYPES.national
              return (
                <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 8px', borderRadius: 8, marginBottom: 4 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 8, background: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{t.emoji}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', margin: 0, wordBreak: 'break-word' }}>{h.title}</p>
                    <p style={{ fontSize: 11, color: '#64748b', margin: '2px 0 0' }}>
                      {new Date(h.date + 'T00:00:00').toLocaleDateString('en-PK', { weekday: 'short', day: 'numeric', month: 'short' })}
                      {h.end_date && h.end_date !== h.date ? ` — ${new Date(h.end_date + 'T00:00:00').toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}` : ''}
                    </p>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10, background: t.bg, color: t.color, whiteSpace: 'nowrap', flexShrink: 0 }}>{t.label}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* My Homework */}
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #f1f5f9', background: '#fafafa', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: 0 }}>📝 My Homework Assignments</h2>
            <Link href="/holidays/homework" style={{ fontSize: 12, color: '#4f46e5', textDecoration: 'none', fontWeight: 600, flexShrink: 0 }}>View All →</Link>
          </div>
          <div style={{ padding: '0.75rem', maxHeight: 320, overflowY: 'auto' }}>
            {myHomework.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1.5rem' }}>
                <p style={{ color: '#94a3b8', fontSize: 13 }}>No homework assigned yet</p>
                <Link href="/holidays/homework" style={{ fontSize: 13, color: '#4f46e5', fontWeight: 600, textDecoration: 'none' }}>+ Assign Holiday Homework</Link>
              </div>
            ) : myHomework.map(h => {
              const now = new Date().toISOString().split('T')[0]
              const overdue = h.due_date < now
              return (
                <div key={h.id} style={{ padding: '10px 8px', borderRadius: 8, marginBottom: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 120 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', margin: 0, wordBreak: 'break-word' }}>{h.title}</p>
                    <p style={{ fontSize: 11, color: '#64748b', margin: '2px 0 0' }}>{h.class_name} · {h.subject}</p>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10, background: overdue ? '#fef2f2' : '#f0fdf4', color: overdue ? '#dc2626' : '#16a34a', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {overdue ? 'Overdue' : `Due ${new Date(h.due_date + 'T00:00:00').toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}`}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* My Materials */}
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', gridColumn: '1 / -1' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #f1f5f9', background: '#fafafa', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: 0 }}>📚 My Study Materials</h2>
            <Link href="/holidays/materials" style={{ fontSize: 12, color: '#4f46e5', textDecoration: 'none', fontWeight: 600, flexShrink: 0 }}>Manage →</Link>
          </div>
          <div style={{ padding: '0.75rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 240px), 1fr))', gap: 8 }}>
            {myMaterials.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1.5rem', gridColumn: '1 / -1' }}>
                <p style={{ color: '#94a3b8', fontSize: 13 }}>No materials uploaded yet</p>
                <Link href="/holidays/materials" style={{ fontSize: 13, color: '#4f46e5', fontWeight: 600, textDecoration: 'none' }}>+ Upload Study Material</Link>
              </div>
            ) : myMaterials.map(m => {
              const icons: Record<string, string> = { pdf: '📄', video: '🎬', link: '🔗', note: '📝' }
              return (
                <div key={m.id} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #f1f5f9', background: '#fafafa', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 18, flexShrink: 0 }}>{icons[m.type] ?? '📄'}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', margin: 0, wordBreak: 'break-word' }}>{m.title}</p>
                    <p style={{ fontSize: 11, color: '#64748b', margin: '2px 0 0' }}>{m.class_name} · {m.subject}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
