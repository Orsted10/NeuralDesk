import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('chat_history')
      .select('role, content')
      .eq('user_id', user.id)
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })

    if (error) throw error

    return NextResponse.json({ messages: data || [] })
  } catch (error: any) {
    console.error('Chat History GET Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { messages, sessionId } = await req.json()
    if (!messages || !Array.isArray(messages) || !sessionId) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    // Insert new messages
    const insertData = messages.map((m: any) => ({
      user_id: user.id,
      session_id: sessionId,
      role: m.role,
      content: m.content
    }))

    const { error } = await supabase
      .from('chat_history')
      .insert(insertData)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Chat History POST Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
