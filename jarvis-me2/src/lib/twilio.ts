import twilio from 'twilio'

const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const fromNumber = process.env.TWILIO_WHATSAPP_FROM // e.g. 'whatsapp:+14155238886'

const client = twilio(accountSid, authToken)

export async function sendWhatsApp(to: string, message: string) {
  try {
    const formattedTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`
    const result = await client.messages.create({
      body: message,
      from: fromNumber,
      to: formattedTo,
    })
    console.log('WhatsApp message sent: %s', result.sid)
    return { success: true, sid: result.sid }
  } catch (error) {
    console.error('Error sending WhatsApp:', error)
    throw error
  }
}
