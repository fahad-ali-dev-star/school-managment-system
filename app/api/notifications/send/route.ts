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

  const body = await req.json()
  const { student_id, type, channel, custom_message, variables } = body

  let message  = custom_message
  let recipient = ''
  let studentData: any = null

  if (student_id) {
    const { data: student } = await supabase
      .from('students')
      .select('full_name, roll_number, class_name, section, parent_name, parent_phone')
      .eq('id', student_id)
      .single()

    if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    studentData = student
    recipient   = student.parent_phone

    // Build message from template if not custom
    if (!custom_message) {
      const { data: tpl } = await supabase
        .from('notification_templates')
        .select('message')
        .eq('school_id', profile.school_id)
        .eq('type', type)
        .single()

      if (tpl) {
        message = buildMessage(tpl.message, {
          parent_name:   student.parent_name,
          student_name:  student.full_name,
          roll_number:   student.roll_number,
          class_name:    `${student.class_name}-${student.section}`,
          school_name:   school?.name ?? 'School',
          date:          new Date().toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' }),
          ...variables,
        })
      }
    }
  } else {
    // Announcement — use provided recipient
    recipient = body.recipient ?? ''
    message   = custom_message ?? ''
  }

  if (!message || !recipient) {
    return NextResponse.json({ error: 'Message and recipient are required' }, { status: 400 })
  }

  // Send the notification
  const result = await sendNotification(recipient, message, channel ?? 'whatsapp')

  // Log to database
  const { data: log } = await supabase
    .from('notification_logs')
    .insert({
      school_id:  profile.school_id,
      student_id: student_id ?? null,
      type:       type ?? 'custom',
      channel:    channel ?? 'whatsapp',
      recipient,
      message,
      status:     result.success ? 'sent' : 'failed',
      error_msg:  result.error ?? null,
      sent_at:    result.success ? new Date().toISOString() : null,
    })
    .select()
    .single()

  return NextResponse.json({
    success: result.success,
    error:   result.error,
    log,
  }, { status: result.success ? 200 : 500 })
}
