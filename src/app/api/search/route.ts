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

    const cookieStore = await cookies()
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

    // Since Google deprecated "Search the entire web" for new CX engines, 
    // we are going Beast Mode and using a server-side DuckDuckGo HTML scraper.
    // Zero API keys required.

    const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`
    
    const ddgRes = await fetch(ddgUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    })

    if (!ddgRes.ok) {
      throw new Error(`DuckDuckGo returned ${ddgRes.status}`)
    }

    const html = await ddgRes.text()
    
    // Quick and dirty regex parsing to extract titles, links, and snippets
    const results = []
    const resultBlockRegex = /<a class="result__url" href="([^"]+)".*?<h2 class="result__title">.*?<a[^>]*>(.*?)<\/a>.*?<a class="result__snippet[^>]*>(.*?)<\/a>/gs
    
    let match
    let count = 0
    while ((match = resultBlockRegex.exec(html)) !== null && count < 5) {
      // Clean up HTML tags from the extracted text
      const url = match[1]
      const title = match[2].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ')
      const snippet = match[3].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ')
      
      results.push({
        title: title.trim(),
        link: url,
        snippet: snippet.trim()
      })
      count++
    }

    if (results.length === 0) {
      // Fallback regex if DuckDuckGo changes their DOM slightly
      const fallbackRegex = /<a class="result__snippet[^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/gs
      let fbMatch
      while ((fbMatch = fallbackRegex.exec(html)) !== null && results.length < 5) {
        results.push({
          title: "Search Result",
          link: fbMatch[1],
          snippet: fbMatch[2].replace(/<[^>]+>/g, '').trim()
        })
      }
    }

    return NextResponse.json({ items: results })
  } catch (error: any) {
    console.error('Search API error:', error)
    return NextResponse.json({ error: error.message || 'Failed to execute search' }, { status: 500 })
  }
}
