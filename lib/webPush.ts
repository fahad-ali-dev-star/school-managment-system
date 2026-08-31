import webpush from 'web-push'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// ─── Default / Fallback VAPID Keys ─────────────────────────────────────────────
// Used for immediate development and production if env vars are not yet configured.
const DEFAULT_VAPID_PUBLIC =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  'BNOvUa_JdCgU6Hl9vW3bL7K1a5v1Q8G2M7P4S3R8t9X2L6z5m0N3V1C7k8P4q2W9'
const DEFAULT_VAPID_PRIVATE =
  process.env.VAPID_PRIVATE_KEY ||
  'e-F8L7uK5v3m0R2T9q1W4Z6p8x2c7n1j3H5k8A0b4v8'
const DEFAULT_VAPID_SUBJECT =
  process.env.VAPID_SUBJECT || 'mailto:support@school.com'

let isConfigured = false

function ensureVapidConfig() {
  if (!isConfigured) {
    try {
      const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || DEFAULT_VAPID_PUBLIC
      const priv = process.env.VAPID_PRIVATE_KEY || DEFAULT_VAPID_PRIVATE
      const sub = process.env.VAPID_SUBJECT || DEFAULT_VAPID_SUBJECT

      webpush.setVapidDetails(sub, pub, priv)
      isConfigured = true
    } catch (err) {
      console.error('[WebPush] Failed to set VAPID details:', err)
    }
  }
}

export function getVapidPublicKey(): string {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || DEFAULT_VAPID_PUBLIC
}

export interface PushPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  url?: string
  tag?: string
  data?: Record<string, any>
}

// ─── Direct Push to single Subscription ──────────────────────────────────────
export async function sendWebPushNotification(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: PushPayload
): Promise<{ success: boolean; statusCode?: number; error?: string }> {
  ensureVapidConfig()

  const pushSubscription = {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.p256dh,
      auth: subscription.auth,
    },
  }

  try {
    const res = await webpush.sendNotification(
      pushSubscription,
      JSON.stringify({
        title: payload.title,
        body: payload.body,
        icon: payload.icon || '/icons/icon-192x192.png',
        badge: payload.badge || '/icons/icon-192x192.png',
        url: payload.url || '/parent/alerts',
        tag: payload.tag || `school-${Date.now()}`,
        data: payload.data || {},
      })
    )
    return { success: true, statusCode: res.statusCode }
  } catch (err: any) {
    console.warn('[WebPush] Send notification error:', err?.statusCode, err?.message)
    return {
      success: false,
      statusCode: err?.statusCode,
      error: err?.message || 'Push delivery failed',
    }
  }
}

// ─── Dispatch Push Notification to Parent(s) ─────────────────────────────────
export async function dispatchPushToParents({
  schoolId,
  parentEmail,
  studentId,
  title,
  body,
  url = '/parent/alerts',
  tag,
}: {
  schoolId?: string
  parentEmail?: string
  studentId?: string
  title: string
  body: string
  url?: string
  tag?: string
}): Promise<{ sent: number; failed: number }> {
  // Use Service Role / Admin client to query subscriptions table
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.warn('[WebPush] Supabase environment variables not configured.')
    return { sent: 0, failed: 0 }
  }

  const adminClient = createSupabaseClient(supabaseUrl, supabaseServiceKey)

  try {
    let emailsToTarget = new Set<string>()

    if (parentEmail) {
      emailsToTarget.add(parentEmail.trim().toLowerCase())
    }

    // If studentId provided, fetch parent email for that student if not provided
    if (studentId && (!parentEmail || emailsToTarget.size === 0)) {
      const { data: student } = await adminClient
        .from('students')
        .select('parent_email')
        .eq('id', studentId)
        .single()

      if (student?.parent_email) {
        emailsToTarget.add(student.parent_email.trim().toLowerCase())
      }
    }

    // Query active device subscriptions for these parents
    let subQuery = adminClient.from('push_subscriptions').select('id, endpoint, p256dh, auth, user_email')

    if (emailsToTarget.size > 0) {
      const emailList = Array.from(emailsToTarget)
      subQuery = subQuery.in('user_email', emailList)
    } else if (schoolId) {
      subQuery = subQuery.eq('school_id', schoolId)
    } else {
      return { sent: 0, failed: 0 }
    }

    const { data: subscriptions, error } = await subQuery

    if (error || !subscriptions || subscriptions.length === 0) {
      return { sent: 0, failed: 0 }
    }

    let sent = 0
    let failed = 0
    const deadSubscriptionIds: string[] = []

    for (const sub of subscriptions) {
      const result = await sendWebPushNotification(
        {
          endpoint: sub.endpoint,
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
        {
          title,
          body,
          url,
          tag: tag || `alert-${Date.now()}`,
        }
      )

      if (result.success) {
        sent++
      } else {
        failed++
        // HTTP 404 or 410 indicates the push subscription has expired or was revoked by browser
        if (result.statusCode === 404 || result.statusCode === 410) {
          deadSubscriptionIds.push(sub.id)
        }
      }
    }

    // Prune dead subscriptions from database
    if (deadSubscriptionIds.length > 0) {
      await adminClient.from('push_subscriptions').delete().in('id', deadSubscriptionIds)
    }

    return { sent, failed }
  } catch (err) {
    console.error('[WebPush] Error dispatching push to parents:', err)
    return { sent: 0, failed: 0 }
  }
}
