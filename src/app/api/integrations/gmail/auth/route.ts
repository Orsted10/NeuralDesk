import { NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function GET(req: Request) {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    
    // For Vercel production, this should be the Vercel domain.
    // We dynamically infer it from the request if possible, or fallback.
    const url = new URL(req.url);
    const redirectUri = `${url.protocol}//${url.host}/api/integrations/gmail/callback`;

    if (!clientId || !clientSecret) {
      return NextResponse.json({ error: 'Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET environment variables.' }, { status: 400 });
    }

    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    const scopes = [
      'https://www.googleapis.com/auth/gmail.readonly'
    ];

    const authorizationUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline', // Requests a refresh token
      prompt: 'consent',      // Forces consent screen so we definitely get a refresh token
      scope: scopes,
      include_granted_scopes: true
    });

    // Redirect user to Google login
    return NextResponse.redirect(authorizationUrl);

  } catch (error: any) {
    console.error('Gmail Auth Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
