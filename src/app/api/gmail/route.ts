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
          format: 'full'
        })
        
        const headers = msgDetail.data.payload?.headers
        const subject = headers?.find(h => h.name === 'Subject')?.value || 'No Subject'
        const from = headers?.find(h => h.name === 'From')?.value || 'Unknown Sender'
        const date = headers?.find(h => h.name === 'Date')?.value || ''

        // Helper to extract plain text body
        const getBodyText = (payload: any): string => {
          let text = ''
          let html = ''

          const extract = (p: any) => {
            if (p.mimeType === 'text/plain' && p.body?.data) {
              text = Buffer.from(p.body.data, 'base64').toString('utf8')
            } else if (p.mimeType === 'text/html' && p.body?.data) {
              html = Buffer.from(p.body.data, 'base64').toString('utf8')
            }
            if (p.parts) {
              for (const part of p.parts) {
                extract(part)
              }
            }
          }

          if (payload.parts) {
            extract(payload)
          } else if (payload.body?.data) {
            if (payload.mimeType === 'text/plain') {
              text = Buffer.from(payload.body.data, 'base64').toString('utf8')
            } else if (payload.mimeType === 'text/html') {
              html = Buffer.from(payload.body.data, 'base64').toString('utf8')
            } else {
              text = Buffer.from(payload.body.data, 'base64').toString('utf8')
            }
          }

          if (text) return text
          if (html) {
            // Very basic HTML to text: remove <style> and <script>, then remove all tags, then decode basic entities
            let clean = html.replace(/<(style|script)[^>]*>[\s\S]*?<\/\1>/gi, '')
            clean = clean.replace(/<[^>]+>/g, ' ')
            clean = clean.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
            // Collapse multiple spaces/newlines
            clean = clean.replace(/\s+/g, ' ').trim()
            return clean
          }
          return ''
        }

        const bodyStr = getBodyText(msgDetail.data.payload)
        
        return {
          id: msg.id,
          snippet: msgDetail.data.snippet,
          body: bodyStr,
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
