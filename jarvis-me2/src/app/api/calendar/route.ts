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

    const calendar = google.calendar({ version: 'v3', auth })

    const { searchParams } = new URL(req.url)
    const dateParam = searchParams.get('date')
    
    // Get events for the requested date (or today)
    const targetDate = dateParam ? new Date(dateParam) : new Date()
    
    const startOfDay = new Date(targetDate)
    startOfDay.setHours(0, 0, 0, 0)
    
    const endOfDay = new Date(targetDate)
    endOfDay.setHours(23, 59, 59, 999)

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: startOfDay.toISOString(),
      timeMax: endOfDay.toISOString(),
      maxResults: 10,
      singleEvents: true,
      orderBy: 'startTime',
    })

    return NextResponse.json({ events: response.data.items || [] })
  } catch (error: any) {
    console.error('Google Calendar GET Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch calendar events' }, { status: 500 })
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

    const { summary, description, startDateTime, endDateTime } = await req.json()

    if (!summary || !startDateTime || !endDateTime) {
      return NextResponse.json({ error: 'Missing required event fields' }, { status: 400 })
    }

    const auth = new google.auth.OAuth2()
    auth.setCredentials({ access_token: session.provider_token })

    const calendar = google.calendar({ version: 'v3', auth })

    const event = {
      summary,
      description,
      start: {
        dateTime: startDateTime,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      end: {
        dateTime: endDateTime,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    }

    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
    })

    return NextResponse.json({ success: true, event: response.data })
  } catch (error: any) {
    console.error('Google Calendar POST Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to create calendar event' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session || !session.provider_token) {
      return NextResponse.json({ 
        error: 'Authentication failed: Missing provider token.' 
      }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const eventId = searchParams.get('eventId')

    if (!eventId) {
      return NextResponse.json({ error: 'Missing required eventId parameter' }, { status: 400 })
    }

    const auth = new google.auth.OAuth2()
    auth.setCredentials({ access_token: session.provider_token })

    const calendar = google.calendar({ version: 'v3', auth })

    await calendar.events.delete({
      calendarId: 'primary',
      eventId: eventId,
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Google Calendar DELETE Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to delete calendar event' }, { status: 500 })
  }
}
