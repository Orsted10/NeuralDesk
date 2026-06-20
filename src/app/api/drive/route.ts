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

    const drive = google.drive({ version: 'v3', auth })

    // List recent files (Docs, Sheets, Slides)
    const response = await drive.files.list({
      pageSize: 10,
      fields: 'files(id, name, mimeType, webViewLink, iconLink, modifiedTime)',
      q: "mimeType = 'application/vnd.google-apps.document' or mimeType = 'application/vnd.google-apps.spreadsheet' or mimeType = 'application/vnd.google-apps.presentation' or mimeType = 'application/vnd.google-apps.folder'",
      orderBy: 'modifiedTime desc'
    })

    return NextResponse.json({ files: response.data.files || [] })
  } catch (error: any) {
    console.error('Google Drive GET Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch files' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session || !session.provider_token) {
      return NextResponse.json({ 
        error: 'Authentication failed: Missing provider token.' 
      }, { status: 401 })
    }

    const { title, content } = await req.json()

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    const auth = new google.auth.OAuth2()
    auth.setCredentials({ access_token: session.provider_token })

    const drive = google.drive({ version: 'v3', auth })

    // Create file metadata
    const fileMetadata = {
      name: title,
      mimeType: 'application/vnd.google-apps.document'
    }

    // Media content (HTML/text)
    const media = {
      mimeType: 'text/html',
      body: `<html><body>${content || ''}</body></html>`
    }

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, name, webViewLink'
    })

    return NextResponse.json({ success: true, file: response.data })
  } catch (error: any) {
    console.error('Google Drive POST Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to create document' }, { status: 500 })
  }
}
