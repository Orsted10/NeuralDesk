import { NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const redirectUri = `${url.protocol}//${url.host}/api/integrations/gmail/callback`;

    if (!code) {
      return NextResponse.json({ error: 'No authorization code found in URL.' }, { status: 400 });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json({ error: 'Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET.' }, { status: 400 });
    }

    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    const { tokens } = await oauth2Client.getToken(code);
    
    // In a production app, we would save this to the database tied to the user ID.
    // For this prototype, we'll display it to the user so they can add it to Vercel.
    const refreshToken = tokens.refresh_token;

    if (!refreshToken) {
       return new NextResponse(`
        <html>
          <body style="font-family: sans-serif; padding: 2rem;">
            <h2>Authentication Successful (but no refresh token)</h2>
            <p>You did not receive a refresh token. This usually happens if you've already authorized the app previously.</p>
            <p>To fix this, go to your Google Account permissions, remove the app, and try again.</p>
          </body>
        </html>
      `, { headers: { 'Content-Type': 'text/html' } });
    }

    return new NextResponse(`
      <html>
        <body style="font-family: sans-serif; padding: 2rem;">
          <h2 style="color: green;">✅ Gmail Authorized Successfully!</h2>
          <p>Please copy the Refresh Token below and add it to your Vercel Environment Variables as <b>GMAIL_REFRESH_TOKEN</b>:</p>
          <div style="background: #f4f4f4; padding: 1rem; border-radius: 8px; border: 1px solid #ddd; word-break: break-all; font-family: monospace;">
            ${refreshToken}
          </div>
          <p>After saving it in Vercel (and waiting for redeployment), you can run the sync by visiting: <br/> <a href="/api/integrations/gmail/sync">/api/integrations/gmail/sync</a></p>
        </body>
      </html>
    `, { headers: { 'Content-Type': 'text/html' } });

  } catch (error: any) {
    console.error('Gmail Callback Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
