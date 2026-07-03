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
You are a highly proactive, conversational, and autonomous executor. You do not just wait for commands; you engage, suggest, and act. 
CRITICAL RULE: DO NOT GUESS, HALLUCINATE, OR ESTIMATE real-time facts (like net worth, stock prices, news, weather, or current events). 
If the user asks for ANY factual, real-world information, you MUST use the <web_search> tag to verify it first. Do NOT answer from your training data, as it may be outdated!
Do NOT say "I shall search for this" or give a guessed answer first, just DO it by outputting the <web_search> tag immediately.
For all other actions (maps, emails, calendar, docs, youtube), if the context implies it or the user requests it, output the XML tag immediately. Act first, confirm afterwards.

ACTION PROTOCOL:
You control the user's dashboard by outputting action XML tags:
1. Schedule calendar meetings:
<schedule_event>{"title": "Event title", "date": "YYYY-MM-DD", "startTime": "HH:MM", "endTime": "HH:MM", "description": "Details"}</schedule_event>
2. Search map coordinates or get directions:
<show_map>location name</show_map>
<get_directions>{"origin": "Start Location", "destination": "End Location"}</get_directions>
3. Build new Google Docs/Sheets/Slides:
<create_doc>Title: Doc Title\nContent body here...</create_doc>
<create_sheet>Title: Sheet Title</create_sheet>
<create_slide>Title: Slide Title</create_slide>
4. Search the web for information:
<web_search>query</web_search>
5. Play YouTube streams:
<play_video>song or video search query</play_video>
6. Compose/Send Emails (Secure SMTP Link):
<send_email>To: recipient@gmail.com\nSubject: Email Subject\nEmail body content here...</send_email>
7. Read/Check Emails:
<read_emails>open</read_emails>
8. Delete calendar events:
<delete_calendar_event>event_id_here</delete_calendar_event>`

export async function POST(req: Request) {
  const { message, history, provider = 'groq', context, isDesktop = false } = await req.json()

  let dynamicPrompt = context 
    ? `${systemPrompt}\n\nCURRENT SYSTEM CONTEXT (DO NOT REPEAT UNLESS ASKED):\n${context}`
    : systemPrompt

  if (isDesktop) {
    dynamicPrompt += `\n\n[SYSTEM OVERRIDE]: DESKTOP GOD-MODE ENABLED. You are running in a native PC environment. You have full OS access and WhatsApp Web automation capabilities.`
  }

  let actionProtocol = `\n\nACTION PROTOCOL (CRITICAL SYSTEM DIRECTIVES):
CRITICAL RULE: You are proactive, but do NOT hallucinate actions. Only use XML tags when actively fulfilling a specific user request. 
CRITICAL RULE 2: NEVER output <web_search> unless you actually have a specific query to search. DO NOT output <web_search> with an empty string. DO NOT use <web_search> just to say hello or ask how you can help. Only search when you need facts.
SAFETY CAUTION: For sending emails or scheduling calendar events, only do so if the user explicitly requested it.

1. SCHEDULING CALENDAR EVENT:
If scheduling, you MUST output:
<schedule_event>{"title": "Event title", "date": "YYYY-MM-DD", "startTime": "HH:MM", "endTime": "HH:MM", "description": "Details"}</schedule_event>

2. SHOW MAP / LOCATE TARGET / DIRECTIONS:
If locating a place or viewing a map, you MUST output:
<show_map>Name of Place</show_map>
If the user asks for directions or a route from point A to point B, you MUST output:
<get_directions>{"origin": "Start Location", "destination": "End Location"}</get_directions>

3. CREATE DOCUMENT / SPREADSHEET / SLIDES:
If generating a document, you MUST output:
<create_doc>
Title: Document Title
Here is the document content body...
</create_doc>
If generating a spreadsheet or presentation, output:
<create_sheet>Title: Spreadsheet Title</create_sheet>
or
<create_slide>Title: Presentation Title</create_slide>

4. WEB SEARCH / INFORMATION GATHERING:
If the user asks you to search the web or lookup something online, output:
<web_search>search query here</web_search>

