import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { to, message, instanceName } = await req.json()
    
    const mode = process.env.WHATSAPP_MODE || 'bridge'
    const apiUrl = process.env.NEXT_PUBLIC_WA_API_URL
    const apiKey = process.env.WA_API_KEY

    // Clean phone number
    const cleanNumber = to.replace(/\D/g, '')

    if (mode === 'bridge') {
      // Use the dynamic instance name from the user's browser session
      // Default to 'aetheria_main' if none provided
      const activeInstance = instanceName || 'aetheria_main'

      const response = await fetch(`${apiUrl}/message/sendText/${activeInstance}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': apiKey!
        },
        body: JSON.stringify({
          number: cleanNumber,
          text: message
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Aetheria Link communication failure.')
      }
      
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ error: 'Legacy mode not supported' }, { status: 501 })
    }

  } catch (error: any) {
    console.error('WhatsApp Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
