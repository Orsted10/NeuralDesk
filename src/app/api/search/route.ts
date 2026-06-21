import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { google } from 'googleapis'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const query = searchParams.get('q')

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 })
    }

    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )

    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    if (sessionError || !session?.provider_token) {
      return NextResponse.json({ 
        error: 'Not authenticated with Google',
        details: sessionError 
      }, { status: 401 })
    }

    const auth = new google.auth.OAuth2()
    auth.setCredentials({ access_token: session.provider_token })

    // If GOOGLE_SEARCH_ENGINE_ID (cx) is missing, we must fail gracefully
    const cx = process.env.GOOGLE_SEARCH_ENGINE_ID
    if (!cx) {
      return NextResponse.json({
        error: 'GOOGLE_SEARCH_ENGINE_ID is missing in .env.local',
        mockResults: true,
        items: [
          { title: 'Mock Result 1', link: 'https://example.com', snippet: 'Since CX is missing, this is a mock search result.' }
        ]
      })
    }

    const customsearch = google.customsearch('v1')
    const res = await customsearch.cse.list({
      q: query,
      cx: cx,
      auth: auth
    })

    return NextResponse.json({ items: res.data.items || [] })
  } catch (error: any) {
    console.error('Search API error:', error)
    return NextResponse.json({ error: error.message || 'Failed to execute search' }, { status: 500 })
  }
}
