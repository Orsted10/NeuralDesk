import { NextResponse } from 'next/server';

export async function GET() {
  return new NextResponse('google-site-verification: google7897b5a5f7880ad2.html', {
    status: 200,
    headers: {
      'Content-Type': 'text/html',
    },
  });
}
