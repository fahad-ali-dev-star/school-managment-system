
import Stripe from 'stripe'

const apiKey = process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder_key_since_secret_not_provided_during_build'

export const stripe = new Stripe(apiKey, {
  apiVersion: '2022-11-15' as any, // pinned to a stable version
  appInfo: {
    name: 'BeaconERP',
    version: '1.0.0',
  },
})

