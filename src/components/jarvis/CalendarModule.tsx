'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Calendar as CalendarIcon, Clock, X, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { HUDCard } from './HUD'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { Calendar as CalendarUI } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

export default function CalendarModule({ onClose }: { onClose?: () => void }) {
  const [events, setEvents] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  
  // View state
  const [viewDate, setViewDate] = useState<Date>(new Date())

  // New event state
  const [eventDate, setEventDate] = useState<Date>(new Date())
  const [title, setTitle] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [description, setDescription] = useState('')

  const fetchEvents = async () => {
    setIsLoading(true)
    try {
      const start = new Date(viewDate)
      start.setHours(0, 0, 0, 0)
      const end = new Date(viewDate)
      end.setHours(23, 59, 59, 999)
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
      const res = await fetch(`/api/calendar?timeMin=${encodeURIComponent(start.toISOString())}&timeMax=${encodeURIComponent(end.toISOString())}&timeZone=${encodeURIComponent(tz)}`)
      const data = await res.json()
      if (res.ok) {
        setEvents(data.events || [])
      } else {
        toast.error(data.error || 'Failed to sync calendar')
      }
    } catch (error) {
      toast.error('Network error while syncing calendar')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchEvents()

    const handleUpdate = () => {
      fetchEvents()
    }

    window.addEventListener('calendar-updated', handleUpdate)
    return () => {
      window.removeEventListener('calendar-updated', handleUpdate)
    }
  }, [viewDate])

  const handleDeleteEvent = async (eventId: string) => {
    try {
      const res = await fetch(`/api/calendar?eventId=${encodeURIComponent(eventId)}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        toast.success('Event manually terminated.', { icon: '🗑️' })
        fetchEvents()
        window.dispatchEvent(new Event('calendar-updated'))
      } else {
        toast.error('Failed to remove event.')
      }
    } catch (error) {
      toast.error('Network error while deleting event')
    }
  }

  const handleCreateEvent = async () => {
    if (!title || !eventDate || !startTime || !endTime) {
      toast.error('Sir, please provide title, date, start time, and end time.')
      return
    }

    setIsCreating(true)
    try {
      // Create full datetime strings for selected date
      const formattedEventDate = format(eventDate, 'yyyy-MM-dd')
      const startDateTime = new Date(`${formattedEventDate}T${startTime}`).toISOString()
      const endDateTime = new Date(`${formattedEventDate}T${endTime}`).toISOString()

      const res = await fetch('/api/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary: title,
          description,
          startDateTime,
          endDateTime
        }),
      })

      if (res.ok) {
        toast.success('Event added to schedule, Sir.')
        setTitle('')
        setStartTime('')
        setEndTime('')
        setDescription('')
        fetchEvents() // refresh list
        window.dispatchEvent(new Event('calendar-updated'))
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to create event')
      }
    } catch (error) {
      toast.error('Failed to dispatch calendar event')
    } finally {
      setIsCreating(false)
    }
  }

  const formatTime = (dateTimeStr: string) => {
    if (!dateTimeStr) return ''
    const d = new Date(dateTimeStr)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="w-full h-full glass-panel rounded-t-3xl lg:rounded-3xl shadow-2xl flex flex-col relative overflow-hidden mt-auto lg:mt-0 border-none"
    >
      <div className="p-6 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
            <CalendarIcon className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Temporal Logistics</h2>
            <p className="text-xs text-muted-foreground">Schedule View</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Popover>
            <PopoverTrigger className="flex items-center rounded-xl border border-white/10 h-9 w-40 justify-start text-left font-medium bg-white/5 text-zinc-200 hover:bg-white/10 hover:text-zinc-100 text-xs px-3 transition-all">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {viewDate ? format(viewDate, "PPP") : <span>Pick a date</span>}
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 glass-card text-zinc-200 border-white/10 rounded-2xl shadow-xl" align="end">
              <CalendarUI
                mode="single"
                selected={viewDate}
                onSelect={(day) => day && setViewDate(day)}
                className="glass-card text-zinc-200 rounded-2xl"
              />
            </PopoverContent>
          </Popover>

          <button onClick={fetchEvents} className="text-zinc-400 hover:text-zinc-200 hover:bg-white/5 p-2 rounded-lg transition-all" disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          {onClose && (
            <button onClick={onClose} className="text-zinc-400 hover:text-zinc-200 hover:bg-white/5 p-2 rounded-lg transition-all">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 scrollbar-thin scrollbar-thumb-border flex flex-col">
        <div className="flex-1 glass-card rounded-2xl p-6 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
              <Popover>
                <PopoverTrigger className="flex items-center rounded-xl border border-white/10 h-9 w-40 justify-start text-left font-medium bg-white/5 text-zinc-200 hover:bg-white/10 hover:text-zinc-100 text-xs px-3 transition-all">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {viewDate ? format(viewDate, "PPP") : <span>Pick a date</span>}
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 glass-card text-zinc-200 border-white/10 rounded-2xl shadow-xl" align="end">
                  <CalendarUI
                    mode="single"
                    selected={viewDate}
                    onSelect={(day) => day && setViewDate(day)}
                    className="glass-card text-zinc-200 rounded-2xl"
                  />
                </PopoverContent>
              </Popover>

              <button onClick={fetchEvents} className="text-zinc-400 hover:text-zinc-200 hover:bg-white/5 p-2 rounded-lg transition-all" disabled={isLoading}>
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              {onClose && (
                <button onClick={onClose} className="text-zinc-400 hover:text-zinc-200 hover:bg-white/5 p-2 rounded-lg transition-all">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Timeline View */}
          <div className="glass-card rounded-2xl p-6 h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
            {isLoading ? (
              <div className="h-full flex items-center justify-center text-sm font-medium text-zinc-500 animate-pulse">
                Syncing with Google...
              </div>
            ) : events.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm font-medium text-zinc-500">
                No active events for selected date.
              </div>
            ) : (
              <div className="space-y-6">
                {events.map((ev, i) => (
                  <div key={ev.id || i} className="flex gap-6 items-start relative before:absolute before:left-[4rem] before:top-5 before:bottom-[-2.5rem] before:w-[2px] before:bg-white/5 last:before:hidden">
                    <div className="w-14 flex-shrink-0 text-right pt-1">
                      <div className="text-xs text-indigo-400 font-semibold">
                        {ev.start?.dateTime ? formatTime(ev.start.dateTime) : 'All Day'}
                      </div>
                    </div>
                    <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 mt-2 z-10 relative shadow-md shadow-indigo-500/30"></div>
                    <div className="flex-1 glass-input border border-white/5 p-4 rounded-xl hover:bg-white/[0.03] transition-all flex justify-between items-start group">
                      <div>
                        <div className="text-sm text-zinc-100 font-semibold">{ev.summary}</div>
                        {ev.description && (
                          <div className="text-xs text-zinc-400 mt-2 leading-relaxed">{ev.description}</div>
                        )}
                      </div>
                      {ev.id && (
                        <button 
                          onClick={() => handleDeleteEvent(ev.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        {/* New Event Form */}
        <div className="mt-6 border-t border-white/5 pt-6 space-y-4">
          <span className="text-sm font-semibold tracking-wide text-foreground block mb-2">Schedule New Event</span>
          
          <div className="grid grid-cols-4 gap-4">
            <div className="col-span-4 space-y-1">
              <Input 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Meeting details / Event Title"
                className="glass-input h-10 px-4 text-foreground placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-indigo-500"
              />
            </div>
            <div className="col-span-2 space-y-1">
              <Popover>
                <PopoverTrigger className="flex items-center rounded-xl border border-white/10 h-10 w-full justify-start text-left font-medium bg-white/5 text-foreground hover:bg-white/10 text-sm px-4 transition-all">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {eventDate ? format(eventDate, "PPP") : <span>Pick a date</span>}
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 glass-card text-foreground border-white/10 rounded-2xl shadow-xl" align="start">
                  <CalendarUI
                    mode="single"
                    selected={eventDate}
                    onSelect={(day) => day && setEventDate(day)}
                    className="glass-card text-foreground rounded-2xl"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="col-span-1 space-y-1">
              <Input 
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="glass-input h-10 w-full px-3 text-foreground focus-visible:ring-1 focus-visible:ring-indigo-500"
              />
            </div>
            <div className="col-span-1 space-y-1">
              <Input 
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="glass-input h-10 w-full px-3 text-foreground focus-visible:ring-1 focus-visible:ring-indigo-500"
              />
            </div>
            <div className="col-span-4 mt-2">
              <Button 
                onClick={handleCreateEvent}
                disabled={isCreating}
                className="w-full h-10 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold flex gap-2 transition-all rounded-xl shadow-lg"
              >
                <Plus className="w-4 h-4" /> {isCreating ? 'Adding Event...' : 'Add Event'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
