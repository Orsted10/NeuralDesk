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
  const [stats, setStats] = useState({ cpu: 5, ram: 8, totalRam: 32, ramPercent: 25, cpuModel: 'Detecting CPU...' })
  const [weather, setWeather] = useState({ temp: '--', humidity: '--', wind: '--', status: 'Updating...' })
  const [activeModule, setActiveModule] = useState<string | null>(null)
  const [emailView, setEmailView] = useState<'compose' | 'inbox'>('compose')
  const [events, setEvents] = useState<any[]>([])
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userName, setUserName] = useState<string>('User')
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
      end.setDate(end.getDate() + 7) // Fetch upcoming 7 days
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
      const res = await fetch(`/api/calendar?timeMin=${encodeURIComponent(start.toISOString())}&timeMax=${encodeURIComponent(end.toISOString())}&timeZone=${encodeURIComponent(tz)}`)
      const data = await res.json()
      if (res.ok && data.events) {
        const mapped = data.events.map((ev: any) => {
          const isAllDay = ev.start?.date !== undefined;
          let timeStr = 'All Day';
          let dateStr = '';
          
          if (isAllDay) {
            const [y, m, d] = ev.start.date.split('-');
            const dObj = new Date(parseInt(y), parseInt(m)-1, parseInt(d));
            dateStr = dObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          } else if (ev.start?.dateTime) {
            const dateObj = new Date(ev.start.dateTime);
            timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
            dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          }

          const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          const displayTime = dateStr === today ? timeStr : `${dateStr} • ${timeStr}`;

          return { id: ev.id, time: displayTime, title: ev.summary || 'Event' }
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
    
    // Fetch User Info
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.email) setUserEmail(data.user.email)
      if (data?.user?.user_metadata?.name || data?.user?.user_metadata?.full_name) {
        setUserName(data.user.user_metadata.name || data.user.user_metadata.full_name)
      }
    })

    // Track Time
    const timer = setInterval(() => setTime(new Date()), 1000)
    
    // System Telemetry fetch
    const fetchTelemetry = async () => {
      try {
        const res = await fetch('/api/gcp-telemetry')
        const data = await res.json()
        if (data.cpu !== undefined) {
          setStats({ 
            cpu: data.cpu, 
            ram: data.ram, 
            totalRam: data.totalRam, 
            ramPercent: data.ramPercent,
            cpuModel: data.cpuModel || 'Unknown CPU'
          })
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
    const handleEmailCompose = () => {
      setEmailView('compose')
      setActiveModule('email')
    }
    const handleEmailInbox = () => {
      setEmailView('inbox')
      setActiveModule('email')
    }
    const handleCalendarUpdate = () => loadCalendarEvents()
    const handleOpenModule = (e: any) => setActiveModule(e.detail)

    window.addEventListener('show-map', handleMapSwitch)
    window.addEventListener('create-doc', handleDriveSwitch)
    window.addEventListener('play-video', handleYoutubeSwitch)
    window.addEventListener('send-email', handleEmailCompose)
    window.addEventListener('read-emails', handleEmailInbox)
    window.addEventListener('calendar-updated', handleCalendarUpdate)
    window.addEventListener('open-module', handleOpenModule)

    return () => {
      clearInterval(timer)
      clearInterval(statsTimer)
      window.removeEventListener('show-map', handleMapSwitch)
      window.removeEventListener('create-doc', handleDriveSwitch)
      window.removeEventListener('play-video', handleYoutubeSwitch)
      window.removeEventListener('send-email', handleEmailCompose)
      window.removeEventListener('read-emails', handleEmailInbox)
      window.removeEventListener('open-module', handleOpenModule)
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
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6 flex flex-col relative overflow-hidden font-sans">
      <ParticleBackground />

      {/* Top Header */}
      <header className="relative z-10 flex justify-between items-center mb-10 pb-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 glass-card rounded-2xl flex items-center justify-center shadow-lg">
            <Shield className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight premium-text">NeuralDesk</h1>
            <p className="text-xs font-medium text-zinc-500 mt-1">Ankan's Workspace</p>
          </div>
        </div>
        
        <div className="flex gap-8 items-center">
          <div className="text-right">
            <div className="text-2xl font-semibold tracking-tight text-zinc-200">
              {mounted ? formatTime(time) : '--:--:--'}
            </div>
            <div className="text-xs font-medium text-zinc-500 mt-1">
              {mounted ? time.toDateString() : 'Loading...'}
            </div>
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <div className="flex-1 grid grid-cols-12 gap-6 relative z-10">
        
        {/* Left Sidebar */}
        <aside className="col-span-1 flex flex-col gap-6 items-center py-8 glass-panel rounded-3xl z-20">
          {navItems.map((item) => (
            <motion.button
              key={item.id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveModule(item.id === activeModule ? null : item.id)}
              className={`p-3 transition-all duration-300 rounded-xl relative group ${
                activeModule === item.id ? 'bg-white/10 text-zinc-100 shadow-md' : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/5'
              }`}
            >
              <item.icon className="w-6 h-6" />
              <span className="absolute left-16 bg-zinc-800 text-zinc-100 px-3 py-1.5 rounded-lg text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl border border-white/10 pointer-events-none">
                {item.label}
              </span>
            </motion.button>
          ))}
          <div className="mt-auto flex flex-col gap-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleLogout}
              className="p-3 text-zinc-600 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all relative group"
            >
              <LogOut className="w-6 h-6" />
              <span className="absolute left-16 bg-rose-500/10 text-rose-400 px-3 py-1.5 rounded-lg text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl border border-rose-500/20 pointer-events-none">
                Sign Out
              </span>
            </motion.button>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="p-3 text-zinc-600 hover:text-zinc-200 hover:bg-white/5 rounded-xl transition-all">
              <Settings className="w-6 h-6" />
            </motion.button>
          </div>
        </aside>

        {/* Center Interface */}
        <section className="col-span-8 flex flex-col items-center justify-center relative">

          {activeModule === 'email' && (
            <EmailModule onClose={() => setActiveModule(null)} initialView={emailView} />
          )}
          {activeModule === 'whatsapp' && (
            <WhatsAppModule onClose={() => setActiveModule(null)} />
          )}
          {activeModule === 'calendar' && (
            <CalendarModule onClose={() => setActiveModule(null)} />
          )}
          {activeModule === 'maps' && (
            <MapsModule />
          )}
          {activeModule === 'drive' && (
            <DriveModule />
          )}
          {activeModule === 'youtube' && (
            <YouTubeModule />
          )}

          {activeModule && (
            <div className="fixed bottom-8 right-8 z-50 transform scale-75 hover:scale-100 transition-all cursor-pointer group">
              <div className="absolute inset-0 bg-black/50 rounded-full blur-xl -z-10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <VoiceOrb isListening={voiceState.isListening} isSpeaking={voiceState.isSpeaking} onClick={() => setActiveModule(null)} />
              <div className="absolute top-0 right-0 -mt-2 -mr-2 bg-indigo-500 text-white text-[10px] px-2 py-1 rounded-full font-bold shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                Close Module
              </div>
            </div>
          )}

          {/* Always mounted to keep background tasks active, hidden when module is active */}
          <div className={activeModule ? "hidden" : "w-full flex flex-col items-center justify-center relative"}>
            <VoiceOrb isListening={voiceState.isListening} isSpeaking={voiceState.isSpeaking} />

            <div className="mt-8 w-full flex justify-center">
              <ChatPanel 
                onVoiceStateChange={setVoiceState} 
                context={`User: ${userName}. User Email (for sending to myself): ${userEmail || 'Unknown'}. WhatsApp Self Contact Name: "${userName} (You)"${typeof window !== 'undefined' && (window as any).whatsappSelfNumber ? ` or "+${(window as any).whatsappSelfNumber}"` : ''}. Current Date & Time: ${time.toString()}. Live Location: (LAT: ${location.lat}, LONG: ${location.long}). Status: ${location.city}. System: ${stats.cpu}% CPU, ${stats.ram}GB RAM. Weather: ${weather.temp}, ${weather.status}. Live Upcoming Calendar Events: ${events.map(e => `[ID: ${e.id}] ${e.time} - ${e.title}`).join(', ')}. Unread Emails: ${typeof window !== 'undefined' ? (window as any).unreadEmailsContext || 'None' : 'None'}.`}
              />
            </div>

            <div className="mt-8 text-center max-w-md">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-zinc-500 font-medium text-sm mb-4"
              >
                Listening for commands...
              </motion.div>
              <div className="h-1 w-32 mx-auto bg-zinc-800 rounded-full overflow-hidden">
                <motion.div 
                  animate={{ x: [-50, 150] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="w-1/2 h-full bg-indigo-500/50 rounded-full"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Right Status Panel */}
        <aside className="col-span-3 flex flex-col gap-6">
          <HUDCard title="System Metrics">
            <div className="space-y-5">
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-medium text-zinc-400">
                  <span>CPU Usage</span>
                  <span>{stats.cpu}%</span>
                </div>
                <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div 
                    animate={{ width: `${stats.cpu}%` }}
                    className="h-full bg-indigo-500" 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-medium text-zinc-400">
                  <span>Memory Allocation</span>
                  <span>{stats.ram} GB / {stats.totalRam} GB</span>
                </div>
                <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div 
                    animate={{ width: `${stats.ramPercent}%` }} 
                    className="h-full bg-indigo-400" 
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

          <HUDCard title="Schedule" className="flex-1">
            <div className="space-y-4">
              {events.length === 0 ? (
                <div className="text-sm text-zinc-500 text-center py-6">
                  No upcoming events today.
                </div>
              ) : (
                events.map((ev, i) => (
                  <div key={i} className="flex gap-4 items-center group">
                    <div className="w-1 h-8 bg-indigo-500/50 rounded-full transition-all group-hover:bg-indigo-400" />
                    <div>
                      <div className="text-xs font-medium text-zinc-400 mb-0.5">{ev.time}</div>
                      <div className="text-sm font-semibold text-zinc-200">{ev.title}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </HUDCard>

          <div className="glass-card p-4 rounded-2xl flex items-center gap-4">
             <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
               <Activity className="w-4 h-4 text-emerald-400" />
             </div>
             <div>
               <div className="text-sm font-semibold text-zinc-200">System Nominal</div>
               <div className="text-xs text-zinc-500">All services operational</div>
             </div>
          </div>
        </aside>

      </div>

      {/* Bottom Status Bar */}
      <footer className="relative z-10 mt-6 flex justify-between items-center text-xs font-medium text-zinc-600">
        <div className="flex gap-6">
          <span>{location.city}</span>
          <span>LAT: {location.lat} • LONG: {location.long}</span>
        </div>
        <div className="flex gap-6">
          <span className="flex items-center gap-2"><Cpu className="w-4 h-4" /> {stats.cpuModel}</span>
          <span>v2.0.0</span>
        </div>
      </footer>
    </main>
  )
}
