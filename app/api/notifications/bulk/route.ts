import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { sendNotification, buildMessage } from '@/lib/notificationService'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('users').select('school_id').eq('id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: school } = await supabase
    .from('schools').select('name').eq('id', profile.school_id).single()
  const schoolName = school?.name ?? 'School'

  const body = await req.json()
  const { type, channel, class_name, section, student_ids, custom_message, variables } = body

  // Get template
  const { data: tpl } = await supabase
    .from('notification_templates')
    .select('message')
    .eq('school_id', profile.school_id)
    .eq('type', type ?? 'announcement')
    .single()

  // Get students
  let studentsQuery = supabase
    .from('students')
    .select('id, full_name, roll_number, class_name, section, parent_name, parent_phone')
    .eq('school_id', profile.school_id)
    .eq('is_active', true)

  if (student_ids?.length > 0) {
    studentsQuery = studentsQuery.in('id', student_ids)
  } else {
    if (class_name) studentsQuery = studentsQuery.eq('class_name', class_name)
    if (section)    studentsQuery = studentsQuery.eq('section', section)
  }

  const { data: students } = await studentsQuery

  if (!students?.length) {
    return NextResponse.json({ error: 'No students found' }, { status: 404 })
  }

  const results = { sent: 0, failed: 0, logs: [] as any[] }

  for (const student of students) {
    const message = custom_message
      ? buildMessage(custom_message, { student_name: student.full_name, school_name: schoolName, ...variables })
      : tpl
      ? buildMessage(tpl.message, {
          parent_name:  student.parent_name,
          student_name: student.full_name,
          roll_number:  student.roll_number,
          class_name:   `${student.class_name}-${student.section}`,
          school_name:  schoolName,
          date:         new Date().toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' }),
          ...variables,
        })
      : null

    if (!message) continue

    const result = await sendNotification(student.parent_phone, message, channel ?? 'whatsapp')

    const { data: log } = await supabase
      .from('notification_logs')
      .insert({
        school_id:  profile.school_id,
        student_id: student.id,
        type:       type ?? 'announcement',
        channel:    channel ?? 'whatsapp',
        recipient:  student.parent_phone,
        message,
        status:     result.success ? 'sent' : 'failed',
        error_msg:  result.error ?? null,
        sent_at:    result.success ? new Date().toISOString() : null,
      })
      .select().single()

    if (result.success) results.sent++
    else results.failed++
    if (log) results.logs.push(log)
  }

  return NextResponse.json(results)
}
