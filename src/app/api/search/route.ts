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

    // Fallback: DuckDuckGo HTML Scraper (No API keys required)
    const ddgRes = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    })
    
    if (!ddgRes.ok) {
      throw new Error(`DuckDuckGo responded with status: ${ddgRes.status}`)
    }

    const html = await ddgRes.text()
    
    // Parse DDG HTML manually (avoiding heavy DOM libraries for Edge compatibility)
    const results: any[] = []
    const resultBlocks = html.split('class="result__body"').slice(1)
    
    for (const block of resultBlocks) {
      if (results.length >= 5) break
      
      const titleMatch = block.match(/class="result__title"[^>]*>[\s\S]*?<a[^>]*>(.*?)<\/a>/i)
      const snippetMatch = block.match(/class="result__snippet[^>]*>(.*?)<\/a>/i)
      const linkMatch = block.match(/href="([^"]+)"/i)
      
      if (titleMatch && snippetMatch) {
        // Clean up bold tags and HTML entities
        const cleanTitle = titleMatch[1].replace(/<\/?[^>]+(>|$)/g, "").trim()
        const cleanSnippet = snippetMatch[1].replace(/<\/?[^>]+(>|$)/g, "").trim()
        const link = linkMatch ? linkMatch[1] : ''
        
        results.push({
          title: cleanTitle,
          snippet: cleanSnippet,
          link: link.startsWith('//') ? 'https:' + link : link
        })
      }
    }

    return NextResponse.json({ items: results })
  } catch (error: any) {
    console.error('Search API error:', error)
    return NextResponse.json({ error: error.message || 'Failed to execute search' }, { status: 500 })
  }
}
