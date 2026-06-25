'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Mail, 
  MessageSquare, 
  Calendar, 
  Cloud, 
  CheckSquare, 
  Mic, 
  Settings,
  Shield,
  Activity,
  Cpu,
  Compass,
  HardDrive,
  Tv,
  LogOut
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import VoiceOrb from '@/components/jarvis/VoiceOrb'
import ChatPanel from '@/components/jarvis/ChatPanel'
import EmailModule from '@/components/jarvis/EmailModule'
import WhatsAppModule from '@/components/jarvis/WhatsAppModule'
import CalendarModule from '@/components/jarvis/CalendarModule'
import MapsModule from '@/components/jarvis/MapsModule'
import DriveModule from '@/components/jarvis/DriveModule'
import YouTubeModule from '@/components/jarvis/YouTubeModule'
import { HUDCard, StatusIndicator, ParticleBackground } from '@/components/jarvis/HUD'

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false)
  const [time, setTime] = useState(new Date())
  const [location, setLocation] = useState({ lat: '0.0000', long: '0.0000', city: 'Detecting...' })
  const [voiceState, setVoiceState] = useState({ isListening: false, isSpeaking: false })
  const [stats, setStats] = useState({ cpu: 5, ram: 8 })
  const [weather, setWeather] = useState({ temp: '--', humidity: '--', wind: '--', status: 'Updating...' })
  const [activeModule, setActiveModule] = useState<string | null>(null)
  const [events, setEvents] = useState<any[]>([
    { id: 'mock-sync', time: '14:00', title: 'Project Sync' },
    { id: 'mock-gym', time: '16:30', title: 'Gym Session' },
  ])
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const loadCalendarEvents = async () => {
    try {
      const start = new Date()
      start.setHours(0, 0, 0, 0)
      const end = new Date()
      end.setHours(23, 59, 59, 999)
      const res = await fetch(`/api/calendar?timeMin=${encodeURIComponent(start.toISOString())}&timeMax=${encodeURIComponent(end.toISOString())}`)
      const data = await res.json()
      if (res.ok && data.events) {
        const mapped = data.events.map((ev: any) => {
          const timeStr = ev.start?.dateTime 
            ? new Date(ev.start.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) 
            : 'All Day'
          return { id: ev.id, time: timeStr, title: ev.summary || 'Event' }
        })
        if (mapped.length > 0) {
          setEvents(mapped)
        } else {
          setEvents([])
        }
      }
    } catch (e) {
      console.error("Failed to load active calendar events", e)
    }
  }

  useEffect(() => {
    setMounted(true)
    
    // Track Time
    const timer = setInterval(() => setTime(new Date()), 1000)
    
    // System Telemetry fetch
    const fetchTelemetry = async () => {
      try {
        const res = await fetch('/api/gcp-telemetry')
        const data = await res.json()
        if (data.cpu !== undefined) {
          setStats({ cpu: data.cpu, ram: data.ram })
        }
      } catch (e) {}
    }
    fetchTelemetry()
    const statsTimer = setInterval(fetchTelemetry, 10000)

    // Track Location & Fetch REAL Weather
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        const lat = position.coords.latitude.toFixed(4)
        const lon = position.coords.longitude.toFixed(4)
        setLocation({ lat, long: lon, city: 'Verified Node' })
        
        try {
          // Fetch Real Weather from Open-Meteo (Free, No Key)
          const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code`)
          const data = await res.json()
          
          if (data.current) {
            setWeather({
              temp: `${Math.round(data.current.temperature_2m)}°C`,
              humidity: `${data.current.relative_humidity_2m}%`,
              wind: `${data.current.wind_speed_10m} km/h`,
              status: data.current.temperature_2m > 20 ? 'Optimal' : 'Cooling'
            })
          }
        } catch (e) {
          console.error("Weather fetch failed", e)
        }
      })
    }

    // Load active calendar events
    loadCalendarEvents()

    // Load unread emails for context
    const loadUnreadEmails = async () => {
      try {
        const res = await fetch('/api/gmail')
        const data = await res.json()
        if (data.emails) {
          (window as any).unreadEmailsContext = data.emails.map((e: any) => `[From: ${e.from}] ${e.subject}`).join(' | ')
        }
      } catch (e) {}
    }
    loadUnreadEmails()

    // Auto HUD Module switches when JARVIS triggers actions
    const handleMapSwitch = () => setActiveModule('maps')
    const handleDriveSwitch = () => setActiveModule('drive')
    const handleYoutubeSwitch = () => setActiveModule('youtube')
    const handleEmailSwitch = () => setActiveModule('email')
    const handleCalendarUpdate = () => loadCalendarEvents()

    window.addEventListener('show-map', handleMapSwitch)
    window.addEventListener('create-doc', handleDriveSwitch)
    window.addEventListener('play-video', handleYoutubeSwitch)
    window.addEventListener('send-email', handleEmailSwitch)
    window.addEventListener('read-emails', handleEmailSwitch)
    window.addEventListener('calendar-updated', handleCalendarUpdate)

    return () => {
      clearInterval(timer)
      clearInterval(statsTimer)
      window.removeEventListener('show-map', handleMapSwitch)
      window.removeEventListener('create-doc', handleDriveSwitch)
      window.removeEventListener('play-video', handleYoutubeSwitch)
      window.removeEventListener('send-email', handleEmailSwitch)
      window.removeEventListener('read-emails', handleEmailSwitch)
      window.removeEventListener('calendar-updated', handleCalendarUpdate)
    }
  }, [])

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    })
  }

  const navItems = [
    { icon: Mail, label: 'Email', id: 'email' },
    { icon: MessageSquare, label: 'WhatsApp', id: 'whatsapp' },
    { icon: Calendar, label: 'Calendar', id: 'calendar' },
    { icon: Compass, label: 'Maps', id: 'maps' },
    { icon: HardDrive, label: 'Drive', id: 'drive' },
    { icon: Tv, label: 'YouTube', id: 'youtube' },
    { icon: Cloud, label: 'Weather', id: 'weather' },
    { icon: CheckSquare, label: 'Tasks', id: 'tasks' },
  ]

  return (
    <main className="min-h-screen bg-[#050510] text-cyan-400 p-6 flex flex-col relative overflow-hidden">
      <ParticleBackground />

      {/* Top Header */}
      <header className="relative z-10 flex justify-between items-center mb-8 border-b border-cyan-500/20 pb-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 border border-cyan-500/50 flex items-center justify-center glow-border rounded-sm">
            <Shield className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-[0.3em] uppercase glow-text">NeuralDesk OS</h1>
            <p className="text-[9px] uppercase tracking-widest text-cyan-500/40">Security Protocol: Active | User: Ankan</p>
          </div>
        </div>
        
        <div className="flex gap-8 items-center">
          <div className="text-right">
            <div className="text-2xl font-mono tracking-tighter glow-text">
              {mounted ? formatTime(time) : '--:--:--'}
            </div>
            <div className="text-[10px] uppercase tracking-widest text-cyan-500/40">
              {mounted ? time.toDateString() : 'INITIALIZING...'}
            </div>
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <div className="flex-1 grid grid-cols-12 gap-6 relative z-10">
        
        {/* Left Sidebar */}
        <aside className="col-span-1 flex flex-col gap-6 items-center py-8 bg-black/20 border border-cyan-500/10 rounded-xl backdrop-blur-sm">
          {navItems.map((item) => (
            <motion.button
              key={item.id}
              whileHover={{ scale: 1.1, color: '#00f2ff' }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setActiveModule(item.id === activeModule ? null : item.id)}
              className={`p-3 transition-colors relative group ${
                activeModule === item.id ? 'text-cyan-400' : 'text-cyan-500/50 hover:text-cyan-400'
              }`}
            >
              <item.icon className="w-6 h-6" />
              <span className="absolute left-14 bg-cyan-900/80 text-cyan-400 px-2 py-1 rounded text-[10px] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-cyan-500/30">
                {item.label}
              </span>
            </motion.button>
          ))}
          <div className="mt-auto flex flex-col gap-4">
            <motion.button
              whileHover={{ scale: 1.1, color: '#ef4444' }}
              whileTap={{ scale: 0.9 }}
              onClick={handleLogout}
              className="p-3 text-cyan-500/20 hover:text-red-500 transition-colors relative group"
            >
              <LogOut className="w-6 h-6" />
              <span className="absolute left-14 bg-red-900/80 text-red-100 px-2 py-1 rounded text-[10px] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-red-500/30">
                System Disconnect
              </span>
            </motion.button>
            <Settings className="w-6 h-6 text-cyan-500/20 hover:text-cyan-400 cursor-pointer" />
          </div>
        </aside>

        {/* Center Interface */}
        <section className="col-span-8 flex flex-col items-center justify-center relative">
          <div className="absolute top-0 left-0 w-full flex justify-between px-10 text-[10px] uppercase tracking-[0.5em] text-cyan-500/20">
            <span>Primary Interface Alpha</span>
            <span>Neural Link: 98%</span>
          </div>

          {activeModule === 'email' ? (
            <EmailModule onClose={() => setActiveModule(null)} />
          ) : activeModule === 'whatsapp' ? (
            <WhatsAppModule onClose={() => setActiveModule(null)} />
          ) : activeModule === 'calendar' ? (
            <CalendarModule onClose={() => setActiveModule(null)} />
          ) : activeModule === 'maps' ? (
            <MapsModule />
          ) : activeModule === 'drive' ? (
            <DriveModule />
          ) : activeModule === 'youtube' ? (
            <YouTubeModule />
          ) : (
            <>
              <VoiceOrb isListening={voiceState.isListening} isSpeaking={voiceState.isSpeaking} />

              <div className="mt-8 w-full flex justify-center">
                <ChatPanel 
                  onVoiceStateChange={setVoiceState} 
                  context={`User: Ankan. Current Date & Time: ${time.toString()}. Live Location: (LAT: ${location.lat}, LONG: ${location.long}). Status: ${location.city}. System: ${stats.cpu}% CPU, ${stats.ram}GB RAM. Weather: ${weather.temp}, ${weather.status}. Live Upcoming Calendar Events: ${events.map(e => `[ID: ${e.id}] ${e.time} - ${e.title}`).join(', ')}. Unread Emails: ${typeof window !== 'undefined' ? (window as any).unreadEmailsContext || 'None' : 'None'}.`}
                />
              </div>

              <div className="mt-8 text-center max-w-md">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-cyan-400/60 font-mono text-sm mb-4"
                >
                  Systems online. Awaiting command, Sir.
                </motion.div>
                <div className="h-1 w-64 mx-auto bg-cyan-900/30 rounded-full overflow-hidden">
                  <motion.div 
                    animate={{ x: [-100, 300] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    className="w-1/3 h-full bg-cyan-500/40"
                  />
                </div>
              </div>
            </>
          )}
        </section>

        {/* Right Status Panel */}
        <aside className="col-span-3 flex flex-col gap-6">
          <HUDCard title="System Resources">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] uppercase">
                  <span>CPU Load</span>
                  <span>{stats.cpu}%</span>
                </div>
                <div className="h-1 bg-cyan-900/30 rounded-full">
                  <motion.div 
                    animate={{ width: `${stats.cpu}%` }}
                    className="h-full bg-cyan-500" 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] uppercase">
                  <span>System Memory</span>
                  <span>{stats.ram} GB</span>
                </div>
                <div className="h-1 bg-cyan-900/30 rounded-full">
                  <motion.div 
                    animate={{ width: `${(stats.ram/32)*100}%` }} // Adjusted for 32GB max visual
                    className="h-full bg-cyan-500/60" 
                  />
                </div>
              </div>
            </div>
          </HUDCard>

          <HUDCard title="Environmental Data">
            <div className="space-y-2">
              <StatusIndicator label="Temperature" value={weather.temp} />
              <StatusIndicator label="Humidity" value={weather.humidity} />
              <StatusIndicator label="Wind Speed" value={weather.wind} />
              <StatusIndicator label="Status" value={weather.status} color="green" />
            </div>
          </HUDCard>

          <HUDCard title="Upcoming Events" className="flex-1">
            <div className="space-y-4">
              {events.length === 0 ? (
                <div className="text-[10px] text-cyan-500/30 uppercase tracking-widest text-center py-4">
                  No active events, Sir.
                </div>
              ) : (
                events.map((ev, i) => (
                  <div key={i} className="flex gap-4 items-start border-l border-cyan-500/20 pl-4 py-1">
                    <span className="text-[10px] font-mono text-cyan-500/60">{ev.time}</span>
                    <span className="text-xs uppercase tracking-wider">{ev.title}</span>
                  </div>
                ))
              )}
            </div>
          </HUDCard>

          <div className="bg-cyan-500/5 border border-cyan-500/20 p-3 rounded-lg flex items-center gap-3">
             <Activity className="w-4 h-4 animate-pulse" />
             <span className="text-[10px] uppercase tracking-[0.2em]">All Systems Nominal</span>
          </div>
        </aside>

      </div>

      {/* Bottom Status Bar */}
      <footer className="relative z-10 mt-8 flex justify-between items-center text-[9px] uppercase tracking-[0.3em] text-cyan-500/30 border-t border-cyan-500/10 pt-4">
        <div className="flex gap-6">
          <span>LAT: {location.lat}</span>
          <span>LONG: {location.long}</span>
        </div>
        <div className="flex gap-6">
          <span className="flex items-center gap-2"><Cpu className="w-3 h-3" /> Core: i9-12900K</span>
          <span>Uptime: 04:12:33</span>
        </div>
      </footer>
    </main>
  )
}
