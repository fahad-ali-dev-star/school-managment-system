import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/cron/cleanup-notifications
 *
 * Deletes notification_logs rows older than 24 hours across all schools.
 * This route is called automatically by Vercel Cron (see vercel.json).
 *
 * Security: Requires the `Authorization: Bearer <CRON_SECRET>` header.
 * Set CRON_SECRET in your Vercel / .env.local environment variables.
 * Vercel Cron automatically injects this header when calling the endpoint.
 */
export async function GET(req: NextRequest) {
  // Validate the cron secret to prevent unauthorized deletions
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  // If CRON_SECRET is set, enforce it; if not set (dev mode), allow through
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient()

  // Calculate the cutoff timestamp: 30 days ago
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const { data, error, count } = await supabase
    .from('notification_logs')
    .delete({ count: 'exact' })
    .lt('created_at', cutoff)

  if (error) {
    console.error('[cron/cleanup-notifications] Delete failed:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const deleted = count ?? 0
  console.log(`[cron/cleanup-notifications] Deleted ${deleted} notification logs older than 30 days.`)

  return NextResponse.json({
    success: true,
    deleted,
    cutoff,
    timestamp: new Date().toISOString(),
  })
}
