import OpenAI from 'openai'
import { GoogleGenerativeAI } from '@google/generative-ai'

export const runtime = 'edge'

const systemPrompt = `You are JARVIS, a highly advanced AI assistant created by Ankan. 
You are formal, witty, and extremely loyal. 
You MUST always address the user as "Sir". 
You have access to his digital life including emails, WhatsApp, calendar, maps, drive, and YouTube.
Your tone should be like JARVIS from Iron Man—sophisticated, British, and slightly dry in humor.
Keep responses concise but helpful.

DIRECT EXECUTION POLICY:
You are a direct, proactive executor. Do NOT ask the user for permission, confirmation, or say "I can show you this if you like" before triggering system actions. If the user mentions locating/searching a place, showing a map, playing music, watching a video, composing a document, scheduling a calendar meeting, or composing/sending an email, you MUST immediately output the appropriate XML action tag directly in your response. Act first, confirm afterwards.

CRITICAL SAFETY RULE: ONLY output the action XML tags if the user EXPLICITLY requested that specific action in their current prompt. NEVER output action tags based on your own conversational offers, recommendations, or suggestions (e.g., if you say "I can show you a map of their city if you'd like", do NOT output the <show_map> tag unless the user explicitly replies and commands you to do so). Do NOT hallucinate search targets or default locations like "Paris, France" if the user has not explicitly provided one.

ACTION PROTOCOL:
You control the user's dashboard by outputting action XML tags:
1. Schedule calendar meetings:
<schedule_event>{"title": "Event title", "date": "YYYY-MM-DD", "startTime": "HH:MM", "endTime": "HH:MM", "description": "Details"}</schedule_event>
2. Search map coordinates:
<show_map>location name or coordinates</show_map>
3. Build new Google Docs:
<create_doc>Title: Doc Title\nContent body here...</create_doc>
4. Play YouTube streams:
<play_video>song or video search query</play_video>
5. Compose/Send Emails (Secure SMTP Link):
<send_email>To: recipient@gmail.com\nSubject: Email Subject\nEmail body content here...</send_email>
6. Delete calendar events:
<delete_calendar_event>event_id_here</delete_calendar_event>`

