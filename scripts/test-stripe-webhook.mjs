
import fetch from 'node-fetch';
import crypto from 'crypto';

// Configuration
const WEBHOOK_URL = 'http://localhost:3000/api/billing/webhook';
const WEBHOOK_SECRET = 'whsec_placeholder'; // Match what's in your .env.local for local testing
const SCHOOL_ID = 'your-school-id'; // Replace with a real school ID from your DB

const payload = JSON.stringify({
  id: 'evt_test_' + Date.now(),
  object: 'event',
  api_version: '2022-11-15',
  created: Math.floor(Date.now() / 1000),
  type: 'checkout.session.completed',
  data: {
    object: {
      id: 'cs_test_a1' + Date.now(),
      object: 'checkout.session',
      customer: 'cus_test_123',
      subscription: 'sub_test_123',
      metadata: {
        schoolId: SCHOOL_ID
      },
      payment_status: 'paid'
    }
  }
});

// For local testing without signature verification, you might need to temporarily 
// disable verification in your route.ts OR generate a valid signature here.
// Since signature verification requires the secret, we'll try to simulate a valid-ish header.

const signature = crypto
  .createHmac('sha256', WEBHOOK_SECRET)
  .update(`${Math.floor(Date.now() / 1000)}.${payload}`)
  .digest('hex');

const stripeSignature = `t=${Math.floor(Date.now() / 1000)},v1=${signature}`;

async function sendTestWebhook() {
  console.log('🚀 Sending test webhook to:', WEBHOOK_URL);
  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Stripe-Signature': stripeSignature
      },
      body: payload
    });

    const data = await response.json();
    console.log('✅ Response:', response.status, data);
  } catch (error) {
    console.error('❌ Error sending webhook:', error.message);
  }
}

sendTestWebhook();
