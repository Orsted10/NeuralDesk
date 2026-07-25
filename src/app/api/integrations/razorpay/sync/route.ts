import { ingestToBrain } from '@/lib/brain/embedding-pipeline';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const data = await req.json();
    
    // Validate Webhook Signature here in production
    
    // Format data for the Living Brain
    const content = JSON.stringify(data); // Naive formatting for scaffold
    const sourceId = data.id || Date.now().toString();

    await ingestToBrain({
      sourcePlatform: 'razorpay' as any, // Cast to any since we didn't add it to IntegrationPlatform type explicitly yet
      sourceId: sourceId,
      content: content,
      metadata: { receivedAt: new Date().toISOString() }
    });

    return NextResponse.json({ success: true, message: 'Ingested into Living Brain' });
  } catch (error: any) {
    console.error('[razorpay Sync Error]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
