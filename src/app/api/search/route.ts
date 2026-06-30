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

    // Fallback: SearxNG Scatter-Gather Web Search (Real, Free, Unlimited, IP-block resistant)
    try {
      const spaceRes = await fetch('https://searx.space/data/instances.json', { next: { revalidate: 3600 } })
      const data = await spaceRes.json()
      
      // Get 25 random instances to scatter requests across
      const instances = Object.keys(data.instances).sort(() => 0.5 - Math.random()).slice(0, 25)
      
      const fetchPromises = instances.map(url => {
        return new Promise<any>(async (resolve, reject) => {
          try {
            const controller = new AbortController()
            const id = setTimeout(() => controller.abort(), 8000)
            
            const res = await fetch(`${url}search?q=${encodeURIComponent(query)}&format=json`, {
              signal: controller.signal,
              headers: {
                'Accept': 'application/json'
              }
            })
            clearTimeout(id)
            
            if (res.ok) {
              const json = await res.json()
              if (json.results && json.results.length > 0) {
                const searchResults = json.results.slice(0, 5).map((r: any) => ({
                  title: r.title,
                  snippet: r.content || r.snippet || '',
                  link: r.url
                }))
                resolve(searchResults)
                return
              }
            }
            reject('No results')
          } catch (e) {
            reject(e)
          }
        })
      })
      
      // Promise.any returns the FIRST successful result and cancels the rest
      const results = await Promise.any(fetchPromises)
      return NextResponse.json({ items: results })
    } catch (e) {
      console.error("SearxNG parallel search failed", e)
      return NextResponse.json({ items: [] })
    }
  } catch (error: any) {
    console.error('Search API error:', error)
    return NextResponse.json({ error: error.message || 'Failed to execute search' }, { status: 500 })
  }
}
