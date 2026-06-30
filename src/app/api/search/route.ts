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

    // Fallback: DuckDuckGo Lite Scraper (Much more resilient to serverless blocking)
    const ddgRes = await fetch(`https://lite.duckduckgo.com/lite/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      body: `q=${encodeURIComponent(query)}`
    })
    
    if (!ddgRes.ok) {
      throw new Error(`DuckDuckGo responded with status: ${ddgRes.status}`)
    }

    const html = await ddgRes.text()
    
    const results: any[] = []
    const linkRegex = /<a[^>]+class=['"]result-link['"][^>]*>([\s\S]*?)<\/a>/gi;
    const snippetRegex = /class=['"]result-snippet['"][^>]*>([\s\S]*?)<\/td>/gi;
    
    const linkMatches = [...html.matchAll(linkRegex)];
    const snippetMatches = [...html.matchAll(snippetRegex)];
    
    for (let i = 0; i < Math.min(linkMatches.length, 5); i++) {
        const aTagMatch = linkMatches[i][0].match(/href=['"]([^'"]+)['"]/i);
        const link = aTagMatch ? aTagMatch[1] : '';
        const title = linkMatches[i][1].replace(/<\/?[^>]+(>|$)/g, "").trim();
        const snippet = snippetMatches[i] ? snippetMatches[i][1].replace(/<\/?[^>]+(>|$)/g, "").trim() : '';
        
        results.push({
          title,
          snippet,
          link: link.startsWith('//') ? 'https:' + link : link
        });
    }

    return NextResponse.json({ items: results })
  } catch (error: any) {
    console.error('Search API error:', error)
    return NextResponse.json({ error: error.message || 'Failed to execute search' }, { status: 500 })
  }
}
