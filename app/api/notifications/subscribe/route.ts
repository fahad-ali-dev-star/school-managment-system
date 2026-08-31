import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getVapidPublicKey } from '@/lib/webPush'

// ─── GET: Return Public VAPID Key ────────────────────────────────────────────
export async function GET() {
  const publicKey = getVapidPublicKey()
  return NextResponse.json({ publicKey })
}

// ─── POST: Save or Update Device Push Subscription ───────────────────────────
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
    .select('id, email, role, school_id')
    .eq('id', user.id)
    .single()

  const userEmail = profile?.email || user.email
  if (!userEmail) {
    return NextResponse.json({ error: 'User email not found' }, { status: 400 })
  }

  const body = await req.json()
  const { subscription, userAgent } = body

  if (!subscription || !subscription.endpoint || !subscription.keys) {
    return NextResponse.json(
      { error: 'Invalid push subscription payload' },
      { status: 400 }
    )
  }

  const { endpoint, keys } = subscription
  const { p256dh, auth } = keys

  if (!p256dh || !auth) {
    return NextResponse.json(
      { error: 'Subscription missing cryptographic keys' },
      { status: 400 }
    )
  }

  // Upsert subscription into push_subscriptions table
  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: user.id,
      school_id: profile?.school_id || null,
      user_email: userEmail.toLowerCase(),
      role: profile?.role || 'parent',
      endpoint,
      p256dh,
      auth,
      user_agent: userAgent || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'endpoint' }
  )

  if (error) {
    console.error('[WebPush] Error saving subscription:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

// ─── DELETE: Unsubscribe Device Endpoint ─────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { endpoint } = body

  if (!endpoint) {
    return NextResponse.json({ error: 'Endpoint is required' }, { status: 400 })
  }

  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('endpoint', endpoint)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
