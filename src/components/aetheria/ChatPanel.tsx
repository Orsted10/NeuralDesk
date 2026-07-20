'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, User, Bot, Loader2, Mic, MicOff, Volume2, VolumeX } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
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
  userName?: string
}

export default function ChatPanel({ onVoiceStateChange, context, userName = 'You' }: ChatPanelProps) {
  const [isMuted, setIsMuted] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [provider, setProvider] = useState<'openrouter' | 'groq'>('groq')
  const [latency, setLatency] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<any>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)

  const [sessions, setSessions] = useState<any[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  
  // Desktop-specific state
  const [whatsappQr, setWhatsappQr] = useState<string | null>(null)
  const [isAwake, setIsAwake] = useState(false)
  const isAwakeRef = useRef(false)
  
  // Aetheria Category A Features
  const [isIdle, setIsIdle] = useState(false)
  const ambientVolumeRef = useRef<number>(1.0)
  
  // Peripheral Vision UI (Fade when idle)
  useEffect(() => {
    let timeout: any;
    const resetIdle = () => {
      setIsIdle(false)
      clearTimeout(timeout)
      timeout = setTimeout(() => setIsIdle(true), 15000) // 15 seconds idle
    }
    window.addEventListener('mousemove', resetIdle)
    window.addEventListener('keydown', resetIdle)
    resetIdle()
    return () => {
      window.removeEventListener('mousemove', resetIdle)
      window.removeEventListener('keydown', resetIdle)
      clearTimeout(timeout)
    }
  }, [])

  // Acoustic Environment Mapping
  useEffect(() => {
    let audioContext: AudioContext;
    let analyser: AnalyserNode;
    let microphone: MediaStreamAudioSourceNode;
    let dataArray: Uint8Array;
    let stream: MediaStream;
    let animationId: number;

    const startAcousticMapping = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) return;
        audioContext = new AudioContextClass();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        microphone = audioContext.createMediaStreamSource(stream);
        microphone.connect(analyser);
        dataArray = new Uint8Array(analyser.frequencyBinCount);

        const calculateVolume = () => {
          analyser.getByteFrequencyData(dataArray as any);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const average = sum / dataArray.length;
          
          let targetVol = 0.3 + (average / 100) * 0.7;
          if (targetVol > 1.0) targetVol = 1.0;
          if (targetVol < 0.3) targetVol = 0.3; // Whisper floor
          
          ambientVolumeRef.current = targetVol;
          animationId = requestAnimationFrame(calculateVolume);
        };
        calculateVolume();
      } catch (err) {
        console.log("Acoustic mapping requires mic permission.");
      }
    };
    
    const onInteract = () => {
      if (!audioContext) startAcousticMapping();
      window.removeEventListener('click', onInteract);
    };
    window.addEventListener('click', onInteract);

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
      if (stream) stream.getTracks().forEach(t => t.stop());
      if (audioContext && audioContext.state !== 'closed') audioContext.close();
      window.removeEventListener('click', onInteract);
    }
  }, [])
  
  const playWakeBeep = () => {
    try {
      window.speechSynthesis.cancel() // Stop AI from speaking if interrupted
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
    } catch (e) {}
  }

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
        toast.success("New compute session initialized.")
      }
    } catch (e) {
      console.error("Failed to create new session", e)
    }
  }

  const handleSendRef = useRef<any>(null)
  const inputRef = useRef<string>('')
  const isLoadingRef = useRef<boolean>(false)
  const wsRef = useRef<WebSocket | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio()
    }
  }, [])

  const [downloadStatus, setDownloadStatus] = useState<{filename: string, percent: number} | null>(null)

  useEffect(() => {
    handleSendRef.current = handleSend
  }, [handleSend])

  useEffect(() => {
    inputRef.current = input
  }, [input])

  useEffect(() => {
    isLoadingRef.current = isLoading
  }, [isLoading])

  const speakRef = useRef<any>(null)
  useEffect(() => {
    speakRef.current = speak
  }, [speak])

  // Start the background event notifier hook
  useEventNotifier((msg: string) => {
    if (speakRef.current) {
      speakRef.current(msg)
    }
  })

  // Desktop App Events (WhatsApp QR)
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).aetheriaDesktop) {
      (window as any).aetheriaDesktop.onWhatsappQr((qr: string) => {
        setWhatsappQr(qr)
      })
      ;(window as any).aetheriaDesktop.whatsappReady().then((ready: any) => {
        if (ready) {
          setWhatsappQr(null)
          if (ready.myNumber) {
            (window as any).whatsappSelfNumber = ready.myNumber;
          }
        } else {
          // If not ready, ask for the current QR code immediately
          ;(window as any).aetheriaDesktop.getWhatsappQr().then((qr: string | null) => {
             if (qr) setWhatsappQr(qr);
          })
        }
      })
    }
  }, [])

  // Python Voice Engine (WebSocket)
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    let ws: WebSocket | null = null
    const connectWs = () => {
      ws = new WebSocket('ws://localhost:8765')
      wsRef.current = ws
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.type === 'transcript') {
            const text = data.text.trim()
            if (!text) return

            if (isAwakeRef.current) {
              setIsAwake(false)
              isAwakeRef.current = false
              setIsListening(false)
              setInput(text)
              handleSendRef.current?.(text)
            } else {
              // Check for Aetheria wake word
              if (text.toLowerCase().includes('aetheria')) {
                const parts = text.toLowerCase().split('aetheria')
                const command = parts.slice(1).join('aetheria').trim()
                if (command.length > 0) {
                  window.speechSynthesis.cancel()
                  setInput(command)
                  handleSendRef.current?.(command)
                } else {
                  // Just "Aetheria" - activate and wait for command
                  setIsAwake(true)
                  isAwakeRef.current = true
                  setIsListening(true)
                  playWakeBeep()
                }
              }
            }
          } else if (data.type === 'speech_started') {
            setIsSpeaking(true)
          } else if (data.type === 'speech_ended') {
            setIsSpeaking(false)
          } else if (data.type === 'download_progress') {
            setDownloadStatus({ filename: data.filename, percent: data.percent })
          } else if (data.type === 'download_complete') {
            setDownloadStatus(null)
          }
        } catch (e) {
          console.error('WS Parse Error', e)
        }
      }

      ws.onclose = () => {
        setTimeout(connectWs, 3000) // Reconnect on close
      }
    }
    
    connectWs()
    return () => {
      if (ws) ws.close()
    }
  }, [])

  const toggleListening = () => {
    if (!isListening) {
      // Manual trigger: act exactly like the wake word was spoken
      setIsAwake(true)
      isAwakeRef.current = true
      setIsListening(true)
      playWakeBeep()

      // Web Fallback: Use MediaRecorder + /api/transcribe if not on Desktop
      if (typeof window !== 'undefined' && !(window as any).aetheriaDesktop) {
        navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
          const mediaRecorder = new MediaRecorder(stream)
          mediaRecorderRef.current = mediaRecorder
          const audioChunks: Blob[] = []

          mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) audioChunks.push(event.data)
          }

          mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' })
            const formData = new FormData()
            formData.append('file', audioBlob, 'voice.webm')
            
            try {
              toast.loading("Processing voice...", { id: "transcribe" })
              const res = await fetch('/api/transcribe', {
                method: 'POST',
                body: formData
              })
              const data = await res.json()
              if (data.text) {
                toast.success("Voice recognized", { id: "transcribe" })
                setInput(data.text)
                handleSendRef.current?.(data.text)
              } else {
                toast.error(data.error || "Could not recognize voice", { id: "transcribe" })
              }
            } catch (e) {
              console.error('Transcription error', e)
              toast.error("Transcription error", { id: "transcribe" })
            }

            stream.getTracks().forEach(track => track.stop())
            setIsAwake(false)
            isAwakeRef.current = false
            setIsListening(false)
          }

          mediaRecorder.start()
          toast.success("Listening... Click the orb again to send.")
        }).catch(err => {
          toast.error("Microphone access denied.")
          setIsAwake(false)
          isAwakeRef.current = false
          setIsListening(false)
        })
      }
    } else {
      // Manual turn off
      setIsAwake(false)
      isAwakeRef.current = false
      setIsListening(false)
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      }
    }
  }



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

  async function speak(text: string) {
    if (isMuted) return;
    
    // Strip markdown tags and other xml tags before speaking
    const plainText = text
      .replace(/<\/?[^>]+(>|$)/g, "")
      .replace(/[*_#]/g, "")
      .trim();
      
    if (!plainText) return;

    // Route TTS to Local Python WebSocket if available (Desktop App Only)
    // NOTE: Commented out to use the browser TTS (Web Speech API) even in the Desktop App, as requested by the user.
    // if (typeof window !== 'undefined' && (window as any).aetheriaDesktop && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
    //   wsRef.current.send(JSON.stringify({ type: 'speak', text: plainText }))
    //   return;
    // }



    // Final Fallback: Web Speech API
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const utterance = new SpeechSynthesisUtterance(plainText)
      utterance.rate = 1.05
      utterance.pitch = 1.1
      utterance.volume = ambientVolumeRef.current // Dynamic Ambient Volume

      const voices = window.speechSynthesis.getVoices()
      // Look for a high quality female voice
      const preferredVoice = voices.find(v => 
        v.name.includes('Zira') || 
        v.name.includes('Female') || 
        (v.name.includes('Google UK English Female')) ||
        v.name.includes('Samantha')
      ) || voices.find(v => v.lang === 'en-US') || voices[0]

      if (preferredVoice) utterance.voice = preferredVoice

      utterance.onstart = () => setIsSpeaking(true)
      utterance.onend = () => setIsSpeaking(false)
      utterance.onerror = () => setIsSpeaking(false)

      window.speechSynthesis.speak(utterance)
    }
  }

  async function handleSend(overrideInput?: string) {
    const textToSend = overrideInput || input
    if (!textToSend.trim() || isLoading) return

    const getApiUrl = (path: string) => {
      if (typeof window !== 'undefined' && (window as any).aetheriaDesktop) {
        return `https://aetheria-compute-node.vercel.app${path}`
      }
      return path
    }

    // Unlock Persistent Web Audio Element to bypass Chrome Autoplay blocks
    if (audioRef.current) {
      // 10ms of silent WAV audio to unlock the media context
      audioRef.current.src = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA"
      audioRef.current.play().catch(e => console.error("Unlock failed", e))
    }

    // Unlock Web Speech API immediately
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const dummy = new SpeechSynthesisUtterance(' ')
      dummy.volume = 0
      window.speechSynthesis.speak(dummy)
    }

    let currentSessionId = activeSessionId
    if (!currentSessionId) {
      try {
        const res = await fetch(getApiUrl('/api/chat/sessions'), {
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
      // Inject OS Context, Lexicon, and Memory
      let osContext = null
      let memoryContext = ''
      
      if (typeof window !== 'undefined' && (window as any).aetheriaDesktop) {
        osContext = await (window as any).aetheriaDesktop.getOsContext()
        
        try {
          const lexicon = await (window as any).aetheriaDesktop.getLexicon()
          if (lexicon && lexicon.length > 0) {
            memoryContext += `\nPersonal Lexicon (user's frequently used slang/words): ${lexicon.join(', ')}`
          }
          
          const episodes = await (window as any).aetheriaDesktop.getEpisodes(15)
          if (episodes && episodes.length > 0) {
            memoryContext += `\n\nRecent User Activity (Episodic Memory - DO NOT mention this directly unless asked 'what was I just doing'):\n`
            episodes.forEach((ep: any) => {
              memoryContext += `- [${new Date(ep.timestamp).toLocaleTimeString()}] ${ep.window_title} ${ep.process_name ? `(${ep.process_name})` : ''}\n`
            })
          }
        } catch(e) {
          console.error("Failed to load local memory context", e)
        }
      }

      const finalContext = context + memoryContext

      const response = await fetch(getApiUrl('/api/ai'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          history: messages.slice(-5),
          provider,
          context: finalContext,
          osContext,
          isDesktop: typeof window !== 'undefined' && !!(window as any).aetheriaDesktop,
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
        let displayMessage = assistantMessage.replace(/<thought>[\s\S]*?(<\/thought>|$)/gi, '')
        const actionMatch = displayMessage.match(/<schedule_event>\s*(.*?)\s*<\/schedule_event>/is)
        const mapMatch = assistantMessage.match(/<show_map>\s*(.*?)\s*<\/show_map>/is)
        const docMatch = assistantMessage.match(/<create_doc>\s*(.*?)\s*<\/create_doc>/is)
        const sheetMatch = assistantMessage.match(/<create_sheet>\s*(.*?)\s*<\/create_sheet>/is)
        const slideMatch = assistantMessage.match(/<create_slide>\s*(.*?)\s*<\/create_slide>/is)
        const youtubeMatch = assistantMessage.match(/<play_video>\s*(.*?)\s*<\/play_video>/is)
        const emailMatch = assistantMessage.match(/<send_email>\s*(.*?)\s*<\/send_email>/is)
        const readEmailsMatch = assistantMessage.match(/<read_emails>.*?<\/read_emails>/is)
        const searchMatch = assistantMessage.match(/<web_search>\s*(.*?)\s*<\/web_search>/is)
        const execPcMatch = assistantMessage.match(/<execute_pc_command>\s*(.*?)\s*<\/execute_pc_command>/is)
        const waSendMatch = assistantMessage.match(/<whatsapp_send>\s*(.*?)\s*<\/whatsapp_send>/is)
        const waReadMatch = assistantMessage.match(/<read_whatsapp>\s*(.*?)\s*<\/read_whatsapp>/is)
        const storeMemoryMatch = assistantMessage.match(/<store_memory>\s*(.*?)\s*<\/store_memory>/is)
        const freezeMatch = assistantMessage.match(/<freeze_process>\s*(.*?)\s*<\/freeze_process>/is)
        const ghostMatch = assistantMessage.match(/<ghost_type>\s*(.*?)\s*<\/ghost_type>/is)

        if (actionMatch) {
          displayMessage = displayMessage.replace(actionMatch[0], '[EXECUTING PROTOCOL: CALENDAR...]')
        }
        if (storeMemoryMatch) {
          displayMessage = displayMessage.replace(storeMemoryMatch[0], '')
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
        if (execPcMatch) {
          displayMessage = displayMessage.replace(execPcMatch[0], '[EXECUTING PROTOCOL: OS COMMAND...]')
        }
        if (waSendMatch) {
          displayMessage = displayMessage.replace(waSendMatch[0], '[EXECUTING PROTOCOL: WHATSAPP...]')
        }
        if (waReadMatch) {
          displayMessage = displayMessage.replace(waReadMatch[0], '[EXECUTING PROTOCOL: WHATSAPP READ...]')
        }
        if (freezeMatch) {
          displayMessage = displayMessage.replace(freezeMatch[0], '[EXECUTING PROTOCOL: RAM FREEZE...]')
        }
        if (ghostMatch) {
          displayMessage = displayMessage.replace(ghostMatch[0], '[EXECUTING PROTOCOL: GHOST TYPE...]')
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
      const finalExecPc = assistantMessage.match(/<execute_pc_command>\s*(.*?)\s*<\/execute_pc_command>/is)
      const finalWaSend = assistantMessage.match(/<whatsapp_send>\s*(.*?)\s*<\/whatsapp_send>/is)
      const finalWaRead = assistantMessage.match(/<read_whatsapp>\s*(.*?)\s*<\/read_whatsapp>/is)
      const finalStoreMemory = assistantMessage.match(/<store_memory>\s*(.*?)\s*<\/store_memory>/is)
      const finalFreeze = assistantMessage.match(/<freeze_process>\s*(.*?)\s*<\/freeze_process>/is)
      const finalGhost = assistantMessage.match(/<ghost_type>\s*(.*?)\s*<\/ghost_type>/is)

      let cleanMessage = assistantMessage.replace(/<thought>[\s\S]*?<\/thought>/gi, '').trim()

      if (finalSearch) {
        cleanMessage = cleanMessage.replace(finalSearch[0], '[EXECUTING PROTOCOL: WEB SEARCH...]').trim()
        const query = finalSearch[1].trim()
        toast.success(`Protocol Complete: Searching the web for "${query}".`, { icon: '🔍' })
        
        // Fetch web search results via our backend (which uses unblockable Google News RSS)
        fetch(`/api/search?q=${encodeURIComponent(query)}`)
          .then(res => res.json())
          .then(data => {
            let injection = ''
            if (!data.items || data.items.length === 0) {
              injection = `[SYSTEM NOTIFICATION: Web Search Results for "${query}":\nNo results found. Tell the user you couldn't find the answer.]`
            } else {
              const results = data.items.slice(0, 4).map((item: any) => `- ${item.title}: ${item.snippet}`).join('\n')
              injection = `[SYSTEM NOTIFICATION: Web Search Results for "${query}":\n${results}\n\nAnalyze these search results and answer the user. Do NOT output internal thoughts.]`
            }
            
            // Automatically trigger the next turn so JARVIS can analyze the results!
            handleSend(injection)
          })
          .catch(err => console.error("Search failed", err))
      }

      if (finalExecPc && typeof window !== 'undefined' && (window as any).aetheriaDesktop) {
        cleanMessage = cleanMessage.replace(finalExecPc[0], '[EXECUTING PROTOCOL: OS COMMAND...]').trim()
        const command = finalExecPc[1].trim()
        toast.success(`Protocol Complete: Executing OS Command.`, { icon: '💻' })
        ;(window as any).aetheriaDesktop.executeCommand(command).then((res: any) => {
          if (res.success) {
            handleSend(`[SYSTEM NOTIFICATION: Command executed successfully. Output: ${res.stdout}. Acknowledge this naturally.]`)
          } else {
            handleSend(`[SYSTEM NOTIFICATION: Command failed. Error: ${res.error}. Inform the user naturally.]`)
          }
        })
      }

      if (finalWaSend && typeof window !== 'undefined' && (window as any).aetheriaDesktop) {
        cleanMessage = cleanMessage.replace(finalWaSend[0], '[EXECUTING PROTOCOL: WHATSAPP...]').trim()
        try {
          const content = finalWaSend[1].trim()
          const pipeIndex = content.indexOf('|')
          if (pipeIndex !== -1) {
            const to = content.substring(0, pipeIndex).trim()
            const message = content.substring(pipeIndex + 1).trim()
            
            if (to && message) {
              toast.success(`Protocol Complete: Sending WhatsApp message.`, { icon: '💬' })
              ;(window as any).aetheriaDesktop.sendWhatsappMessage(to, message).then((res: any) => {
                if (res.success) {
                  handleSend(`[SYSTEM NOTIFICATION: WhatsApp message sent successfully to ${to}. Acknowledge this naturally.]`)
                } else {
                  handleSend(`[SYSTEM NOTIFICATION: Failed to send WhatsApp message. Error: ${res.error}. Inform the user.]`)
                }
              })
            }
          }
        } catch (e) {
          console.error("Failed to parse whatsapp_send payload", e)
        }
      }

      if (finalWaRead && typeof window !== 'undefined' && (window as any).aetheriaDesktop) {
        cleanMessage = cleanMessage.replace(finalWaRead[0], '[EXECUTING PROTOCOL: WHATSAPP READ...]').trim()
        const contact = finalWaRead[1].trim()
        toast.success(`Protocol Complete: Reading WhatsApp chat with ${contact}.`, { icon: '📖' })
        ;(window as any).aetheriaDesktop.readWhatsappMessages(contact).then((res: any) => {
          if (res.success) {
            const chatLog = res.messages.map((m: any) => `[${m.timestamp}] ${m.sender}: ${m.body}`).join('\n')
            handleSend(`[SYSTEM NOTIFICATION: Successfully fetched last 5 messages with ${res.chatName}:\n${chatLog}\n\nPlease summarize the recent messages or answer my previous question based on them. No internal thoughts!]`)
          } else {
            handleSend(`[SYSTEM NOTIFICATION: Failed to read WhatsApp messages. Error: ${res.error}. Inform the user.]`)
          }
        })
      }

      if (finalStoreMemory && typeof window !== 'undefined' && (window as any).aetheriaDesktop) {
        cleanMessage = cleanMessage.replace(finalStoreMemory[0], '').trim()
        try {
          const memData = JSON.parse(finalStoreMemory[1].trim())
          ;(window as any).aetheriaDesktop.storeContext(memData)
          console.log("[Memory DB] Stored fact:", memData)
        } catch(e) {
          console.error("Memory store parsing failed:", e)
        }
      }

      if (finalFreeze && typeof window !== 'undefined' && (window as any).aetheriaDesktop) {
        cleanMessage = cleanMessage.replace(finalFreeze[0], '[EXECUTING PROTOCOL: RAM FREEZE...]').trim()
        const proc = finalFreeze[1].trim()
        toast.success(`Protocol Complete: Suspending ${proc}.`, { icon: '❄️' })
        ;(window as any).aetheriaDesktop.suspendProcess(proc).then((res: any) => {
          if (res.success) {
            handleSend(`[SYSTEM NOTIFICATION: Successfully suspended ${proc}.]`)
          } else {
            handleSend(`[SYSTEM NOTIFICATION: Failed to suspend ${proc}. Error: ${res.error}.]`)
          }
        })
      }

      if (finalGhost && typeof window !== 'undefined' && (window as any).aetheriaDesktop) {
        cleanMessage = cleanMessage.replace(finalGhost[0], '[EXECUTING PROTOCOL: GHOST TYPE...]').trim()
        const text = finalGhost[1].trim()
        toast.success(`Protocol Complete: Ghost typing initialized (Anti-bot bypass).`, { icon: '⌨️' })
        setTimeout(() => {
          ;(window as any).aetheriaDesktop.ghostType(text).then((res: any) => {
             // System notification optional
          })
        }, 2000) // Give user 2s to focus input
      }

      if (finalDirections) {
        cleanMessage = cleanMessage.replace(finalDirections[0], '[EXECUTING PROTOCOL: MAPS DIRECTIONS...]').trim()
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
        cleanMessage = cleanMessage.replace(finalReadEmails[0], '[EXECUTING PROTOCOL: INBOX...]').trim()
        try {
          toast.success('Protocol Complete: Accessing Inbox.', { icon: '📬' })
          window.dispatchEvent(new CustomEvent('open-module', { detail: 'email' }))
        } catch (e) {}
      }

      const finalOpenModule = assistantMessage.match(/<open_module>\s*(.*?)\s*<\/open_module>/is)
      if (finalOpenModule) {
        cleanMessage = cleanMessage.replace(finalOpenModule[0], '[EXECUTING PROTOCOL: INTERFACE NAVIGATION...]').trim()
        const moduleName = finalOpenModule[1].trim().toLowerCase()
        window.dispatchEvent(new CustomEvent('open-module', { detail: moduleName }))
      }

      if (finalMatch) {
        cleanMessage = cleanMessage.replace(finalMatch[0], '[EXECUTING PROTOCOL: CALENDAR...]').trim()
        try {
          const payloadString = finalMatch[1].trim()
          let title = "Event"
          let date = new Date().toISOString().split('T')[0]
          let startTime = "12:00"
          let endTime = "13:00"
          let description = ""

          if (payloadString.startsWith('{')) {
            try {
              const payload = JSON.parse(payloadString)
              title = payload.title || title
              date = payload.date || date
              startTime = payload.startTime || startTime
              endTime = payload.endTime || endTime
              description = payload.description || description
            } catch (jsonErr) {
              // fallback to regex below
            }
          }
          
          // Fallback robust regex parsing for Nemotron hallucinations
          if (!payloadString.startsWith('{') || title === "Event") {
            const titleMatch = payloadString.match(/"?title"?\s*:\s*"?([^",\n}]+)"?/i)
            if (titleMatch) title = titleMatch[1].trim()
            
            const dateMatch = payloadString.match(/"?date"?\s*:\s*"?([^",\n}]+)"?/i)
            if (dateMatch) date = dateMatch[1].trim()
            
            const startMatch = payloadString.match(/"?startTime"?\s*:\s*"?([^",\n}]+)"?/i)
            if (startMatch) startTime = startMatch[1].trim()
            
            const endMatch = payloadString.match(/"?endTime"?\s*:\s*"?([^",\n}]+)"?/i)
            if (endMatch) endTime = endMatch[1].trim()
            
            const descMatch = payloadString.match(/"?description"?\s*:\s*"?([^",\n}]+)"?/i)
            if (descMatch) description = descMatch[1].trim()
          }

          const startDateTime = new Date(`${date}T${startTime}`).toISOString()
          const endDateTime = new Date(`${date}T${endTime}`).toISOString()

          fetch('/api/calendar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              summary: title,
              description: description,
              startDateTime,
              endDateTime
            }),
          }).then(res => {
            if (res.ok) {
              toast.success('Protocol Complete: Event scheduled.')
              window.dispatchEvent(new Event('calendar-updated'))
              handleSend(`[SYSTEM NOTIFICATION: Successfully scheduled calendar event. Tell the user the meeting has been scheduled.]`)
            }
            else {
              toast.error('Protocol Failed: Could not schedule event.')
              handleSend(`[SYSTEM NOTIFICATION: Failed to schedule calendar event. Inform the user.]`)
            }
          })
        } catch (e) {
          console.error("Failed to parse AI action payload", e, "Payload was:", finalMatch[1])
          toast.error('Aetheria attempted to schedule the event, but the command was malformed. Please try again.')
        }
      }

      if (finalDeleteMatches.length > 0) {
        finalDeleteMatches.forEach(match => {
          cleanMessage = cleanMessage.replace(match[0], '[EXECUTING PROTOCOL: CALENDAR DELETE...]').trim()
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
                handleSend(`[SYSTEM NOTIFICATION: Successfully deleted calendar event. Acknowledge this naturally.]`)
              } else {
                toast.error('Protocol Failed: Could not terminate event.')
                handleSend(`[SYSTEM NOTIFICATION: Failed to delete calendar event. Ensure the event ID is correct and inform the user.]`)
              }
            })
          } catch (e) {
            console.error("Failed to parse delete calendar event payload", e)
          }
        })
      }

      if (finalMap) {
        cleanMessage = cleanMessage.replace(finalMap[0], '[EXECUTING PROTOCOL: MAPS...]').trim()
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
          cleanMessage = cleanMessage.replace(match[0], '[EXECUTING PROTOCOL: DRIVE...]').trim()
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
        cleanMessage = cleanMessage.replace(finalYoutube[0], '[EXECUTING PROTOCOL: YOUTUBE...]').trim()
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
        cleanMessage = cleanMessage.replace(finalEmail[0], '[EXECUTING PROTOCOL: EMAIL...]').trim()
        try {
          const content = finalEmail[1].trim()
          let to = ''
          let subject = 'Aetheria Dispatch'
          let body = content

          if (content.startsWith('{') || content.startsWith('[')) {
            try {
              const payload = JSON.parse(content)
              to = payload.to || ''
              subject = payload.subject || 'Aetheria Dispatch'
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
      fetch(getApiUrl('/api/chat/history'), {
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

    // replaced toggles

  const shouldFade = isIdle && !isAwake && !isListening && !isSpeaking;

  return (
    <div className={`w-full lg:max-w-4xl flex flex-col h-full max-h-[85vh] min-h-[500px] glass-panel lg:rounded-3xl rounded-t-3xl lg:overflow-hidden shadow-2xl transition-all duration-1000 relative mt-auto lg:mt-0 ${shouldFade ? 'opacity-20 blur-sm scale-[0.98]' : 'opacity-100 blur-none scale-100'}`}>
      {/* WhatsApp QR Modal */}
      <AnimatePresence>
        {whatsappQr && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          >
            <div className="bg-card border border-border p-8 rounded-2xl flex flex-col items-center gap-4 text-center max-w-sm">
              <h3 className="text-xl font-semibold text-foreground">Link WhatsApp</h3>
              <p className="text-sm text-muted-foreground">Open WhatsApp on your phone, go to Linked Devices, and scan this QR code to grant Aetheria background access.</p>
              <div className="bg-white p-4 rounded-xl mt-2">
                <QRCodeSVG value={whatsappQr} size={200} />
              </div>
              <Button onClick={() => setWhatsappQr(null)} variant="ghost" className="mt-2 text-muted-foreground hover:text-foreground">
                Dismiss
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Download Progress Overlay */}
      <AnimatePresence>
        {downloadStatus && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-16 left-0 right-0 z-40 p-4 pointer-events-none"
          >
            <div className="bg-card/90 backdrop-blur-xl rounded-2xl p-5 border border-border shadow-lg">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-semibold text-foreground tracking-wider">
                  INITIALIZING NEURAL ENGINE ({downloadStatus.filename})
                </span>
                <span className="text-sm font-bold text-foreground">{downloadStatus.percent}%</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2 overflow-hidden shadow-inner">
                <motion.div 
                  initial={{ width: 0 }} 
                  animate={{ width: `${downloadStatus.percent}%` }} 
                  className="bg-primary h-full rounded-full transition-all duration-300 ease-out" 
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Header */}
      <div className="p-4 border-b border-border flex justify-between items-center bg-card/10">
        <div className="flex gap-4 items-center flex-1">
          <span className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">Aetheria</span>
          
          <div className="flex gap-2 items-center flex-1 max-w-[200px]">
            <select
              value={activeSessionId || ''}
              onChange={(e) => setActiveSessionId(e.target.value)}
              className="glass-input text-foreground text-xs px-3 py-1.5 focus:outline-none transition-all w-full cursor-pointer appearance-none"
            >
              {sessions.map(s => (
                <option key={s.id} value={s.id} className="bg-card text-foreground">
                  {s.title}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => createNewSession()}
            className="text-xs font-medium border border-border text-foreground px-3 py-1.5 rounded-xl transition-all bg-card/50 hover:bg-card/80 active:scale-95 flex items-center gap-1"
          >
            + New
          </button>
          
          {typeof window !== 'undefined' && !!(window as any).aetheriaDesktop && (
            <button
              onClick={() => {
                toast.loading("Resetting WhatsApp Connection...", { id: 'wa-logout' });
                (window as any).aetheriaDesktop.logoutWhatsapp().then((res: any) => {
                  if (res.success) {
                    toast.success("WhatsApp reset successfully. Please wait for the new QR code.", { id: 'wa-logout' });
                  } else {
                    toast.error(`Reset Failed: ${res.error}`, { id: 'wa-logout' });
                  }
                });
              }}
              className="text-xs font-medium border border-red-500/20 text-red-400 px-3 py-1.5 rounded-xl transition-all bg-red-500/[0.03] hover:bg-red-500/[0.1] active:scale-95 flex items-center gap-1 ml-2"
              title="If WhatsApp is not responding, click here to disconnect and scan a new QR code."
            >
              Reset WhatsApp
            </button>
          )}

          <div className="flex gap-2 items-center ml-auto mr-2">
            <span className="flex items-center gap-1.5 text-[9px] tracking-wider text-green-500 font-bold bg-green-500/10 px-2 py-1 rounded-md border border-green-500/20">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.8)]"></div>
              ONLINE
            </span>
            <span className="text-[9px] text-muted-foreground font-mono tracking-widest">
              LATENCY: {latency > 0 ? `${latency}ms` : '--'}
            </span>
          </div>

          <div className="flex gap-1 bg-secondary/50 p-1 rounded-xl border border-border">
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
           <button onClick={() => {
             setIsMuted(!isMuted);
             if (!isMuted && typeof window !== 'undefined') window.speechSynthesis.cancel();
           }} className="text-muted-foreground hover:text-foreground transition-all cursor-pointer">
             {isMuted ? <VolumeX className="w-4 h-4 text-destructive" /> : <Volume2 className={`w-4 h-4 ${isSpeaking ? 'text-primary animate-pulse' : 'text-muted-foreground'}`} />}
           </button>
           <div className={`w-2 h-2 rounded-full ${isLoading ? 'bg-amber-400 animate-pulse' : 'bg-green-500'}`} />
        </div>
      </div>

      {/* Messages Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-border"
      >
        {messages.length === 0 && (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm font-medium text-center">
            Ready for input. Say "Aetheria" or click the orb to speak.
          </div>
        )}
        <AnimatePresence>
          {messages.map((msg, i) => {
            if (msg.content.trim().startsWith('<system>') || msg.content.trim().startsWith('[SYSTEM NOTIFICATION:')) return null;
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
                  ? 'bg-secondary text-secondary-foreground rounded-2xl rounded-tr-sm' 
                  : 'bg-card border border-border text-card-foreground rounded-2xl rounded-tl-sm'
              }`}>
                <div className="flex items-center gap-2 mb-1.5 opacity-60">
                  {msg.role === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                  <span className="text-[11px] font-semibold tracking-wide">{msg.role === 'user' ? userName || 'You' : 'Aetheria'}</span>
                </div>
                <div className="leading-relaxed font-medium prose dark:prose-invert max-w-none prose-sm 
                  prose-p:leading-relaxed prose-p:mb-3 last:prose-p:mb-0
                  prose-a:text-indigo-400 hover:prose-a:text-indigo-300 prose-a:no-underline hover:prose-a:underline prose-a:transition-all
                  prose-strong:text-indigo-100 prose-strong:font-semibold
                  prose-ul:list-disc prose-ul:pl-5 prose-ul:mb-4
                  prose-ol:list-decimal prose-ol:pl-5 prose-ol:mb-4
                  prose-li:my-1 prose-li:text-zinc-200 prose-li:marker:text-indigo-500/70
                  prose-pre:bg-black/30 prose-pre:border prose-pre:border-white/10 prose-pre:rounded-xl
                  prose-code:text-emerald-400 prose-code:bg-emerald-400/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:font-mono prose-code:text-[11px] prose-code:before:content-none prose-code:after:content-none
                  prose-headings:text-zinc-100 prose-headings:font-semibold prose-headings:mb-3 prose-headings:mt-4
                  prose-blockquote:border-l-indigo-500 prose-blockquote:bg-indigo-500/5 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:rounded-r-lg prose-blockquote:text-zinc-300 prose-blockquote:italic
                ">
                  <ReactMarkdown>{formatMessageDisplay(msg.content)}</ReactMarkdown>
                </div>
              </div>
            </motion.div>
          )})}
        </AnimatePresence>
        {isLoading && messages[messages.length-1]?.role === 'user' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
             <div className="glass-card px-5 py-3.5 rounded-2xl rounded-tl-sm flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-xs font-medium">Processing...</span>
             </div>
          </motion.div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-border bg-card/10 rounded-b-3xl">
        <div className="flex gap-3">
          <Button
            onClick={toggleListening}
            className={`transition-all duration-300 rounded-xl w-12 h-12 flex items-center justify-center ${
              isListening 
                ? 'bg-destructive/20 text-destructive border border-destructive/30 animate-pulse' 
                : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
            }`}
          >
            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </Button>
          <Input 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={isListening ? "Listening..." : "Message Aetheria..."}
            className="flex-1 h-12 glass-input px-4 text-foreground placeholder:text-muted-foreground text-sm focus-visible:ring-1 focus-visible:ring-primary"
          />
          <Button 
            onClick={() => handleSend()}
            disabled={isLoading}
            className="h-12 w-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg transition-all"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
