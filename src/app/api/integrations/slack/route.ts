import { NextResponse } from 'next/server'

// We will import this in Phase 3
import { ingestToBrain } from '@/lib/brain/embedding-pipeline'

export async function POST(req: Request) {
  try {
    const body = await req.json()

    // 1. Handle Slack URL Verification Challenge
    if (body.type === 'url_verification') {
      return NextResponse.json({ challenge: body.challenge })
    }

    // 2. Handle Event Callbacks
    if (body.type === 'event_callback') {
      const event = body.event

      // Only listen to message events that are NOT from bots
      if (event.type === 'message' && !event.bot_id && event.text) {
        console.log(`[Living Brain] Captured Slack Message in channel ${event.channel}`)
        
        // Await the ingestion so Vercel Serverless doesn't terminate the process early
        await ingestToBrain({
          sourcePlatform: 'slack',
          sourceId: event.ts,
          content: event.text,
          metadata: {
            user: event.user,
            channel: event.channel,
            thread_ts: event.thread_ts || null,
          }
        }).catch(err => console.error('[Living Brain] Ingestion failed:', err))
      }
      
      // Always return 200 OK to Slack immediately
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Unhandled event type' }, { status: 400 })

  } catch (error) {
    console.error('[Slack Webhook Error]:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
