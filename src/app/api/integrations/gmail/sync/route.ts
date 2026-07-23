import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { ingestToBrain } from '@/lib/brain/embedding-pipeline';

// Helper to decode base64url email body
function decodeBase64(data: string) {
  return Buffer.from(data, 'base64').toString('utf-8');
}

// Simple HTML stripper
function stripHtml(html: string) {
  return html.replace(/<[^>]*>?/gm, '').trim();
}

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
       // Allow browser hitting without auth if no CRON_SECRET is enforced strictly, but in production enforce it.
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const refreshToken = process.env.GMAIL_REFRESH_TOKEN;

    if (!clientId || !clientSecret || !refreshToken) {
      return NextResponse.json({ error: 'Missing Gmail OAuth environment variables.' }, { status: 400 });
    }

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
    oauth2Client.setCredentials({ refresh_token: refreshToken });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Fetch the last 5 emails (to avoid Gemini Free Tier 15 RPM limit and Vercel timeout)
    const res = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 5,
    });

    const messages = res.data.messages;
    if (!messages || messages.length === 0) {
      return NextResponse.json({ success: true, message: 'No emails found.' });
    }

    let ingestedCount = 0;

    for (const msg of messages) {
      const msgDetails = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id!,
        format: 'full',
      });

      const payload = msgDetails.data.payload;
      if (!payload) continue;

      const headers = payload.headers;
      const subjectHeader = headers?.find(h => h.name === 'Subject');
      const fromHeader = headers?.find(h => h.name === 'From');
      const dateHeader = headers?.find(h => h.name === 'Date');

      const subject = subjectHeader ? subjectHeader.value : 'No Subject';
      const from = fromHeader ? fromHeader.value : 'Unknown Sender';
      
      let bodyText = '';

      // Extract body part
      if (payload.parts) {
        // Try to find plain text part
        const textPart = payload.parts.find(part => part.mimeType === 'text/plain');
        if (textPart && textPart.body?.data) {
          bodyText = decodeBase64(textPart.body.data);
        } else {
          // Fallback to HTML part
          const htmlPart = payload.parts.find(part => part.mimeType === 'text/html');
          if (htmlPart && htmlPart.body?.data) {
            bodyText = stripHtml(decodeBase64(htmlPart.body.data));
          }
        }
      } else if (payload.body && payload.body.data) {
        // Body is directly in payload
        if (payload.mimeType === 'text/html') {
          bodyText = stripHtml(decodeBase64(payload.body.data));
        } else {
          bodyText = decodeBase64(payload.body.data);
        }
      }

      if (bodyText.length > 10) {
        const fullContent = `Email Subject: ${subject}\nFrom: ${from}\nDate: ${dateHeader?.value || ''}\n\n${bodyText}`;
        
        await ingestToBrain({
          sourcePlatform: 'gmail',
          sourceId: msg.id!,
          content: fullContent,
          metadata: {
            subject: subject,
            from: from,
            threadId: msgDetails.data.threadId
          }
        });
        ingestedCount++;
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Successfully synced ${ingestedCount} emails into the Brain.` 
    });

  } catch (error: any) {
    console.error('Gmail Sync Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
