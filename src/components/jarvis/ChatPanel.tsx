'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, User, Bot, Loader2, Mic, MicOff, Volume2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useEventNotifier } from './useEventNotifier'

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
  const [provider, setProvider] = useState<'openrouter' | 'groq'>('openrouter')
  const [latency, setLatency] = useState(0)
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

  // Dynamic Ping Latency Checker
  useEffect(() => {
    const checkLatency = async () => {
      try {
        const start = performance.now()
        await fetch('/api/ping')
        const end = performance.now()
        setLatency(Math.round(end - start))
      } catch (e) {
        setLatency(0)
      }
    }
    
    checkLatency()
    const interval = setInterval(checkLatency, 10000)
    return () => clearInterval(interval)
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

  // Start the background event notifier hook
  useEventNotifier((msg: string) => {
    if (handleSendRef.current) {
      handleSendRef.current(msg)
    }
  })

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

        rec.onstart = () => {
          try {
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext
            const ctx = new AudioContext()
            const osc = ctx.createOscillator()
            const gain = ctx.createGain()
            osc.connect(gain)
            gain.connect(ctx.destination)
            osc.type = 'sine'
            osc.frequency.setValueAtTime(880, ctx.currentTime)
            gain.gain.setValueAtTime(0.1, ctx.currentTime)
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1)
            osc.start(ctx.currentTime)
            osc.stop(ctx.currentTime + 0.1)
          } catch (e) {
            console.error("Failed to play mic beep", e)
          }
        }

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

  function stripMarkdownForSpeech(text: string) {
    let clean = text
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/__(.*?)__/g, '$1')
      .replace(/_(.*?)_/g, '$1')
      .replace(/#(.*?)\n/g, '$1\n')
      .replace(/`{3}([\s\S]*?)`{3}/g, 'code block omitted')
      .replace(/`(.*?)`/g, '$1')
      .replace(/^-\s+/gm, '')
      .replace(/^\d+\.\s+/gm, '')
      .trim()
      
    // Smart TTS: If the text is super long (like a big search result or long explanation),
    // only read the first 2-3 sentences so it doesn't ramble forever.
    if (clean.length > 300) {
      const sentences = clean.match(/[^.!?]+[.!?]+/g)
      if (sentences && sentences.length > 2) {
        clean = sentences.slice(0, 2).join(' ') + ' I have displayed the full details for you on the screen.'
      }
    }
    return clean;
  }

  function speak(text: string) {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel() // Stop any ongoing speech
      const cleanAudioText = stripMarkdownForSpeech(text)
      if (!cleanAudioText) return
      
      const utterance = new SpeechSynthesisUtterance(cleanAudioText)
      const voices = window.speechSynthesis.getVoices()
      
      // Extremely aggressive ranking for the most "soothing, smooth, and human" female voices
      const premiumVoice = 
        voices.find(v => v.name.toLowerCase().includes('jenny') && v.name.toLowerCase().includes('natural')) ||
        voices.find(v => v.name.toLowerCase().includes('aria') && v.name.toLowerCase().includes('natural')) ||
        voices.find(v => v.name.toLowerCase().includes('uk english female')) ||
        voices.find(v => v.name.toLowerCase().includes('google uk english female')) ||
        voices.find(v => v.name.toLowerCase().includes('samantha')) ||
        voices.find(v => v.name.toLowerCase().includes('natural') && v.lang.startsWith('en')) ||
        voices.find(v => v.name.toLowerCase().includes('google us english')) ||
        voices.find(v => v.lang.startsWith('en') && v.name.toLowerCase().includes('female')) ||
        voices.find(v => v.lang.startsWith('en')) ||
        voices[0]
      
      if (premiumVoice) {
        utterance.voice = premiumVoice
      }
      
      // Fine-tuned settings for a smoother, sexier cadence
      utterance.pitch = 1.05
      utterance.rate = 0.98

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
      const finalDeleteMatches = [...assistantMessage.matchAll(/<delete_calendar_event>\s*(.*?)\s*<\/delete_calendar_event>/gis)]
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
        
        // Fetch web search results via our backend (which uses unblockable Google News RSS)
        fetch(`/api/search?q=${encodeURIComponent(query)}`)
          .then(res => res.json())
          .then(data => {
            let injection = ''
            if (!data.items || data.items.length === 0) {
              injection = `<system>Web Search Results for "${query}":\nNo results found.</system>\nDo NOT attempt to search again. Tell me you couldn't find the answer.`
            } else {
              const results = data.items.slice(0, 4).map((item: any) => `- ${item.title}: ${item.snippet}`).join('\n')
              injection = `<system>Web Search Results for "${query}":\n${results}</system>\nAnalyze these search results and answer my previous question.`
            }
            
            // Automatically trigger the next turn so JARVIS can analyze the results!
            handleSend(injection)
          })
          .catch(err => console.error("Search failed", err))
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

      if (finalDeleteMatches.length > 0) {
        finalDeleteMatches.forEach(match => {
          cleanMessage = cleanMessage.replace(match[0], '').trim()
          try {
            let eventId = match[1].trim()
            
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
        })
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
    <div className="w-full max-w-2xl flex flex-col h-[400px] glass-panel rounded-3xl overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="p-4 border-b border-white/[0.05] flex justify-between items-center bg-white/[0.02]">
        <div className="flex gap-4 items-center flex-1">
          <span className="text-xs font-semibold tracking-wide text-zinc-300">Neural Link</span>
          
          <div className="flex gap-2 items-center flex-1 max-w-[200px]">
            <select
              value={activeSessionId || ''}
              onChange={(e) => setActiveSessionId(e.target.value)}
              className="glass-input text-zinc-300 text-xs px-3 py-1.5 focus:outline-none transition-all w-full cursor-pointer appearance-none"
            >
              {sessions.map(s => (
                <option key={s.id} value={s.id} className="bg-zinc-900 text-zinc-300">
                  {s.title}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => createNewSession()}
            className="text-xs font-medium border border-white/10 text-zinc-300 px-3 py-1.5 rounded-xl transition-all bg-white/[0.03] hover:bg-white/[0.08] active:scale-95 flex items-center gap-1"
          >
            + New
          </button>

          <div className="flex gap-2 items-center ml-auto mr-2">
            <span className="flex items-center gap-1.5 text-[9px] tracking-wider text-emerald-400 font-bold bg-emerald-400/10 px-2 py-1 rounded-md border border-emerald-400/20">
              <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]"></div>
              SYSTEM ONLINE
            </span>
            <span className="text-[9px] text-zinc-500 font-mono tracking-widest">
              LATENCY: {latency > 0 ? `${latency}ms` : '--'}
            </span>
          </div>

          <div className="flex gap-1 bg-black/20 p-1 rounded-xl border border-white/5">
            {(['openrouter', 'groq'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setProvider(p)}
                className={`text-[10px] font-medium px-3 py-1 rounded-lg transition-all ${
                  provider === p 
                    ? 'bg-zinc-700 text-zinc-100 shadow-md' 
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-4 items-center">
           {isSpeaking && <Volume2 className="w-4 h-4 text-indigo-400 animate-pulse" />}
           <div className={`w-2 h-2 rounded-full ${isLoading ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
        </div>
      </div>

      {/* Messages Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-white/10"
      >
        {messages.length === 0 && (
          <div className="h-full flex items-center justify-center text-zinc-500 text-sm font-medium text-center">
            Ready for input.<br/>Click the microphone to speak.
          </div>
        )}
        <AnimatePresence>
          {messages.map((msg, i) => {
            if (msg.content.trim().startsWith('<system>')) return null;
            return (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[85%] px-5 py-3.5 shadow-sm text-sm ${
                msg.role === 'user' 
                  ? 'bg-indigo-500 text-white rounded-2xl rounded-tr-sm' 
                  : 'glass-card border border-white/[0.05] text-zinc-200 rounded-2xl rounded-tl-sm'
              }`}>
                <div className="flex items-center gap-2 mb-1.5 opacity-60">
                  {msg.role === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                  <span className="text-[11px] font-semibold tracking-wide">{msg.role === 'user' ? 'Ankan' : 'JARVIS'}</span>
                </div>
                <div className="leading-relaxed whitespace-pre-wrap font-medium prose prose-invert max-w-none prose-sm prose-p:leading-relaxed prose-pre:bg-black/20">
                  <ReactMarkdown>{formatMessageDisplay(msg.content)}</ReactMarkdown>
                </div>
              </div>
            </motion.div>
          )})}
        </AnimatePresence>
        {isLoading && messages[messages.length-1]?.role === 'user' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
             <div className="glass-card px-5 py-3.5 rounded-2xl rounded-tl-sm flex items-center gap-2 text-zinc-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-xs font-medium">Processing...</span>
             </div>
          </motion.div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-white/[0.05] bg-white/[0.01]">
        <div className="flex gap-3">
          <Button
            onClick={toggleListening}
            className={`transition-all duration-300 rounded-xl w-12 h-12 flex items-center justify-center ${
              isListening 
                ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20 scale-105' 
                : 'glass-input text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </Button>
          <Input 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={isListening ? "Listening..." : "Message JARVIS..."}
            className="flex-1 h-12 glass-input px-4 text-zinc-200 placeholder:text-zinc-600 text-sm focus-visible:ring-1 focus-visible:ring-indigo-500"
          />
          <Button 
            onClick={() => handleSend()}
            disabled={isLoading}
            className="h-12 w-12 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white shadow-lg transition-all"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
