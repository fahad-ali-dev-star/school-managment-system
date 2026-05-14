
import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2022-11-15' as any, // pinned to a stable version
  appInfo: {
    name: 'BeaconERP',
    version: '1.0.0',
  },
})
