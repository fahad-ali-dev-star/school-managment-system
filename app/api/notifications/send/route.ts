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

  // Check plan limits
  const { checkFeature } = await import('@/lib/billing/server')
  const hasAccess = await checkFeature('hasAlerts')
  if (!hasAccess) {
    return NextResponse.json({ 
      error: 'SMS/WhatsApp alerts are a Professional feature. Please upgrade your plan to access this module.' 
    }, { status: 403 })
  }

  const body = await req.json()
  const { student_id, type, channel, custom_message, variables } = body

  let message  = custom_message
  let recipient = ''
  let studentData: any = null

  if (student_id) {
    const { data: student } = await supabase
      .from('students')
      .select('full_name, roll_number, class_name, section, parent_name, parent_phone, parent_email')
      .eq('id', student_id)
      .single()

    if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    studentData = student
    const targetChannel = channel ?? 'portal'
    // For portal channel use parent_email so the parent portal can find the notification;
    // for SMS/WhatsApp use parent_phone (with fallback)
    recipient = (targetChannel === 'portal')
      ? (student.parent_email ?? student.parent_phone ?? '')
      : (student.parent_phone ?? student.parent_email ?? '')

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

  if (!message) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 })
  }
  const targetChannel = channel ?? 'portal'
  if (!recipient && targetChannel !== 'portal') {
    return NextResponse.json({ error: 'Recipient phone number or email is required' }, { status: 400 })
  }

  // Send the notification
  const result = await sendNotification(recipient, message, targetChannel)

  // Log to database (map 'portal' to 'whatsapp' to satisfy DB check constraint)
  const dbChannel = (targetChannel === 'portal') ? 'whatsapp' : targetChannel
  const { data: log } = await supabase
    .from('notification_logs')
    .insert({
      school_id:  profile.school_id,
      student_id: student_id ?? null,
      type:       type ?? 'custom',
      channel:    dbChannel,
      recipient,
      message,
      status:     result.success ? 'sent' : 'failed',
      error_msg:  result.error ?? null,
      sent_at:    result.success ? new Date().toISOString() : null,
    })
    .select()
    .single()

  // Dispatch Web Push notification to parent's mobile PWA
  try {
    const { dispatchPushToParents } = await import('@/lib/webPush')
    const typeTitle = (type ?? 'custom').charAt(0).toUpperCase() + (type ?? 'custom').slice(1)
    const title = `${school?.name ?? 'School'} Alert: ${typeTitle}`
    const targetEmail = (targetChannel === 'portal') ? recipient : (studentData?.parent_email ?? undefined)
    
    await dispatchPushToParents({
      schoolId: profile.school_id,
      parentEmail: targetEmail,
      studentId: student_id ?? undefined,
      title,
      body: message,
      url: '/parent/alerts',
      tag: `alert-${type || 'school'}-${student_id || 'general'}`,
    })
  } catch (pushErr) {
    console.warn('[WebPush] Error dispatching push:', pushErr)
  }

  return NextResponse.json({
    success: result.success,
    error:   result.error,
    log,
  }, { status: result.success ? 200 : 500 })
}
