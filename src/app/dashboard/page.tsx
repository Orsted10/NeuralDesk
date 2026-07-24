'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Mail, 
  MessageSquare, 
  Calendar, 
  Mic, 
  Settings,
  Shield,
  Activity,
  Cpu,
  Compass,
  HardDrive,
  Tv,
  LogOut,
  Newspaper,
  TrendingUp,
  Eye,
  EyeOff,
  Zap,
  Wifi,
  X,
  Maximize2
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import VoiceOrb from '@/components/aetheria/VoiceOrb'
import ChatPanel from '@/components/aetheria/ChatPanel'
import EmailModule from '@/components/aetheria/EmailModule'
import WhatsAppModule from '@/components/aetheria/WhatsAppModule'
import CalendarModule from '@/components/aetheria/CalendarModule'
import MapsModule from '@/components/aetheria/MapsModule'
import DriveModule from '@/components/aetheria/DriveModule'
import YouTubeModule from '@/components/aetheria/YouTubeModule'
import NewsModule from '@/components/aetheria/NewsModule'
import FinanceModule from '@/components/aetheria/FinanceModule'
import AmbientSensor from '@/components/aetheria/AmbientSensor'
import VisionCore from '@/components/aetheria/VisionCore'
import { HUDCard, StatusIndicator, ParticleBackground } from '@/components/aetheria/HUD'

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false)
  const [time, setTime] = useState(new Date())
  const [location, setLocation] = useState({ lat: '0.0000', long: '0.0000', city: 'Detecting...' })
  const [voiceState, setVoiceState] = useState({ isListening: false, isSpeaking: false })
  const [stats, setStats] = useState({ cpu: 5, ram: 8, totalRam: 32, ramPercent: 25, cpuModel: 'Detecting CPU...' })
  const [weather, setWeather] = useState({ temp: '--', humidity: '--', wind: '--', status: 'Updating...' })
  const [activeModule, setActiveModule] = useState<string | null>(null)
  const [aiPopupModule, setAiPopupModule] = useState<string | null>(null)
  const activeModuleRef = useRef<string | null>(null)

  useEffect(() => {
    activeModuleRef.current = activeModule
    if (activeModule) setAiPopupModule(null) // clear popup if manually opened
  }, [activeModule])
  const [emailView, setEmailView] = useState<'compose' | 'inbox'>('compose')
  const [events, setEvents] = useState<any[]>([])
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userName, setUserName] = useState<string>('User')
  const [privacyShield, setPrivacyShield] = useState(false)
  const [visionStatus, setVisionStatus] = useState<'inactive' | 'active' | 'alert'>('inactive')
  const videoRef = useRef<HTMLVideoElement>(null)
  const visionIntervalRef = useRef<any>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const loadCalendarEvents = async () => {
    try {
      const start = new Date()
      const end = new Date()
      end.setDate(end.getDate() + 7)
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
      const res = await fetch(`/api/calendar?timeMin=${encodeURIComponent(start.toISOString())}&timeMax=${encodeURIComponent(end.toISOString())}&timeZone=${encodeURIComponent(tz)}`)
      const data = await res.json()
      if (res.ok && data.events) {
        const mapped = data.events.map((ev: any) => {
          const isAllDay = ev.start?.date !== undefined
          let timeStr = 'All Day'
          let dateStr = ''
          if (isAllDay) {
            const [y, m, d] = ev.start.date.split('-')
            const dObj = new Date(parseInt(y), parseInt(m)-1, parseInt(d))
            dateStr = dObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          } else if (ev.start?.dateTime) {
            const dateObj = new Date(ev.start.dateTime)
            timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
            dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          }
          const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          const displayTime = dateStr === today ? timeStr : `${dateStr} • ${timeStr}`
          return { id: ev.id, time: displayTime, title: ev.summary || 'Event' }
        })
        setEvents(mapped.length > 0 ? mapped : [])
      }
    } catch (e) {
      console.error("Failed to load calendar events", e)
    }
  }

  // Vision Engine: Presence-Based Security
  useEffect(() => {
    let stream: MediaStream | null = null
    const startVision = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240, facingMode: 'user' } })
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play()
        }
        setVisionStatus('active')
        // Placeholder: In production MediaPipe FaceDetection runs at 1fps here
        // When faces.length > 1, setPrivacyShield(true) and setVisionStatus('alert')
        visionIntervalRef.current = setInterval(() => {
          if (videoRef.current && videoRef.current.readyState >= 2) {
            setVisionStatus('active')
          }
        }, 2000)
      } catch {
        setVisionStatus('inactive')
      }
    }
    const t = setTimeout(startVision, 2000)
    return () => {
      clearTimeout(t)
      if (visionIntervalRef.current) clearInterval(visionIntervalRef.current)
      if (stream) stream.getTracks().forEach(t => t.stop())
    }
  }, [])

  useEffect(() => {
    setMounted(true)
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.email) setUserEmail(data.user.email)
      if (data?.user?.user_metadata?.name || data?.user?.user_metadata?.full_name) {
        setUserName(data.user.user_metadata.name || data.user.user_metadata.full_name)
      }
    })
    const timer = setInterval(() => setTime(new Date()), 1000)
    const fetchTelemetry = async () => {
      try {
        const res = await fetch('/api/gcp-telemetry')
        const data = await res.json()
        if (data.cpu !== undefined) setStats({ cpu: data.cpu, ram: data.ram, totalRam: data.totalRam, ramPercent: data.ramPercent, cpuModel: data.cpuModel || 'Unknown CPU' })
      } catch {}
    }
    fetchTelemetry()
    const statsTimer = setInterval(fetchTelemetry, 10000)
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        const lat = pos.coords.latitude.toFixed(4)
        const lon = pos.coords.longitude.toFixed(4)
        setLocation({ lat, long: lon, city: 'Verified Node' })
        try {
          const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code`)
          const data = await res.json()
          if (data.current) setWeather({ temp: `${Math.round(data.current.temperature_2m)}°C`, humidity: `${data.current.relative_humidity_2m}%`, wind: `${data.current.wind_speed_10m} km/h`, status: data.current.temperature_2m > 20 ? 'Optimal' : 'Cooling' })
        } catch {}
      })
    }
    loadCalendarEvents()
    const loadEmails = async () => {
      try {
        const res = await fetch('/api/gmail')
        const data = await res.json()
        if (data.emails) (window as any).unreadEmailsContext = data.emails.map((e: any) => `[From: ${e.from}] ${e.subject}`).join(' | ')
      } catch {}
    }
    loadEmails()
    const handleMapSwitch = () => { if (activeModuleRef.current !== 'maps') setAiPopupModule('maps') }
    const handleDriveSwitch = () => { if (activeModuleRef.current !== 'drive') setAiPopupModule('drive') }
    const handleYoutubeSwitch = () => { if (activeModuleRef.current !== 'youtube') setAiPopupModule('youtube') }
    const handleNewsSwitch = () => { if (activeModuleRef.current !== 'news') setAiPopupModule('news') }
    const handleFinanceSwitch = () => { if (activeModuleRef.current !== 'finance') setAiPopupModule('finance') }
    const handleEmailCompose = () => { setEmailView('compose'); if (activeModuleRef.current !== 'email') setAiPopupModule('email') }
    const handleEmailInbox = () => { setEmailView('inbox'); if (activeModuleRef.current !== 'email') setAiPopupModule('email') }
    const handleCalendarUpdate = () => loadCalendarEvents()
    const handleOpenModule = (e: any) => { if (activeModuleRef.current !== e.detail) setAiPopupModule(e.detail) }
    const handleDirectionsTrigger = (e: any) => {
      if (activeModuleRef.current !== 'maps') {
        ;(window as any).pendingDirections = e.detail
        setAiPopupModule('maps')
      } else {
        // If already active, the MapsModule handles it itself
        ;(window as any).pendingDirections = e.detail
      }
    }
    
    window.addEventListener('show-map', handleMapSwitch)
    window.addEventListener('get-directions', handleDirectionsTrigger)
    window.addEventListener('create-doc', handleDriveSwitch)
    window.addEventListener('play-video', handleYoutubeSwitch)
    window.addEventListener('fetch_news', handleNewsSwitch)
    window.addEventListener('get_crypto_price', handleFinanceSwitch)
    window.addEventListener('send-email', handleEmailCompose)
    window.addEventListener('read-emails', handleEmailInbox)
    window.addEventListener('calendar-updated', handleCalendarUpdate)
    window.addEventListener('open-module', handleOpenModule)
    return () => {
      clearInterval(timer); clearInterval(statsTimer)
      window.removeEventListener('show-map', handleMapSwitch)
      window.removeEventListener('get-directions', handleDirectionsTrigger)
      window.removeEventListener('create-doc', handleDriveSwitch)
      window.removeEventListener('play-video', handleYoutubeSwitch)
      window.removeEventListener('fetch_news', handleNewsSwitch)
      window.removeEventListener('get_crypto_price', handleFinanceSwitch)
      window.removeEventListener('send-email', handleEmailCompose)
      window.removeEventListener('read-emails', handleEmailInbox)
      window.removeEventListener('open-module', handleOpenModule)
      window.removeEventListener('calendar-updated', handleCalendarUpdate)
    }
  }, [])

  const formatTime = (date: Date) => date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })

  const navItems = [
    { icon: Mail, label: 'Email', id: 'email', color: 'text-blue-400' },
    { icon: MessageSquare, label: 'WhatsApp', id: 'whatsapp', color: 'text-emerald-400' },
    { icon: Calendar, label: 'Calendar', id: 'calendar', color: 'text-purple-400' },
    { icon: Compass, label: 'Maps', id: 'maps', color: 'text-amber-400' },
    { icon: HardDrive, label: 'Drive', id: 'drive', color: 'text-indigo-400' },
    { icon: Tv, label: 'YouTube', id: 'youtube', color: 'text-red-400' },
    { icon: Newspaper, label: 'News', id: 'news', color: 'text-zinc-400' },
    { icon: TrendingUp, label: 'Markets', id: 'finance', color: 'text-green-400' },
  ]

  return (
    <div className="flex flex-col h-screen bg-[#050505] text-foreground font-sans overflow-hidden relative selection:bg-indigo-500/30">
      <ParticleBackground />
      <AmbientSensor />
      <VisionCore />

      {/* Privacy Shield Overlay */}
      <AnimatePresence>
        {privacyShield && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] backdrop-blur-2xl bg-black/70 flex items-center justify-center">
            <div className="glass-panel p-10 rounded-3xl text-center max-w-sm">
              <Shield className="w-14 h-14 text-red-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-zinc-100 mb-2">Privacy Shield Active</h2>
              <p className="text-sm text-zinc-400 mb-6">External presence detected. All content is protected.</p>
              <button onClick={() => setPrivacyShield(false)}
                className="px-8 py-3 bg-white text-black rounded-full text-sm font-semibold hover:bg-zinc-200 transition-colors">
                Dismiss Shield
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="relative z-10 flex justify-between items-center px-6 py-4 border-b border-border bg-card/40 backdrop-blur-md flex-shrink-0">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Aetheria Logo" className="w-8 h-8 object-contain" />
          <div>
            <div className="text-base font-bold tracking-tight leading-none">
              <span className="premium-text">Aetheria</span>
            </div>
            <div className="text-[10px] font-medium text-muted-foreground tracking-widest uppercase mt-0.5">Compute Engine</div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className={`hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full border text-[9px] font-bold tracking-widest uppercase transition-all ${
            visionStatus === 'alert' ? 'border-red-500/40 bg-red-500/10 text-red-400' :
            visionStatus === 'active' ? 'border-emerald-500/30 bg-emerald-500/8 text-emerald-400' :
            'border-zinc-800/50 text-zinc-700'}`}>
            <Eye className="w-3 h-3" />
            {visionStatus === 'alert' ? 'THREAT' : visionStatus === 'active' ? 'VISION ON' : 'OFFLINE'}
          </div>

          <button onClick={() => setPrivacyShield(p => !p)} title="Toggle Privacy Shield"
            className={`p-2 rounded-lg transition-all ${privacyShield ? 'text-red-400 bg-red-500/10' : 'text-zinc-600 hover:text-zinc-300 hover:bg-white/5'}`}>
            {privacyShield ? <EyeOff className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
          </button>

          <div className="hidden sm:block text-right">
            <div className="text-sm font-semibold tracking-tight text-foreground tabular-nums">
              {mounted ? formatTime(time) : '--:--:--'}
            </div>
            <div className="text-xs font-medium text-muted-foreground mt-0.5">
              {mounted ? time.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : '...'}
            </div>
          </div>

          <button onClick={handleLogout} className="p-2 text-zinc-600 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all" title="Sign Out">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Body */}
      <div className="flex-1 flex overflow-hidden relative z-10">

        {/* Left Sidebar */}
        <aside className="hidden lg:flex flex-col gap-2 w-24 border-r border-border bg-card/20 py-4 px-2 items-center flex-shrink-0">
          {navItems.map((item) => (
            <motion.button key={item.id} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => setActiveModule(item.id === activeModule ? null : item.id)}
              className={`w-full p-3 flex flex-col items-center gap-1.5 rounded-xl transition-all ${
                activeModule === item.id ? 'bg-primary/10 shadow-md text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'}`}
              title={item.label}>
              <item.icon className={`w-6 h-6 ${activeModule === item.id ? 'text-primary' : ''}`} />
              <span className="text-[10px] font-bold tracking-wider text-current text-center leading-tight">{item.label.toUpperCase()}</span>
            </motion.button>
          ))}
          <div className="mt-auto">
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              className="w-full p-3 text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-xl transition-all">
              <Settings className="w-5 h-5 mx-auto" />
            </motion.button>
          </div>
        </aside>

        {/* Center Stage */}
        <section className="flex-1 flex flex-col items-center justify-start overflow-y-auto pb-20 lg:pb-4">
          <AnimatePresence mode="wait">
            {activeModule ? (
              <motion.div key={activeModule} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.2 }} className="w-full h-full p-4 md:p-6">
                {activeModule === 'email' && <EmailModule onClose={() => setActiveModule(null)} initialView={emailView} />}
                {activeModule === 'whatsapp' && <WhatsAppModule onClose={() => setActiveModule(null)} />}
                {activeModule === 'calendar' && <CalendarModule onClose={() => setActiveModule(null)} />}
                {activeModule === 'maps' && <MapsModule />}
                {activeModule === 'drive' && <DriveModule />}
                {activeModule === 'youtube' && <YouTubeModule />}
                {activeModule === 'news' && <NewsModule onClose={() => setActiveModule(null)} />}
                {activeModule === 'finance' && <FinanceModule onClose={() => setActiveModule(null)} />}
                <div className="fixed bottom-24 lg:bottom-8 right-8 z-50 transform scale-75 hover:scale-100 transition-all cursor-pointer group">
                  <VoiceOrb isListening={voiceState.isListening} isSpeaking={voiceState.isSpeaking} onClick={() => setActiveModule(null)} />
                  <div className="absolute -top-8 right-1/2 translate-x-1/2 bg-black/80 text-zinc-300 text-[10px] px-2 py-1 rounded-lg font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    Close Module
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div key="main" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="w-full h-full flex flex-col items-center justify-center py-6 px-4">
                <div className="transform scale-90 mb-4">
                  <VoiceOrb isListening={voiceState.isListening} isSpeaking={voiceState.isSpeaking} />
                </div>
                <div className="w-full flex justify-center flex-1 min-h-0">
                  <ChatPanel
                    onVoiceStateChange={setVoiceState}
                    userName={userName}
                    context={`User: ${userName}. Email: ${userEmail || 'Unknown'}. WhatsApp Self: "${userName} (You)"${typeof window !== 'undefined' && (window as any).whatsappSelfNumber ? ` or "+${(window as any).whatsappSelfNumber}"` : ''}. Date/Time: ${time.toString()}. Location: LAT ${location.lat}, LONG ${location.long}. System: ${stats.cpu}% CPU, ${stats.ram}GB RAM. Weather: ${weather.temp}, ${weather.status}. Events: ${events.map(e => `[ID: ${e.id}] ${e.time} - ${e.title}`).join(', ') || 'None'}. Emails: ${typeof window !== 'undefined' ? (window as any).unreadEmailsContext || 'None' : 'None'}.`}
                  />
                </div>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="mt-4 text-center">
                  <p className="text-muted-foreground text-xs tracking-widest uppercase font-semibold">Ambient Mode · Always Listening</p>
                  <div className="mt-2 h-px w-20 mx-auto bg-border" />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Right HUD Panel */}
        <aside className="hidden xl:flex flex-col gap-6 w-80 border-l border-border bg-card/20 p-6 overflow-y-auto flex-shrink-0 scrollbar-thin scrollbar-thumb-border">
          <div className="glass-card p-3 rounded-2xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center text-lg font-bold text-primary-foreground flex-shrink-0 shadow-lg">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1 ml-1">
              <div className="text-base font-semibold text-foreground truncate">{userName}</div>
              <div className="text-sm text-muted-foreground truncate">{userEmail || 'Authenticated'}</div>
            </div>
            <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)] flex-shrink-0" />
          </div>

          <HUDCard title="System Metrics">
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-zinc-500">
                  <span>CPU</span><span className="text-zinc-300 font-medium">{stats.cpu}%</span>
                </div>
                <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                  <motion.div animate={{ width: `${stats.cpu}%` }} className="h-full bg-foreground rounded-full" />
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-zinc-500">
                  <span>Memory</span><span className="text-zinc-300 font-medium">{stats.ram}/{stats.totalRam}GB</span>
                </div>
                <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                  <motion.div animate={{ width: `${stats.ramPercent}%` }} className="h-full bg-muted-foreground rounded-full" />
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-[9px] text-zinc-600 truncate">
                <Cpu className="w-3 h-3 flex-shrink-0" /><span className="truncate">{stats.cpuModel}</span>
              </div>
            </div>
          </HUDCard>

          <HUDCard title="Environment">
            <div className="space-y-2">
              <StatusIndicator label="Temp" value={weather.temp} />
              <StatusIndicator label="Humidity" value={weather.humidity} />
              <StatusIndicator label="Wind" value={weather.wind} />
              <StatusIndicator label="Status" value={weather.status} color="green" />
              <div className="pt-1 border-t border-white/[0.04] flex items-center justify-between text-[9px] text-zinc-600">
                <span className="flex items-center gap-1"><Wifi className="w-3 h-3" />{location.city}</span>
                <span>{location.lat}, {location.long}</span>
              </div>
            </div>
          </HUDCard>

          <HUDCard title="Upcoming" className="flex-1">
            <div className="space-y-3">
              {events.length === 0 ? (
                <div className="text-[10px] text-zinc-600 text-center py-3">No upcoming events.</div>
              ) : events.slice(0, 4).map((ev, i) => (
                <div key={i} className="flex gap-2.5 items-start group">
                  <div className="w-0.5 min-h-[28px] bg-indigo-500/30 group-hover:bg-indigo-400 rounded-full mt-0.5 flex-shrink-0 transition-colors" />
                  <div>
                    <div className="text-[9px] font-medium text-zinc-600 mb-0.5">{ev.time}</div>
                    <div className="text-[11px] font-semibold text-zinc-300 leading-tight">{ev.title}</div>
                  </div>
                </div>
              ))}
            </div>
          </HUDCard>

          <div className={`glass-card p-3 rounded-2xl border transition-colors ${visionStatus === 'alert' ? 'border-red-500/30' : 'border-white/[0.03]'}`}>
            <div className="flex items-center gap-2.5">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${visionStatus === 'alert' ? 'bg-red-500/15' : visionStatus === 'active' ? 'bg-emerald-500/10' : 'bg-zinc-800'}`}>
                {privacyShield ? <EyeOff className="w-3.5 h-3.5 text-red-400" /> : <Eye className={`w-3.5 h-3.5 ${visionStatus === 'active' ? 'text-emerald-400' : 'text-zinc-600'}`} />}
              </div>
              <div>
                <div className="text-[11px] font-semibold text-zinc-300">Vision Shield</div>
                <div className="text-[9px] text-zinc-600">{visionStatus === 'active' ? 'Presence monitoring on' : 'Camera inactive'}</div>
              </div>
            </div>
          </div>

          <div className="glass-card p-3 rounded-2xl flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-zinc-200">All Systems Nominal</div>
              <div className="text-[9px] text-zinc-500">v3.0.0 · AetheriaCompute</div>
            </div>
          </div>
        </aside>
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="lg:hidden fixed bottom-4 left-4 right-4 z-50 glass-panel rounded-2xl border border-white/10 py-2.5 px-3 flex items-center justify-around bg-black/75 backdrop-blur-2xl shadow-2xl">
        {navItems.slice(0, 5).map((item) => (
          <motion.button key={item.id} whileTap={{ scale: 0.9 }}
            onClick={() => setActiveModule(item.id === activeModule ? null : item.id)}
            className={`p-2.5 rounded-xl flex flex-col items-center gap-1 transition-all ${activeModule === item.id ? 'bg-primary/20 text-primary' : 'text-muted-foreground'}`}>
            <item.icon className={`w-5 h-5 ${activeModule === item.id ? 'text-primary' : ''}`} />
            <span className="text-[9px] font-bold tracking-wider">{item.label.toUpperCase()}</span>
          </motion.button>
        ))}
        <motion.button whileTap={{ scale: 0.9 }} onClick={handleLogout} className="p-2.5 rounded-xl text-zinc-600 hover:text-rose-400 transition-colors">
          <LogOut className="w-5 h-5" />
        </motion.button>
      </nav>

      {/* AI Picture-in-Picture Popup */}
      <AnimatePresence>
        {aiPopupModule && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 50, x: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 50, x: 50 }}
            drag
            dragMomentum={false}
            className="fixed bottom-28 right-8 z-[100] w-[400px] h-[550px] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-8rem)] rounded-3xl overflow-hidden shadow-2xl border border-white/20 bg-black/40 backdrop-blur-3xl flex flex-col cursor-move"
          >
            {/* Popup Header */}
            <div className="flex justify-between items-center px-4 py-3 border-b border-white/10 bg-white/5 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.8)] animate-pulse" />
                <span className="text-xs font-bold tracking-widest text-zinc-300 uppercase">
                  Aetheria: {aiPopupModule}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => {
                    setActiveModule(aiPopupModule)
                    setAiPopupModule(null)
                  }}
                  title="Expand to full screen"
                  className="p-1.5 rounded-md hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
                <button
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => setAiPopupModule(null)}
                  title="Close popup"
                  className="p-1.5 rounded-md hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Popup Content */}
            <div 
              className="flex-1 overflow-auto bg-black/20" 
              onPointerDown={(e) => e.stopPropagation()} // Stop dragging when interacting with the module
            >
              {aiPopupModule === 'email' && <EmailModule onClose={() => setAiPopupModule(null)} initialView={emailView} />}
              {aiPopupModule === 'whatsapp' && <WhatsAppModule onClose={() => setAiPopupModule(null)} />}
              {aiPopupModule === 'calendar' && <CalendarModule onClose={() => setAiPopupModule(null)} />}
              {aiPopupModule === 'maps' && <MapsModule />}
              {aiPopupModule === 'drive' && <DriveModule />}
              {aiPopupModule === 'youtube' && <YouTubeModule />}
              {aiPopupModule === 'news' && <NewsModule onClose={() => setAiPopupModule(null)} />}
              {aiPopupModule === 'finance' && <FinanceModule onClose={() => setAiPopupModule(null)} />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}
