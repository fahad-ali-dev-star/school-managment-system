import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

// GET /api/keep-alive
//
// Lightweight DB ping to prevent Supabase free-tier auto-pausing.
// 
// Called automatically every 3 days by Vercel Cron (see vercel.json).
// Can also be called manually with ?secret=NEXT_PUBLIC_SUPER_ADMIN_KEY
//
// Vercel Cron schedule: "0 6 */3 * *" -> Every 3 days at 06:00 UTC
export async function GET(request: Request) {
  const isVercelCron = request.headers.get('authorization') === `Bearer ${process.env.CRON_SECRET}`

  if (!isVercelCron) {
    // Allow manual call with super admin secret
    const { searchParams } = new URL(request.url)
    const secret = searchParams.get('secret')
    if (secret !== process.env.NEXT_PUBLIC_SUPER_ADMIN_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    const supabase = createAdminClient()
    const start = Date.now()

    const { count, error } = await supabase
      .from('schools')
      .select('*', { count: 'exact', head: true })

    if (error) throw error

    const latency = Date.now() - start
    console.log(`[keep-alive] DB ping OK — ${latency}ms — schools: ${count}`)

    return NextResponse.json({
      status: 'alive',
      latency_ms: latency,
      schools_count: count,
      timestamp: new Date().toISOString(),
      triggered_by: isVercelCron ? 'vercel-cron' : 'manual',
    })
  } catch (err: any) {
    console.error('[keep-alive] DB ping failed:', err.message)
    return NextResponse.json(
      { status: 'error', message: err.message },
      { status: 500 }
    )
  }
}
