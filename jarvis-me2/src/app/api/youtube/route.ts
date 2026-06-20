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

    const { searchParams } = new URL(req.url)
    const query = searchParams.get('query')

    if (!query) {
      return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 })
    }

    const auth = new google.auth.OAuth2()
    auth.setCredentials({ access_token: session.provider_token })

    const youtube = google.youtube({ version: 'v3', auth })

    const response = await youtube.search.list({
      part: ['snippet'],
      q: query,
      maxResults: 24,
      type: ['video']
    })

    const videos = response.data.items?.map((item) => ({
      id: item.id?.videoId,
      title: item.snippet?.title,
      description: item.snippet?.description,
      thumbnail: item.snippet?.thumbnails?.medium?.url,
      channelTitle: item.snippet?.channelTitle,
      publishedAt: item.snippet?.publishedAt
    })) || []

    return NextResponse.json({ videos })
  } catch (error: any) {
    console.error('Google YouTube GET Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to search YouTube videos' }, { status: 500 })
  }
}
