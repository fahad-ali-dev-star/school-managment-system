
import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(req: Request) {
  try {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return cookieStore.get(name)?.value },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the school's stripe_customer_id
    const { data: school } = await supabase
      .from('schools')
      .select('stripe_customer_id')
      .eq('admin_id', user.id) // Assuming admin_id links user to school
      .single()

    if (!school?.stripe_customer_id) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 404 })
    }

    // Create a Billing Portal Session
    const session = await stripe.billingPortal.sessions.create({
      customer: school.stripe_customer_id,
      return_url: `${req.headers.get('origin')}/dashboard/settings`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    console.error('Portal Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
