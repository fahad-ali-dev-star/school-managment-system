// ─── Format Pakistani phone to E.164 ─────────────────────────
export function formatPhone(phone: string): string {
  let cleaned = phone.replace(/[\s\-\(\)]/g, '')
  if (cleaned.startsWith('03'))  cleaned = '+92' + cleaned.slice(1)
  if (cleaned.startsWith('92') && !cleaned.startsWith('+')) cleaned = '+' + cleaned
  if (!cleaned.startsWith('+')) cleaned = '+92' + cleaned
  return cleaned
}

// ─── Template engine ──────────────────────────────────────────
export function buildMessage(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? '')
}

// ─── Core Twilio sender ───────────────────────────────────────
async function twilioSend(to: string, from: string, body: string) {
  const sid   = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN

  if (!sid || !token) {
    console.log(`[DEMO] ${from} → ${to}: ${body.slice(0, 80)}`)
    return { success: true }
  }

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method:  'POST',
      headers: {
        Authorization:  `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ From: from, To: to, Body: body }).toString(),
    }
  )

  const data = await res.json()

  if (!res.ok) {
    // Map Twilio error codes to friendly messages
    const msg =
      data.code === 63016 ? 'Parent has not joined the WhatsApp sandbox. They must send the join code to +14155238886 first.' :
      data.code === 21606 ? 'WhatsApp channel not enabled on this sender number.' :
      data.code === 21614 ? 'Invalid recipient phone number.' :
      data.code === 21408 ? 'Permission denied — check Twilio account permissions.' :
      data.message ?? `Twilio error (code ${data.code})`
    return { success: false, error: msg }
  }

  return { success: true, sid: data.sid }
}

// ─── WhatsApp via Sandbox ─────────────────────────────────────
export async function sendWhatsApp(to: string, message: string) {
  const from    = process.env.TWILIO_WHATSAPP_NUMBER ?? 'whatsapp:+14155238886'
  const formTo  = `whatsapp:${formatPhone(to)}`
  return twilioSend(formTo, from, message)
}

// ─── SMS via Twilio number ────────────────────────────────────
export async function sendSMS(to: string, message: string) {
  const from   = process.env.TWILIO_SMS_NUMBER ?? '+19342299149'
  const formTo = formatPhone(to)
  return twilioSend(formTo, from, message)
}

// ─── Send via chosen channel ──────────────────────────────────
export async function sendNotification(
  to: string,
  message: string,
  channel: 'whatsapp' | 'sms' | 'both'
): Promise<{ success: boolean; error?: string }> {
  if (channel === 'whatsapp') return sendWhatsApp(to, message)
  if (channel === 'sms')      return sendSMS(to, message)

  // Both — send to both, succeed if at least one works
  const [wa, sms] = await Promise.all([sendWhatsApp(to, message), sendSMS(to, message)])
  if (wa.success || sms.success) return { success: true }
  return { success: false, error: `WA: ${wa.error} | SMS: ${sms.error}` }
}
