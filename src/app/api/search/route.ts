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

    // Fallback: Yahoo Web Search (Real Web Search, Free, Unlimited, lenient IP blocks)
    const yahooRes = await fetch(`https://search.yahoo.com/search?p=${encodeURIComponent(query)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    })
    
    if (!yahooRes.ok) {
      throw new Error(`Search engine responded with status: ${yahooRes.status}`)
    }

    const html = await yahooRes.text()
    
    const results: any[] = []
    const resultBlocks = html.split('<div class="compTitle')
    
    for (let i = 1; i < resultBlocks.length; i++) {
      if (results.length >= 5) break
      const block = resultBlocks[i]
      
      const titleMatch = block.match(/<h3[^>]*>[\s\S]*?<a[^>]*href=['"]([^'"]+)['"][^>]*>([\s\S]*?)<\/a>/i)
      const snippetMatch = block.match(/<div class="compText[^>]*>([\s\S]*?)<\/div>/i)
      
      if (titleMatch) {
        const link = titleMatch[1]
        let title = titleMatch[2].replace(/<\/?[^>]+(>|$)/g, "").trim()
        let snippet = snippetMatch ? snippetMatch[1].replace(/<\/?[^>]+(>|$)/g, "").trim() : ''
        
        // Skip junk results
        if (title.toLowerCase().includes('yahoo') && snippet.toLowerCase().includes('summary generated')) continue;
        if (!title || !snippet) continue;
        
        // Some Yahoo links are redirect links, extract the real RU= url
        let finalLink = link
        const ruMatch = link.match(/\/RU=([^/]+)\//)
        if (ruMatch) {
          finalLink = decodeURIComponent(ruMatch[1])
        }
        
        results.push({ title, snippet, link: finalLink })
      }
    }

    return NextResponse.json({ items: results })
  } catch (error: any) {
    console.error('Search API error:', error)
    return NextResponse.json({ error: error.message || 'Failed to execute search' }, { status: 500 })
  }
}
