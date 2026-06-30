import { NextResponse } from 'next/server'
import OpenAI from 'openai'

export async function POST(req: Request) {
  try {
    const { text } = await req.json()
    const apiKey = process.env.OPENAI_API_KEY

    if (!apiKey) {
      return NextResponse.json({ error: 'Missing OpenAI API Key' }, { status: 500 })
    }

    const openai = new OpenAI({ apiKey })
    
    // Create highly realistic TTS using OpenAI
    const mp3 = await openai.audio.speech.create({
      model: 'tts-1',
      voice: 'onyx', // Deep, professional, very Jarvis-like
      input: text,
    })

    const buffer = Buffer.from(await mp3.arrayBuffer())

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': buffer.length.toString()
      }
    })
  } catch (error: any) {
    console.error('TTS Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
