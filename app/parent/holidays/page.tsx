import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getProfile } from '@/lib/supabase/getProfile'

export const dynamic = 'force-dynamic'

const HOLIDAY_TYPES: Record<string, { label: string; color: string; bg: string; emoji: string }> = {
  national:   { label: 'National Holiday', color: '#dc2626', bg: '#fef2f2', emoji: '🇵🇰' },
  school:     { label: 'School Event',     color: '#7c3aed', bg: '#f5f3ff', emoji: '🏫' },
  exam_break: { label: 'Exam Break',       color: '#d97706', bg: '#fffbeb', emoji: '📝' },
  summer:     { label: 'Summer Break',     color: '#0284c7', bg: '#f0f9ff', emoji: '☀️' },
  winter:     { label: 'Winter Break',     color: '#0891b2', bg: '#ecfeff', emoji: '❄️' },
}

const MAT_ICONS: Record<string, string> = { pdf: '📄', video: '🎬', link: '🔗', note: '📝' }

export default async function ParentHolidaysPage() {
  const profile = await getProfile()
  if (!profile) redirect('/login')

  const supabase = createClient()

  const todayStr = new Date().toISOString().split('T')[0]
  const limit = new Date(); limit.setDate(limit.getDate() + 90)
  const limitStr = limit.toISOString().split('T')[0]

  let holidays: any[] = []
  let homework: any[] = []
  let materials: any[] = []
  let childClass = ''

  try {
    // Find parent's child
    const { data: parentRow } = await supabase
      .from('parents')
      .select('student_id')
      .eq('user_id', profile.id)
      .maybeSingle()

    if (parentRow?.student_id) {
      const { data: student } = await supabase
        .from('students')
        .select('class_name, full_name')
        .eq('id', parentRow.student_id)
        .single()

      childClass = student?.class_name ?? ''

      const [holRes, hwRes, matRes] = await Promise.all([
        supabase.from('holidays')
          .select('*')
          .eq('school_id', profile.school_id)
          .gte('date', todayStr).lte('date', limitStr)
          .order('date', { ascending: true }),
        childClass ? supabase.from('holiday_homework')
          .select('*, teacher:users(full_name)')
          .eq('school_id', profile.school_id)
          .eq('class_name', childClass)
          .order('due_date', { ascending: true }) : Promise.resolve({ data: [] }),
        childClass ? supabase.from('study_materials')
          .select('*, teacher:users(full_name)')
          .eq('school_id', profile.school_id)
          .eq('class_name', childClass)
          .order('created_at', { ascending: false }) : Promise.resolve({ data: [] }),
      ])
      holidays  = holRes.data ?? []
      homework  = (hwRes as any).data ?? []
      materials = (matRes as any).data ?? []
    } else {
      // No student linked — still show school holidays
      const { data } = await supabase.from('holidays')
        .select('*').eq('school_id', profile.school_id)
        .gte('date', todayStr).lte('date', limitStr)
        .order('date', { ascending: true })
      holidays = data ?? []
    }
  } catch (err) {
    console.warn('ParentHolidaysPage: Supabase fetch failed (offline?):', err)
  }

  const firstName = profile.full_name.split(' ')[0]

  return (
    <div className="responsive-page-container" style={{ maxWidth: 1000 }}>
      <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>🏖️ Holiday Information</h1>
      <p style={{ color: '#64748b', fontSize: 13, marginBottom: '1.5rem' }}>
        Hi {firstName}! Stay informed about school holidays
        {childClass ? ` and your child's ${childClass} class assignments` : ''}.
      </p>

      <div className="portal-2col-grid">
        {/* Upcoming Holidays */}
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', gridColumn: '1 / -1' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #f1f5f9', background: '#fafafa' }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: 0 }}>📅 Upcoming School Holidays</h2>
            <p style={{ fontSize: 12, color: '#94a3b8', margin: '2px 0 0' }}>Next 90 days</p>
          </div>
          <div style={{ padding: '0.875rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 200px), 1fr))', gap: '0.75rem' }}>
            {holidays.length === 0 ? (
              <p style={{ color: '#94a3b8', fontSize: 13, gridColumn: '1 / -1', textAlign: 'center', padding: '1rem' }}>No upcoming holidays in the next 90 days</p>
            ) : holidays.map(h => {
              const t = HOLIDAY_TYPES[h.type] ?? HOLIDAY_TYPES.national
              return (
                <div key={h.id} style={{ padding: '10px 12px', borderRadius: 10, background: t.bg, border: `1px solid ${t.color}22`, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 22, flexShrink: 0 }}>{t.emoji}</span>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: 0, lineHeight: 1.2, wordBreak: 'break-word' }}>{h.title}</p>
                    <p style={{ fontSize: 11, color: t.color, margin: '3px 0 0', fontWeight: 600 }}>
                      {new Date(h.date + 'T00:00:00').toLocaleDateString('en-PK', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </p>
                    {h.description && <p style={{ fontSize: 11, color: '#64748b', margin: '2px 0 0' }}>{h.description}</p>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Homework assignments */}
        {childClass && (
          <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #f1f5f9', background: '#fafafa' }}>
              <h2 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: 0 }}>📝 Holiday Homework</h2>
              <p style={{ fontSize: 12, color: '#94a3b8', margin: '2px 0 0' }}>Class {childClass}</p>
            </div>
            <div style={{ padding: '0.75rem', maxHeight: 350, overflowY: 'auto' }}>
              {homework.length === 0 ? (
                <p style={{ color: '#94a3b8', fontSize: 13, padding: '1rem', textAlign: 'center' }}>No homework assigned yet</p>
              ) : homework.map((h: any) => {
                const now = new Date().toISOString().split('T')[0]
                const overdue = h.due_date < now
                return (
                  <div key={h.id} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #f1f5f9', marginBottom: 8, background: overdue ? '#fff8f8' : 'white' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10, background: '#eef2ff', color: '#4f46e5' }}>{h.subject}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10, background: overdue ? '#fef2f2' : '#f0fdf4', color: overdue ? '#dc2626' : '#16a34a' }}>
                          {overdue ? '⚠️ Overdue' : `Due ${new Date(h.due_date + 'T00:00:00').toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}`}
                        </span>
                      </div>
                    </div>
                    <p style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a', margin: '0 0 4px', wordBreak: 'break-word' }}>{h.title}</p>
                    {h.description && <p style={{ fontSize: 12, color: '#475569', margin: 0, wordBreak: 'break-word' }}>{h.description}</p>}
                    {h.teacher && <p style={{ fontSize: 11, color: '#94a3b8', margin: '4px 0 0' }}>Assigned by: {h.teacher.full_name}</p>}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Study Materials */}
        {childClass && (
          <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #f1f5f9', background: '#fafafa' }}>
              <h2 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: 0 }}>📚 Study Materials</h2>
              <p style={{ fontSize: 12, color: '#94a3b8', margin: '2px 0 0' }}>Class {childClass}</p>
            </div>
            <div style={{ padding: '0.75rem', maxHeight: 350, overflowY: 'auto' }}>
              {materials.length === 0 ? (
                <p style={{ color: '#94a3b8', fontSize: 13, padding: '1rem', textAlign: 'center' }}>No study materials uploaded yet</p>
              ) : materials.map((m: any) => (
                <div key={m.id} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #f1f5f9', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 22, flexShrink: 0 }}>{MAT_ICONS[m.type] ?? '📄'}</span>
                  <div style={{ flex: 1, minWidth: 140 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: 0, wordBreak: 'break-word' }}>{m.title}</p>
                    <p style={{ fontSize: 11, color: '#64748b', margin: '2px 0 0' }}>{m.subject} · {m.teacher?.full_name}</p>
                    {m.content && <p style={{ fontSize: 12, color: '#475569', margin: '4px 0 0', wordBreak: 'break-word' }}>{m.content}</p>}
                  </div>
                  {m.url && (
                    <a href={m.url} target="_blank" rel="noopener noreferrer" style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #bfdbfe', background: '#eff6ff', color: '#1d4ed8', fontSize: 12, textDecoration: 'none', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>
                      Open →
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