export async function POST(req: Request) {
  const { message, history, provider = 'openai', context } = await req.json()

  const dynamicPrompt = context 
    ? `${systemPrompt}\n\nCURRENT SYSTEM CONTEXT (DO NOT REPEAT UNLESS ASKED):\n${context}`
    : systemPrompt

    const actionProtocol = `\n\nACTION PROTOCOL (CRITICAL SYSTEM DIRECTIVES):
CRITICAL RULE: If the user explicitly asks you to locate a place, view a map, search coordinates, watch a video, play music, write/generate a document, schedule a calendar meeting, or compose/send an email, you MUST include the appropriate action XML tag at the end of your response. Failing to output the tag is UNACCEPTABLE. DO NOT ask the user for confirmation, permission, or say "I can search this for you if you'd like". Output the tag DIRECTLY and IMMEDIATELY in your response! Act first, ask later.
SAFETY CAUTION: ONLY output these action tags if the user explicitly requested that action in their prompt. NEVER output a tag based on your own recommendations, suggestions, or conversational offers (e.g. if you say "I can show you a map of their city if you'd like", do NOT output <show_map> unless the user explicitly tells you to do so).

1. SCHEDULING CALENDAR EVENT:
If scheduling, you MUST output:
<schedule_event>{"title": "Event title", "date": "YYYY-MM-DD", "startTime": "HH:MM", "endTime": "HH:MM", "description": "Details"}</schedule_event>

2. SHOW MAP / LOCATE TARGET:
If locating a place or viewing a map, you MUST output:
<show_map>Name of Place</show_map>

3. CREATE DOCUMENT (GOOGLE DOC):
If generating a document, you MUST output:
<create_doc>
Title: Document Title
Here is the document content body...
</create_doc>

4. PLAY YOUTUBE STREAM (VIDEO / MUSIC):
If playing music or a video, you MUST output:
<play_video>Search query or song name</play_video>

5. COMPOSE / SEND EMAIL (SECURE SMTP LINK):
If composing, sending, or drafting an email, you MUST output:
<send_email>
To: recipient@example.com
Subject: Email Subject
Here is the email body content...
</send_email>

6. DELETE CALENDAR EVENT:
If the user asks you to delete, cancel, or terminate an event (e.g. "delete my Gym Session"), read the event ID from the Live Upcoming Calendar Events context (e.g. "[ID: mock-gym] 16:30 - Gym Session" -> ID is "mock-gym") and output:
<delete_calendar_event>event_id_here</delete_calendar_event>

Always output the appropriate tag inside your response, outside of any markdown code blocks. Guess coordinates/dates based on context if not explicitly provided.`

    const finalMessage = `${message}${actionProtocol}`

    try {
      if (provider === 'gemini') {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
        const model = genAI.getGenerativeModel({ 
          model: 'gemini-1.5-pro',
          systemInstruction: dynamicPrompt
        })
        
        const chat = model.startChat({
          history: history.map((m: any) => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }],
          })),
        })

        const result = await chat.sendMessageStream(finalMessage)
        
        const stream = new ReadableStream({
          async start(controller) {
            for await (const chunk of result.stream) {
              controller.enqueue(new TextEncoder().encode(chunk.text()))
            }
            controller.close()
          },
        })
        return new Response(stream)
      } 

      if (provider === 'grok' || provider === 'groq') {
        const apiKey = process.env.GROK_API_KEY || process.env.GROQ_API_KEY
        const baseURL = provider === 'groq' ? 'https://api.groq.com/openai/v1' : 'https://api.x.ai/v1'
        
        const grok = new OpenAI({
          apiKey: apiKey,
          baseURL: baseURL,
        })

        const response = await grok.chat.completions.create({
          model: provider === 'groq' ? 'llama-3.3-70b-versatile' : 'grok-beta',
          stream: true,
          messages: [
          { role: 'system', content: dynamicPrompt },
            ...history,
            { role: 'user', content: finalMessage },
          ],
        })

        const stream = new ReadableStream({
          async start(controller) {
            for await (const chunk of response) {
              controller.enqueue(new TextEncoder().encode(chunk.choices[0]?.delta?.content || ''))
            }
            controller.close()
          },
        })
        return new Response(stream)
      }

      if (provider === 'openrouter') {
        const apiKey = process.env.OPENROUTER_API_KEY
        const openrouter = new OpenAI({
          apiKey: apiKey,
          baseURL: 'https://openrouter.ai/api/v1',
          defaultHeaders: {
            'HTTP-Referer': 'https://neuraldesk.ai',
            'X-Title': 'NeuralDesk',
          }
        })

        const response = await openrouter.chat.completions.create({
          model: 'google/gemini-2.5-flash',
          stream: true,
          max_tokens: 1500,
          messages: [
            { role: 'system', content: dynamicPrompt },
            ...history,
            { role: 'user', content: finalMessage },
          ],
        })

        const stream = new ReadableStream({
          async start(controller) {
            for await (const chunk of response) {
              controller.enqueue(new TextEncoder().encode(chunk.choices[0]?.delta?.content || ''))
            }
            controller.close()
          },
        })
        return new Response(stream)
      }

      // Default: OpenAI
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      })

      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        stream: true,
        messages: [
          { role: 'system', content: dynamicPrompt },
          ...history,
          { role: 'user', content: finalMessage },
        ],
      })

      const stream = new ReadableStream({
        async start(controller) {
          for await (const chunk of response) {
            controller.enqueue(new TextEncoder().encode(chunk.choices[0]?.delta?.content || ''))
          }
          controller.close()
        },
      })
      return new Response(stream)

    } catch (error: any) {
    console.error('AI API Error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to fetch AI response',
        details: error.stack
      }), 
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}
