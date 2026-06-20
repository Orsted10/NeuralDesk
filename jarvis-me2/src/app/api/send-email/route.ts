import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendMailViaOAuth } from '@/lib/mailer'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session || !session.provider_token) {
      return NextResponse.json({ 
        error: 'Authentication failed: Missing provider token. Please log out and log back in.' 
      }, { status: 401 })
    }

    const { to, subject, html } = await req.json()

    if (!to || !subject || !html) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const result = await sendMailViaOAuth(session.provider_token, to, subject, html)
    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Send Email Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to send email' }, { status: 500 })
  }
}
