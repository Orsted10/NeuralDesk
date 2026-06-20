'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Calendar as CalendarIcon, Clock, X, Plus, RefreshCw } from 'lucide-react'
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
      const formattedViewDate = format(viewDate, 'yyyy-MM-dd')
      const res = await fetch(`/api/calendar?date=${formattedViewDate}`)
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
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-2xl"
    >
      <HUDCard title="Temporal Logistics (Calendar)">
        <div className="space-y-6 p-4">
          {/* Header */}
          <div className="flex justify-between items-center mb-2 border-b border-cyan-500/30 pb-4">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-cyan-400" />
              <span className="text-xs text-cyan-500/80 uppercase tracking-[0.2em] font-semibold">
                Schedule View
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Popover>
                <PopoverTrigger className="flex items-center rounded-md border h-8 w-40 justify-start text-left font-medium bg-black/50 border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10 hover:text-cyan-400 hover:border-cyan-400 text-[11px] tracking-widest px-3 transition-all shadow-[0_0_10px_rgba(0,242,255,0.1)]">
                  <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                  {viewDate ? format(viewDate, "PPP") : <span>Pick a date</span>}
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-black/90 border border-cyan-500/30 text-cyan-300" align="end">
                  <CalendarUI
                    mode="single"
                    selected={viewDate}
                    onSelect={(day) => day && setViewDate(day)}
                    initialFocus
                    className="bg-black/90 text-cyan-300 rounded-md shadow-[0_0_15px_rgba(0,242,255,0.2)]"
                  />
                </PopoverContent>
              </Popover>

              <button onClick={fetchEvents} className="text-cyan-500/40 hover:text-cyan-400 transition-colors" disabled={isLoading}>
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              {onClose && (
                <button onClick={onClose} className="text-cyan-500/40 hover:text-cyan-400">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Timeline View */}
          <div className="bg-black/40 border border-cyan-500/20 rounded-lg p-6 h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-cyan-500/30 shadow-[inset_0_0_20px_rgba(0,242,255,0.05)]">
            {isLoading ? (
              <div className="h-full flex items-center justify-center text-xs uppercase tracking-widest text-cyan-500/50 animate-pulse">
                Syncing with Google...
              </div>
            ) : events.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs uppercase tracking-widest text-cyan-500/50">
                No active events for selected date, Sir.
              </div>
            ) : (
              <div className="space-y-6">
                {events.map((ev, i) => (
                  <div key={ev.id || i} className="flex gap-6 items-start relative before:absolute before:left-[4rem] before:top-5 before:bottom-[-2.5rem] before:w-[2px] before:bg-cyan-500/20 last:before:hidden">
                    <div className="w-14 flex-shrink-0 text-right pt-1">
                      <div className="text-xs text-cyan-400 font-mono font-medium">
                        {ev.start?.dateTime ? formatTime(ev.start.dateTime) : 'All Day'}
                      </div>
                    </div>
                    <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 mt-2 shadow-[0_0_12px_rgba(0,242,255,1)] z-10 relative"></div>
                    <div className="flex-1 bg-cyan-500/10 border border-cyan-500/30 p-4 rounded-lg hover:bg-cyan-500/20 hover:shadow-[0_0_15px_rgba(0,242,255,0.15)] transition-all cursor-default">
                      <div className="text-sm text-cyan-100 font-bold tracking-wide">{ev.summary}</div>
                      {ev.description && (
                        <div className="text-xs text-cyan-500/80 mt-2 leading-relaxed">{ev.description}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* New Event Form */}
          <div className="mt-6 border-t border-cyan-500/30 pt-6 space-y-4">
            <span className="text-xs font-bold uppercase tracking-widest text-cyan-500/80 block mb-2">Schedule New Event</span>
            
            <div className="grid grid-cols-4 gap-4">
              <div className="col-span-4 space-y-1">
                <Input 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Mission Objective / Event Title"
                  className="bg-black/50 border-cyan-500/30 text-cyan-100 text-sm h-10 px-4 focus:border-cyan-400 focus:shadow-[0_0_10px_rgba(0,242,255,0.2)] transition-all"
                />
              </div>
              <div className="col-span-2 space-y-1">
                <Popover>
                  <PopoverTrigger className="flex items-center rounded-md border h-10 w-full justify-start text-left font-medium bg-black/50 border-cyan-500/30 text-cyan-100 hover:bg-cyan-500/10 hover:text-cyan-400 hover:border-cyan-400 text-sm px-4 transition-all">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {eventDate ? format(eventDate, "PPP") : <span>Pick a date</span>}
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-black/90 border border-cyan-500/30 text-cyan-300" align="start">
                    <CalendarUI
                      mode="single"
                      selected={eventDate}
                      onSelect={(day) => day && setEventDate(day)}
                      initialFocus
                      className="bg-black/90 text-cyan-300 rounded-md shadow-[0_0_15px_rgba(0,242,255,0.2)]"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="col-span-1 space-y-1">
                <Input 
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="bg-black/50 border-cyan-500/30 text-cyan-100 text-sm h-10 w-full px-3 focus:border-cyan-400 transition-all [color-scheme:dark]"
                />
              </div>
              <div className="col-span-1 space-y-1">
                <Input 
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="bg-black/50 border-cyan-500/30 text-cyan-100 text-sm h-10 w-full px-3 focus:border-cyan-400 transition-all [color-scheme:dark]"
                />
              </div>
              <div className="col-span-4 mt-4">
                <Button 
                  onClick={handleCreateEvent}
                  disabled={isCreating}
                  className="w-full h-10 bg-cyan-500/10 border border-cyan-500/40 hover:bg-cyan-500/30 text-cyan-400 text-xs font-bold tracking-widest uppercase flex gap-2 transition-all hover:shadow-[0_0_15px_rgba(0,242,255,0.3)]"
                >
                  <Plus className="w-4 h-4" /> {isCreating ? 'Adding Protocol...' : 'Add Event'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </HUDCard>
    </motion.div>
  )
}
