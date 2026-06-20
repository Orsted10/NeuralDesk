import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('query')

  if (!query) {
    return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 })
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Google Maps API key is not configured' }, { status: 500 })
  }

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${apiKey}`
    )
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Maps Proxy Error:', error)
    return NextResponse.json({ error: 'Failed to fetch geocoding data' }, { status: 500 })
  }
}
