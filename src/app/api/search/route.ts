import { NextResponse } from 'next/server'
import { google } from 'googleapis'

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const query = searchParams.get('q')

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 })
    }

    const cx = process.env.GOOGLE_SEARCH_ENGINE_ID
    const apiKey = process.env.GOOGLE_SEARCH_API_KEY || process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.GEMINI_API_KEY

    // If Google API is available, use it
    if (cx && apiKey) {
      const customsearch = google.customsearch('v1')
      const res = await customsearch.cse.list({
        cx: cx,
        q: query,
        auth: apiKey,
        num: 5,
      })

      const results = res.data.items?.map(item => ({
        title: item.title,
        link: item.link,
        snippet: item.snippet
      })) || []

      return NextResponse.json({ items: results })
    }

    // Try Tavily API if available
    const tavilyKey = process.env.TAVILY_API_KEY
    if (tavilyKey) {
      try {
        const tavilyRes = await fetch('https://api.tavily.com/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            api_key: tavilyKey,
            query: query,
            search_depth: "basic",
            include_answer: false,
            max_results: 5
          })
        })
        
        if (tavilyRes.ok) {
          const data = await tavilyRes.json()
          const results = data.results?.map((item: any) => ({
            title: item.title,
            link: item.url,
            snippet: item.content
          })) || []
          
          if (results.length > 0) {
            return NextResponse.json({ items: results })
          }
        }
      } catch (e) {
        console.error("Tavily search failed", e)
      }
    }

    // Fallback: Google News RSS (Real Web Search, Free, Unlimited, 0 IP blocks)
    try {
      const rssRes = await fetch(`https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        }
      })
      
      if (!rssRes.ok) throw new Error("RSS failed")
      
      const xml = await rssRes.text()
      const items = xml.split('<item>')
      const results = []
      
      for (let i = 1; i < Math.min(items.length, 6); i++) {
        const item = items[i]
        const titleMatch = item.match(/<title>(.*?)<\/title>/)
        const linkMatch = item.match(/<link>(.*?)<\/link>/)
        const descMatch = item.match(/<description>(.*?)<\/description>/)
        
        if (titleMatch && linkMatch) {
          let snippet = 'Latest updates regarding this search.'
          if (descMatch) {
            // Strip HTML from description
            snippet = descMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').replace(/<\/?[^>]+(>|$)/g, "").trim()
            if (snippet.length > 200) snippet = snippet.substring(0, 200) + '...'
          }
          
          results.push({
            title: titleMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1'),
            link: linkMatch[1],
            snippet: snippet
          })
        }
      }
      
      return NextResponse.json({ items: results })
    } catch (e) {
      console.error("News RSS search failed", e)
      return NextResponse.json({ items: [] })
    }
  } catch (error: any) {
    console.error('Search API error:', error)
    return NextResponse.json({ error: error.message || 'Failed to execute search' }, { status: 500 })
  }
}
