import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { dispatchPushToParents } from '@/lib/webPush'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('users')
    .select('id, email, full_name, school_id')
    .eq('id', user.id)
    .single()

  const email = profile?.email || user.email
  if (!email) {
    return NextResponse.json({ error: 'No user email found' }, { status: 400 })
  }

  const res = await dispatchPushToParents({
    schoolId: profile?.school_id,
    parentEmail: email,
    title: '🔔 Test Notification',
    body: `Hello ${profile?.full_name || 'Parent'}! Push notifications are working perfectly on your mobile device.`,
    url: '/parent/alerts',
    tag: 'test-push',
  })

  return NextResponse.json({
    success: res.sent > 0,
    sent: res.sent,
    failed: res.failed,
    message:
      res.sent > 0
        ? `Test notification sent successfully to ${res.sent} active device(s)!`
        : 'No active push subscriptions found for this account. Please tap "Enable Mobile Notifications" first.',
  })
}
