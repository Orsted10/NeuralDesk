import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // 1. URL Verification Challenge (Slack requirement when setting up webhooks)
    if (body.type === 'url_verification') {
      return new Response(body.challenge, {
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
      });
    }

    // Dynamically import vector-store to prevent ONNX/Webpack issues from crashing the challenge response
    const { upsertKnowledge } = await import('@/lib/vector-store');

    // 2. Handle actual Slack messages
    if (body.event && body.event.type === 'message' && !body.event.bot_id) {
      const message = body.event.text;
      const channelId = body.event.channel;
      const userId = body.event.user;
      const ts = body.event.ts;

      // Extract raw meaning or metadata. In a real system, we could query the Slack API to get the channel name.
      const content = `Slack Message in channel ${channelId} by user ${userId}: ${message}`;
      
      const metadata = {
        source: 'slack',
        channelId,
        userId,
        timestamp: ts,
        url: `slack://channel?id=${channelId}&message=${ts}`
      };

      // Store in vector DB
      await upsertKnowledge(content, metadata);

      console.log(`[SLACK-INGEST] Indexed message from channel ${channelId}`);
    }

    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('[SLACK-WEBHOOK-ERROR]', error);
    return NextResponse.json({ error: 'Failed to process webhook' }, { status: 500 });
  }
}
