import { NextResponse } from 'next/server'
import { google } from 'googleapis'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const query = searchParams.get('q')

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 })
    }

    const cx = process.env.GOOGLE_SEARCH_ENGINE_ID
    // Fallbacks: If you didn't define a dedicated search key, it will try the Maps key or Gemini key.
    const apiKey = process.env.GOOGLE_SEARCH_API_KEY || process.env.GOOGLE_MAPS_API_KEY || process.env.GEMINI_API_KEY

    if (!cx || !apiKey) {
      return NextResponse.json({ 
        error: 'Missing Google Search credentials. Please add GOOGLE_SEARCH_ENGINE_ID and GOOGLE_SEARCH_API_KEY to your .env.local file.' 
      }, { status: 500 })
    }

    const customsearch = google.customsearch('v1')
    
    const res = await customsearch.cse.list({
      cx: cx,
      q: query,
      auth: apiKey,
      num: 5, // Get top 5 results
    })

    const results = res.data.items?.map(item => ({
      title: item.title,
      link: item.link,
      snippet: item.snippet
    })) || []

    return NextResponse.json({ items: results })
  } catch (error: any) {
    console.error('Search API error:', error)
    return NextResponse.json({ error: error.message || 'Failed to execute search' }, { status: 500 })
  }
}
