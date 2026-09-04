import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { getVapidPublicKey } from '@/lib/webPush'

// ─── GET: Return Public VAPID Key ────────────────────────────────────────────
export async function GET() {
  const publicKey = getVapidPublicKey()
  if (!publicKey) {
    return NextResponse.json(
      { error: 'VAPID public key not found. Please set NEXT_PUBLIC_VAPID_PUBLIC_KEY in environment variables.' },
      { status: 500 }
    )
  }
  return NextResponse.json({ publicKey })
}

// ─── POST: Save or Update Device Push Subscription ───────────────────────────
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('users')
    .select('id, email, role, school_id')
    .eq('id', user.id)
    .single()

  const userEmail = profile?.email || user.email
  if (!userEmail) {
    return NextResponse.json({ error: 'User email not found.' }, { status: 400 })
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

  // Use Admin client to ensure RLS does not block saving subscription
  const adminDb = createAdminClient()
  const { error } = await adminDb.from('push_subscriptions').upsert(
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

  const adminDb = createAdminClient()
  const { error } = await adminDb
    .from('push_subscriptions')
    .delete()
    .eq('endpoint', endpoint)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

