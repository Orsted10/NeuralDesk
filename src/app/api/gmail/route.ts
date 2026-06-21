import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { google } from 'googleapis'

export async function GET(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session || !session.provider_token) {
      return NextResponse.json({ 
        error: 'Authentication failed: Missing provider token.' 
      }, { status: 401 })
    }

    const auth = new google.auth.OAuth2()
    auth.setCredentials({ access_token: session.provider_token })

    const gmail = google.gmail({ version: 'v1', auth })

    // Fetch the 5 most recent unread emails
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: 'is:unread',
      maxResults: 5
    })

    const messages = response.data.messages || []
    
    const emailDetails = await Promise.all(
      messages.map(async (msg) => {
        if (!msg.id) return null
        const msgDetail = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id,
          format: 'metadata',
          metadataHeaders: ['Subject', 'From', 'Date']
        })
        
        const headers = msgDetail.data.payload?.headers
        const subject = headers?.find(h => h.name === 'Subject')?.value || 'No Subject'
        const from = headers?.find(h => h.name === 'From')?.value || 'Unknown Sender'
        const date = headers?.find(h => h.name === 'Date')?.value || ''
        
        return {
          id: msg.id,
          snippet: msgDetail.data.snippet,
          subject,
          from,
          date
        }
      })
    )

    return NextResponse.json({ emails: emailDetails.filter(Boolean) })
  } catch (error: any) {
    console.error('Google Gmail GET Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch emails' }, { status: 500 })
  }
}
