'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, User, Bot, Loader2, Mic, MicOff, Volume2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface ChatPanelProps {
  onVoiceStateChange?: (state: { isListening: boolean; isSpeaking: boolean }) => void
  context?: string
}

export default function ChatPanel({ onVoiceStateChange, context }: ChatPanelProps) {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [provider, setProvider] = useState<'openrouter' | 'gemini' | 'grok' | 'groq'>('openrouter')
  const scrollRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<any>(null)

  const [sessions, setSessions] = useState<any[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)

  // Load sessions first
  useEffect(() => {
    fetch('/api/chat/sessions')
      .then(res => res.json())
      .then(data => {
        if (data.sessions && data.sessions.length > 0) {
          setSessions(data.sessions)
          setActiveSessionId(data.sessions[0].id) // select latest session
        } else {
          // If no sessions, create the first one
          createNewSession()
        }
      })
      .catch(err => console.error("Failed to load sessions", err))
  }, [])

  // Pre-load and warm voices cache for Web Speech API
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.getVoices()
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = () => {
          window.speechSynthesis.getVoices()
        }
      }
    }
  }, [])

  // Load history when active session changes
  useEffect(() => {
    if (!activeSessionId) return
    fetch(`/api/chat/history?sessionId=${activeSessionId}`)
      .then(res => res.json())
      .then(data => {
        setMessages(data.messages || [])
      })
      .catch(err => console.error("Failed to load chat history for session", err))
  }, [activeSessionId])

  const createNewSession = async (customTitle?: string) => {
    try {
      const res = await fetch('/api/chat/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: customTitle || `Session - ${new Date().toLocaleDateString()}` })
      })
      const data = await res.json()
      if (data.session) {
        setSessions(prev => [data.session, ...prev])
        setActiveSessionId(data.session.id)
        setMessages([])
        toast.success("New chat initialized, Sir.")
      }
    } catch (e) {
      console.error("Failed to create new session", e)
    }
  }

  const handleSendRef = useRef<any>(null)
  const inputRef = useRef<string>('')
  const isLoadingRef = useRef<boolean>(false)

  useEffect(() => {
    handleSendRef.current = handleSend
  }, [handleSend])

  useEffect(() => {
    inputRef.current = input
  }, [input])

  useEffect(() => {
    isLoadingRef.current = isLoading
  }, [isLoading])

  // Initialize Speech Recognition
  useEffect(() => {
    let rec: any = null
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (SpeechRecognition) {
        rec = new SpeechRecognition()
        recognitionRef.current = rec
        rec.continuous = false
        rec.interimResults = true // Enable real-time interim results
        rec.lang = 'en-US'

        rec.onresult = (event: any) => {
          let interimTranscript = ''
          let finalTranscript = ''

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript
            } else {
              interimTranscript += event.results[i][0].transcript
            }
          }

          if (finalTranscript) {
            setInput(finalTranscript)
            handleSendRef.current?.(finalTranscript)
          } else if (interimTranscript) {
            setInput(interimTranscript)
          }
        }

        rec.onend = () => {
          setIsListening(false)
          // Fallback sending: if we have typed/spoken text and no active API call is running, send it
          setTimeout(() => {
            if (inputRef.current.trim() && !isLoadingRef.current) {
              const text = inputRef.current.trim()
              setInput('') // clear it
              handleSendRef.current?.(text)
            }
          }, 300)
        }

        rec.onerror = (event: any) => {
          console.error('Speech recognition error', event.error)
          setIsListening(false)
          if (event.error === 'not-allowed') {
            toast.error("Microphone access denied, Sir. Please allow permission in your browser settings.")
          } else if (event.error === 'no-speech') {
            console.log("No speech detected.")
          } else {
            toast.error(`Speech recognition error: ${event.error}`)
          }
        }
      }
    }

    return () => {
      if (rec) {
        try {
          rec.abort()
        } catch (e) {
          console.error(e)
        }
      }
    }
  }, [])

  // Listen to visual Orb clicks to trigger Voice
  useEffect(() => {
    const handleToggle = () => toggleListening()
    window.addEventListener('toggle-voice', handleToggle)
    return () => window.removeEventListener('toggle-voice', handleToggle)
  }, [isListening])

  // Sync voice states with parent
  useEffect(() => {
    onVoiceStateChange?.({ isListening, isSpeaking })
  }, [isListening, isSpeaking, onVoiceStateChange])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // Clean raw action tags from messages so the user never sees them in the UI
  const formatMessageDisplay = (content: string) => {
    let text = content
    const tags = ['schedule_event', 'delete_calendar_event', 'show_map', 'create_doc', 'create_sheet', 'create_slide', 'play_video', 'send_email', 'read_emails', 'get_directions', 'web_search', 'system']
    tags.forEach(tag => {
      // Remove fully formed tags
      const fullTagRegex = new RegExp(`<${tag}>.*?</${tag}>`, 'gis')
      text = text.replace(fullTagRegex, '')
      // Remove partial tags during streaming
      const partialTagRegex = new RegExp(`<${tag}>[\\s\\S]*$`, 'gi')
      text = text.replace(partialTagRegex, '')
    })
    return text.trim()
  }

  function speak(text: string) {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel() // Stop any ongoing speech
      const utterance = new SpeechSynthesisUtterance(text)
      
      // Grab all available system speech engines
      const voices = window.speechSynthesis.getVoices()
      
      // Rank and find the absolute highest fidelity, most natural human voice available:
      // Priority 1: Microsoft Natural Online voices (incredibly fluent, human assistant level on Edge/Windows)
      // Priority 2: Google Premium voices (highly fluent human narration on Chrome)
      // Priority 3: Apple Samantha/Daniel Premium voices (high fidelity on Safari/macOS)
      // Priority 4: Male/English fallbacks
      const jarvisVoice = 
        voices.find(v => v.name.toLowerCase().includes('natural') && v.lang.startsWith('en')) ||
        voices.find(v => v.name.toLowerCase().includes('google') && v.name.toLowerCase().includes('male')) ||
        voices.find(v => v.name.toLowerCase().includes('google') && v.lang.startsWith('en')) ||
        voices.find(v => v.name.toLowerCase().includes('en-gb') && v.name.toLowerCase().includes('male')) ||
        voices.find(v => v.name.toLowerCase().includes('en-us') && v.name.toLowerCase().includes('male')) ||
        voices.find(v => v.name.toLowerCase().includes('guyonline')) ||
        voices.find(v => v.name.toLowerCase().includes('aria')) ||
        voices.find(v => v.lang.startsWith('en') && v.name.toLowerCase().includes('male')) ||
        voices.find(v => v.lang.startsWith('en')) ||
        voices[0]
      
      if (jarvisVoice) {
        utterance.voice = jarvisVoice
      }
      
      // Adjust pitch and rate to sound natural, rhythmic, and fluent (crisp conversational pace)
      utterance.pitch = 1.0
      utterance.rate = 1.05

      utterance.onstart = () => setIsSpeaking(true)
      utterance.onend = () => setIsSpeaking(false)
      utterance.onerror = () => setIsSpeaking(false)

      window.speechSynthesis.speak(utterance)
    }
  }

  async function handleSend(overrideInput?: string) {
    const textToSend = overrideInput || input
    if (!textToSend.trim() || isLoading) return

    let currentSessionId = activeSessionId
    if (!currentSessionId) {
      try {
        const res = await fetch('/api/chat/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: textToSend.slice(0, 30) + '...' })
        })
        const data = await res.json()
        if (data.session) {
          setSessions(prev => [data.session, ...prev])
          setActiveSessionId(data.session.id)
          currentSessionId = data.session.id
        } else {
          throw new Error("Could not initialize session")
        }
      } catch (e) {
        console.error(e)
        toast.error("Failed to initialize session.")
        return
      }
    }

    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: textToSend }])
    setIsLoading(true)

    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          history: messages.slice(-5),
          provider,
          context,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Server Error: ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('Communication link failed: No reader')

      let assistantMessage = ''
      setMessages((prev) => [...prev, { role: 'assistant', content: '' }])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = new TextDecoder().decode(value)
        assistantMessage += chunk
        
        // Hide action blocks from UI during streaming if possible
        let displayMessage = assistantMessage
        const actionMatch = assistantMessage.match(/<schedule_event>\s*(.*?)\s*<\/schedule_event>/is)
        const mapMatch = assistantMessage.match(/<show_map>\s*(.*?)\s*<\/show_map>/is)
        const docMatch = assistantMessage.match(/<create_doc>\s*(.*?)\s*<\/create_doc>/is)
        const sheetMatch = assistantMessage.match(/<create_sheet>\s*(.*?)\s*<\/create_sheet>/is)
        const slideMatch = assistantMessage.match(/<create_slide>\s*(.*?)\s*<\/create_slide>/is)
        const youtubeMatch = assistantMessage.match(/<play_video>\s*(.*?)\s*<\/play_video>/is)
        const emailMatch = assistantMessage.match(/<send_email>\s*(.*?)\s*<\/send_email>/is)
        const readEmailsMatch = assistantMessage.match(/<read_emails>.*?<\/read_emails>/is)
        const searchMatch = assistantMessage.match(/<web_search>\s*(.*?)\s*<\/web_search>/is)

        if (actionMatch) {
          displayMessage = displayMessage.replace(actionMatch[0], '[EXECUTING PROTOCOL: CALENDAR...]')
        }
        if (mapMatch) {
          displayMessage = displayMessage.replace(mapMatch[0], '[EXECUTING PROTOCOL: MAPS...]')
        }
        if (docMatch || sheetMatch || slideMatch) {
          displayMessage = displayMessage.replace(docMatch?.[0] || sheetMatch?.[0] || slideMatch?.[0] || '', '[EXECUTING PROTOCOL: DRIVE...]')
        }
        if (youtubeMatch) {
          displayMessage = displayMessage.replace(youtubeMatch[0], '[EXECUTING PROTOCOL: YOUTUBE...]')
        }
        if (emailMatch) {
          displayMessage = displayMessage.replace(emailMatch[0], '[EXECUTING PROTOCOL: EMAIL...]')
        }
        if (readEmailsMatch) {
          displayMessage = displayMessage.replace(readEmailsMatch[0], '[EXECUTING PROTOCOL: INBOX...]')
        }
        if (searchMatch) {
          displayMessage = displayMessage.replace(searchMatch[0], '[EXECUTING PROTOCOL: WEB SEARCH...]')
        }

        setMessages((prev) => {
          const last = prev[prev.length - 1]
          return [...prev.slice(0, -1), { ...last, content: displayMessage }]
        })
      }

      // Final processing of actions
      const finalMatch = assistantMessage.match(/<schedule_event>\s*(.*?)\s*<\/schedule_event>/is)
      const finalDeleteCalendar = assistantMessage.match(/<delete_calendar_event>\s*(.*?)\s*<\/delete_calendar_event>/is)
      const finalMap = assistantMessage.match(/<show_map>\s*(.*?)\s*<\/show_map>/is)
      const finalDoc = assistantMessage.match(/<create_doc>\s*(.*?)\s*<\/create_doc>/is)
      const finalSheet = assistantMessage.match(/<create_sheet>\s*(.*?)\s*<\/create_sheet>/is)
      const finalSlide = assistantMessage.match(/<create_slide>\s*(.*?)\s*<\/create_slide>/is)
      const finalYoutube = assistantMessage.match(/<play_video>\s*(.*?)\s*<\/play_video>/is)
      const finalEmail = assistantMessage.match(/<send_email>\s*(.*?)\s*<\/send_email>/is)
      const finalReadEmails = assistantMessage.match(/<read_emails>.*?<\/read_emails>/is)
      const finalDirections = assistantMessage.match(/<get_directions>\s*(.*?)\s*<\/get_directions>/is)
      const finalSearch = assistantMessage.match(/<web_search>\s*(.*?)\s*<\/web_search>/is)

      let cleanMessage = assistantMessage

      if (finalSearch) {
        cleanMessage = cleanMessage.replace(finalSearch[0], '').trim()
        const query = finalSearch[1].trim()
        toast.success(`Protocol Complete: Searching the web for "${query}".`, { icon: '🔍' })
        
        // Fetch web search results
        fetch(`/api/search?q=${encodeURIComponent(query)}`)
          .then(res => res.json())
          .then(data => {
            const results = data.items?.slice(0, 4).map((item: any) => `- ${item.title}: ${item.snippet}`).join('\n') || 'No results found.'
            const injection = `<system>Web Search Results for "${query}":\n${results}</system>\nAnalyze these search results and answer my previous question.`
            
            // Automatically trigger the next turn so JARVIS can analyze the results!
            handleSend(injection)
          })
          .catch(err => console.error(err))
      }

      if (finalDirections) {
        cleanMessage = cleanMessage.replace(finalDirections[0], '').trim()
        try {
          const payload = JSON.parse(finalDirections[1].trim())
          if (payload.origin && payload.destination) {
            toast.success('Protocol Complete: Calculating navigation route.', { icon: '🛣️' })
            window.dispatchEvent(new CustomEvent('get-directions', { detail: payload }))
          }
        } catch (e) {
          console.error("Failed to parse get_directions payload", e)
        }
      }

      if (finalReadEmails) {
        cleanMessage = cleanMessage.replace(finalReadEmails[0], '').trim()
        try {
          toast.success('Protocol Complete: Accessing Inbox.', { icon: '📬' })
          window.dispatchEvent(new CustomEvent('read-emails'))
        } catch (e) {}
      }

      if (finalMatch) {
        cleanMessage = cleanMessage.replace(finalMatch[0], '').trim()
        try {
          const payloadString = finalMatch[1].trim()
          const payload = JSON.parse(payloadString)
          const startDateTime = new Date(`${payload.date}T${payload.startTime}`).toISOString()
          const endDateTime = new Date(`${payload.date}T${payload.endTime}`).toISOString()

          fetch('/api/calendar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              summary: payload.title,
              description: payload.description,
              startDateTime,
              endDateTime
            }),
          }).then(res => {
            if (res.ok) {
              toast.success('Protocol Complete: Event scheduled.')
              window.dispatchEvent(new Event('calendar-updated'))
            }
            else toast.error('Protocol Failed: Could not schedule event.')
          })
        } catch (e) {
          console.error("Failed to parse AI action payload", e, "Payload was:", finalMatch[1])
          toast.error('JARVIS attempted to schedule the event, but the command was malformed. Please try again.')
        }
      }

      if (finalDeleteCalendar) {
        cleanMessage = cleanMessage.replace(finalDeleteCalendar[0], '').trim()
        try {
          let eventId = finalDeleteCalendar[1].trim()
          
          if (eventId.startsWith('{') || eventId.startsWith('[')) {
            try {
              const payload = JSON.parse(eventId)
              eventId = payload.id || eventId
            } catch (e) {}
          } else {
            eventId = eventId.replace(/['"]/g, '')
          }

          fetch(`/api/calendar?eventId=${encodeURIComponent(eventId)}`, {
            method: 'DELETE'
          }).then(res => {
            if (res.ok) {
              toast.success('Protocol Complete: Event terminated.', { icon: '🗑️' })
              window.dispatchEvent(new Event('calendar-updated'))
            } else {
              toast.error('Protocol Failed: Could not terminate event.')
            }
          })
        } catch (e) {
          console.error("Failed to parse delete calendar event payload", e)
        }
      }

      if (finalMap) {
        cleanMessage = cleanMessage.replace(finalMap[0], '').trim()
        try {
          const content = finalMap[1].trim()
          let query = content
          if (content.startsWith('{') || content.startsWith('[')) {
            try {
              const payload = JSON.parse(content)
              query = payload.query || content
            } catch (e) {}
          }
          ;(window as any).pendingMapQuery = query
          toast.success('Protocol Complete: Target coordinates located.', { icon: '📍' })
          window.dispatchEvent(new CustomEvent('show-map', { detail: { query } }))
        } catch (e) {
          console.error("Failed to parse AI map payload", e)
        }
      }

      if (finalDoc || finalSheet || finalSlide) {
        const match = finalDoc || finalSheet || finalSlide
        const type = finalSheet ? 'sheet' : finalSlide ? 'slide' : 'doc'
        if (match) {
          cleanMessage = cleanMessage.replace(match[0], '').trim()
          try {
            const content = match[1].trim()
            let title = 'New File'
            let docBody = content
            if (content.startsWith('{') || content.startsWith('[')) {
              try {
                const payload = JSON.parse(content)
                title = payload.title || 'New File'
                docBody = payload.content || content
              } catch (e) {}
            } else {
              const titleMatch = content.match(/title:\s*(.*?)\n/i)
              if (titleMatch) {
                title = titleMatch[1].trim()
                docBody = content.replace(titleMatch[0], '').trim()
              } else {
                title = content.replace('Title: ', '').trim()
              }
            }
            ;(window as any).pendingDocData = { title, content: docBody, type }
            toast.success(`Protocol Complete: Constructing ${type} node.`, { icon: '📝' })
            window.dispatchEvent(new CustomEvent('create-doc', { detail: { title, content: docBody, type } }))
          } catch (e) {
            console.error("Failed to parse AI doc payload", e)
          }
        }
      }

      if (finalYoutube) {
        cleanMessage = cleanMessage.replace(finalYoutube[0], '').trim()
        try {
          const content = finalYoutube[1].trim()
          let query = content
          if (content.startsWith('{') || content.startsWith('[')) {
            try {
              const payload = JSON.parse(content)
              query = payload.query || content
            } catch (e) {}
          }
          ;(window as any).pendingYoutubeQuery = query
          toast.success('Protocol Complete: Audio/Video line established.', { icon: '🎬' })
          window.dispatchEvent(new CustomEvent('play-video', { detail: { query } }))
        } catch (e) {
          console.error("Failed to parse AI youtube payload", e)
        }
      }

      if (finalEmail) {
        cleanMessage = cleanMessage.replace(finalEmail[0], '').trim()
        try {
          const content = finalEmail[1].trim()
          let to = ''
          let subject = 'NeuralDesk Dispatch'
          let body = content

          if (content.startsWith('{') || content.startsWith('[')) {
            try {
              const payload = JSON.parse(content)
              to = payload.to || ''
              subject = payload.subject || 'NeuralDesk Dispatch'
              body = payload.body || content
            } catch (e) {}
          } else {
            const toMatch = content.match(/to:\s*(.*?)\n/i)
            const subjectMatch = content.match(/subject:\s*(.*?)\n/i)
            
            if (toMatch) {
              to = toMatch[1].trim()
              body = body.replace(toMatch[0], '').trim()
            }
            if (subjectMatch) {
              subject = subjectMatch[1].trim()
              body = body.replace(subjectMatch[0], '').trim()
            }
          }

          ;(window as any).pendingEmailData = { to, subject, body }
          toast.success('Protocol Complete: Opening Secure SMTP Link.', { icon: '📧' })
          window.dispatchEvent(new CustomEvent('send-email', { detail: { to, subject, body } }))
        } catch (e) {
          console.error("Failed to parse AI email payload", e)
        }
      }

      // Update UI one last time with fully cleaned message
      setMessages((prev) => {
        const last = prev[prev.length - 1]
        return [...prev.slice(0, -1), { ...last, content: cleanMessage }]
      })

      // Save to persistent history
      fetch('/api/chat/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: currentSessionId,
          messages: [
            { role: 'user', content: textToSend },
            { role: 'assistant', content: cleanMessage }
          ]
        })
      }).catch(err => console.error("Failed to save chat history", err))

      // Speak the final response
      speak(cleanMessage)

    } catch (error) {
      console.error('Chat Error:', error)
      const errorMsg = 'I apologize, Sir. My connection seems to be interrupted.'
      setMessages((prev) => [...prev, { role: 'assistant', content: errorMsg }])
      speak(errorMsg)
    } finally {
      setIsLoading(false)
    }
  }

  const toggleListening = () => {
    if (!recognitionRef.current) {
      toast.error("Speech Recognition is not supported in this browser environment, Sir. Chrome is recommended.")
      return
    }
    if (isListening) {
      try {
        recognitionRef.current.stop()
      } catch (e) {
        console.error(e)
      }
    } else {
      try {
        setIsListening(true)
        recognitionRef.current.start()
      } catch (e) {
        console.error(e)
        setIsListening(false)
        toast.error("Could not activate voice link, Sir.")
      }
    }
  }

  return (
    <div className="w-full max-w-2xl flex flex-col h-[400px] bg-black/40 border border-cyan-500/20 backdrop-blur-md rounded-lg overflow-hidden glow-border">
      {/* Header */}
      <div className="p-3 border-b border-cyan-500/20 flex justify-between items-center bg-cyan-500/5">
        <div className="flex gap-3 items-center flex-1">
          <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-cyan-400">Communication Link</span>
          
          <div className="flex gap-2 items-center flex-1 max-w-[200px]">
            <select
              value={activeSessionId || ''}
              onChange={(e) => setActiveSessionId(e.target.value)}
              className="bg-black/60 border border-cyan-500/30 text-cyan-300 text-[10px] px-2 py-1 rounded focus:outline-none focus:border-cyan-400 transition-all font-mono w-full cursor-pointer hover:bg-cyan-500/10"
            >
              {sessions.map(s => (
                <option key={s.id} value={s.id} className="bg-black text-cyan-300">
                  {s.title}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => createNewSession()}
            className="text-[9px] border border-cyan-500/30 hover:border-cyan-400 text-cyan-400 uppercase tracking-widest px-2 py-1 rounded transition-all bg-cyan-500/5 hover:bg-cyan-500/10 active:scale-95 flex items-center gap-1"
          >
            + New
          </button>

          <div className="flex gap-2 bg-black/40 p-1 rounded-md border border-cyan-500/20">
            {(['openrouter', 'gemini', 'grok', 'groq'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setProvider(p)}
                className={`text-[8px] uppercase tracking-widest px-2 py-0.5 rounded transition-all ${
                  provider === p 
                    ? 'bg-cyan-500 text-black font-bold shadow-[0_0_10px_rgba(0,242,255,0.5)]' 
                    : 'text-cyan-500/40 hover:text-cyan-500/70'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-4 items-center">
           {isSpeaking && <Volume2 className="w-4 h-4 text-cyan-400 animate-pulse" />}
           <div className={`w-2 h-2 rounded-full ${isLoading ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`} />
        </div>
      </div>

      {/* Messages Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-cyan-500/20"
      >
        {messages.length === 0 && (
          <div className="h-full flex items-center justify-center text-cyan-500/20 text-xs uppercase tracking-widest text-center">
            Awaiting input, Sir.<br/>Click the microphone to speak.
          </div>
        )}
        <AnimatePresence>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
              animate={{ opacity: 1, x: 0 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[80%] p-3 rounded-lg text-sm ${
                msg.role === 'user' 
                  ? 'bg-cyan-500/10 border border-cyan-500/30 text-cyan-300' 
                  : 'bg-blue-900/20 border border-blue-500/30 text-cyan-100'
              }`}>
                <div className="flex items-center gap-2 mb-1 opacity-50">
                  {msg.role === 'user' ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
                  <span className="text-[10px] uppercase tracking-widest">{msg.role === 'user' ? 'Ankan' : 'JARVIS'}</span>
                </div>
                <p className="leading-relaxed whitespace-pre-wrap">{formatMessageDisplay(msg.content)}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {isLoading && messages[messages.length-1]?.role === 'user' && (
          <div className="flex justify-start">
             <div className="bg-blue-900/20 border border-blue-500/30 p-3 rounded-lg">
                <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
             </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-cyan-500/20 bg-black/60">
        <div className="flex gap-2">
          <Button
            onClick={toggleListening}
            className={`transition-all duration-300 ${
              isListening 
                ? 'bg-red-500/20 border-red-500/50 text-red-400' 
                : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-500'
            }`}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </Button>
          <Input 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={isListening ? "Listening..." : "Type your command, Sir..."}
            className="bg-transparent border-cyan-500/30 text-cyan-300 focus:border-cyan-400 placeholder:text-cyan-500/20"
          />
          <Button 
            onClick={() => handleSend()}
            disabled={isLoading}
            className="bg-cyan-500/20 border border-cyan-500/50 hover:bg-cyan-500/40 text-cyan-400"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