5. PLAY YOUTUBE STREAM (VIDEO / MUSIC):
If playing music or a video, you MUST output:
<play_video>Search query or song name</play_video>

5. COMPOSE / SEND EMAIL (SECURE SMTP LINK):
If composing, sending, or drafting an email, you MUST output:
<send_email>
To: recipient@example.com
Subject: Email Subject
Here is the email body content...
</send_email>

6. READ EMAILS:
If the user asks you to read, check, or open their emails/inbox, you MUST output:
<read_emails>open</read_emails>

9. DELETE CALENDAR EVENT:
If the user asks you to delete, cancel, or terminate an event (e.g. "delete my Gym Session"), read the event ID from the Live Upcoming Calendar Events context (e.g. "[ID: mock-gym] 16:30 - Gym Session" -> ID is "mock-gym") and output:
<delete_calendar_event>event_id_here</delete_calendar_event>`

  if (isDesktop) {
    actionProtocol += `

10. EXECUTE NATIVE OS COMMAND:
If the user asks you to open an application (e.g., "open Spotify", "launch VS Code"), or perform a system action on their PC, output a safe terminal command (Windows PowerShell format) inside this tag:
<execute_pc_command>start spotify</execute_pc_command>
<execute_pc_command>start chrome</execute_pc_command>

11. SEND WHATSAPP MESSAGE:
If the user asks you to send a WhatsApp message to someone, you can use the WhatsApp automation bridge.
<whatsapp_send>{"to": "Phone number or contact name", "message": "Your message here"}</whatsapp_send>`
  }

  actionProtocol += `\n\nAlways output the appropriate tag inside your response, outside of any markdown code blocks. Guess coordinates/dates based on context if not explicitly provided.`

    const finalMessage = `${message}${actionProtocol}`

    const tryProvider = async (p: string) => {
      if (p === 'gemini') {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
        const model = genAI.getGenerativeModel({ 
          model: 'gemini-2.5-flash',
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

      if (p === 'grok' || p === 'groq') {
        const apiKey = p === 'groq' ? process.env.GROQ_API_KEY : process.env.GROK_API_KEY
        if (!apiKey) throw new Error(`Missing ${p.toUpperCase()}_API_KEY`)
        const baseURL = p === 'groq' ? 'https://api.groq.com/openai/v1' : 'https://api.x.ai/v1'
        
        const grok = new OpenAI({
          apiKey: apiKey,
          baseURL: baseURL,
        })

        const response = await grok.chat.completions.create({
          model: p === 'groq' ? 'llama-3.3-70b-versatile' : 'grok-beta',
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

      if (p === 'openrouter') {
        const apiKey = process.env.OPENROUTER_API_KEY
        if (!apiKey) throw new Error('Missing OPENROUTER_API_KEY')
        const openrouter = new OpenAI({
          apiKey: apiKey,
          baseURL: 'https://openrouter.ai/api/v1',
          defaultHeaders: {
            'HTTP-Referer': 'https://neuraldesk.ai',
            'X-Title': 'NeuralDesk',
          }
        })

        const response = await openrouter.chat.completions.create({
          model: 'nvidia/nemotron-3-nano-30b-a3b:free',
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
      const apiKey = process.env.OPENAI_API_KEY
      if (!apiKey) throw new Error('Missing OPENAI_API_KEY')
      const openai = new OpenAI({
        apiKey: apiKey,
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
    }

    try {
      const allProviders = ['openrouter', 'groq']
      // Push the requested provider to the front of the queue
      const providersToTry = [provider, ...allProviders.filter(p => p !== provider)]
      
      let lastError: any = null

      for (const p of providersToTry) {
        try {
          console.log(`[AI-ROUTER] Attempting provider: ${p}`)
          const res = await tryProvider(p)
          if (res) return res
        } catch (err: any) {
          console.error(`[AI-ROUTER] Provider ${p} failed:`, err.message || err)
          lastError = err
          // Continue to next provider in the loop!
        }
      }

      // If we exhaust the entire list, throw the final error
      throw lastError || new Error('All AI providers exhausted.')

    } catch (error: any) {
      console.error('Final AI API Error:', error)
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
