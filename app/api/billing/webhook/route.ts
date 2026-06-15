
import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { stripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import Stripe from 'stripe'

export async function POST(req: Request) {
  const body = await req.text()
  const signature = headers().get('stripe-signature') as string

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`)
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 })
  }

  const supabase = createAdminClient()

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const schoolId = session.metadata?.schoolId
      const subscriptionId = session.subscription as string
      const customerId = session.customer as string

      if (schoolId && subscriptionId) {
        // Fetch the subscription to get the price ID
        const subscription = await stripe.subscriptions.retrieve(subscriptionId)
        const priceId = subscription.items.data[0].price.id
        
        let planName = 'free'
        if (priceId === process.env.STRIPE_PRICE_PRO) planName = 'pro'
        else if (priceId === process.env.STRIPE_PRICE_BASIC) planName = 'basic'

        console.log(`Webhook: Updating school ${schoolId} to plan ${planName}`)

        const { error } = await supabase
          .from('schools')
          .update({
            plan: planName,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId
          })
          .eq('id', schoolId)

        if (error) console.error('Error updating school subscription:', error)
      }
      break
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription
      const customerId = subscription.customer as string
      const status = subscription.status

      if (status === 'active') {
        const priceId = subscription.items.data[0].price.id
        let planName = (priceId === process.env.STRIPE_PRICE_PRO) ? 'pro' : 
                       (priceId === process.env.STRIPE_PRICE_BASIC) ? 'basic' : 
                       subscription.items.data[0].plan.nickname?.toLowerCase() || 'pro';

        await supabase
          .from('schools')
          .update({ plan: planName })
          .eq('stripe_customer_id', customerId)
      } else if (status === 'canceled' || status === 'unpaid') {
        await supabase
          .from('schools')
          .update({ plan: 'free' })
          .eq('stripe_customer_id', customerId)
      }
      break
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription
      const customerId = subscription.customer as string

      await supabase
        .from('schools')
        .update({ plan: 'free' })
        .eq('stripe_customer_id', customerId)
      break
    }

    default:
      console.log(`Unhandled event type ${event.type}`)
  }

  return NextResponse.json({ received: true })
}
