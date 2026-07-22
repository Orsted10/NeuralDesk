import { NextResponse } from 'next/server';
import { ingestToBrain } from '@/lib/brain/embedding-pipeline';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // 1. URL Verification Challenge (Slack requirement when setting up webhooks)
    if (body.type === 'url_verification') {
      return NextResponse.json({ challenge: body.challenge });
    }

    // 2. Handle actual Slack messages
    if (body.event && body.event.type === 'message' && !body.event.bot_id && body.event.text) {
      const { text, channel, user, ts, thread_ts } = body.event;

      console.log(`[Living Brain] Captured Slack Message in channel ${channel}`);

      // Use the Living Brain pipeline with Gemini embeddings
      await ingestToBrain({
        sourcePlatform: 'slack',
        sourceId: ts,
        content: text,
        metadata: {
          user,
          channel,
          thread_ts: thread_ts || null,
          url: `slack://channel?id=${channel}&message=${ts}`
        }
      }).catch(err => console.error('[Living Brain] Ingestion failed:', err));
    }

    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('[SLACK-WEBHOOK-ERROR]', error);
    return NextResponse.json({ error: 'Failed to process webhook' }, { status: 500 });
  }
}
