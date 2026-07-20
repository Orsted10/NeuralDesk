import { useEffect, useState, useRef } from 'react'
import { format } from 'date-fns'

export function useEventNotifier(handleSend: (msg: string) => void) {
  const [events, setEvents] = useState<any[]>([])
  // We keep a record of which thresholds have been notified for which event IDs.
  // Example: { 'eventId123': [5, 1] }
  const notifiedRef = useRef<Record<string, number[]>>({})

  // 1. Fetch Today's Events
  const fetchTodayEvents = async () => {
    try {
      const start = new Date()
      start.setHours(0, 0, 0, 0)
      const end = new Date()
      end.setHours(23, 59, 59, 999)
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
      const res = await fetch(`/api/calendar?timeMin=${encodeURIComponent(start.toISOString())}&timeMax=${encodeURIComponent(end.toISOString())}&timeZone=${encodeURIComponent(tz)}`)
      if (res.ok) {
        const data = await res.json()
        setEvents(data.events || [])
      }
    } catch (err) {
      console.error('EventNotifier failed to fetch events', err)
    }
  }

  // Initial fetch and 15-minute polling
  useEffect(() => {
    fetchTodayEvents()
    
    // Refresh events every 15 minutes
    const interval = setInterval(fetchTodayEvents, 15 * 60 * 1000)
    
    // Also refresh if the user manually adds/deletes an event
    const handleUpdate = () => fetchTodayEvents()
    window.addEventListener('calendar-updated', handleUpdate)

    return () => {
      clearInterval(interval)
      window.removeEventListener('calendar-updated', handleUpdate)
    }
  }, [])

  const speakRef = useRef(handleSend)
  useEffect(() => {
    speakRef.current = handleSend
  }, [handleSend])

  // 2. 10-Second Polling for Thresholds
  useEffect(() => {
    if (events.length === 0) return

    const checkInterval = setInterval(() => {
      const now = new Date()
      
      // Group events by diffMins
      const groupedEvents: Record<number, any[]> = {}
      
      events.forEach(event => {
        if (!event.start?.dateTime) return // skip all-day events

        const eventTime = new Date(event.start.dateTime)
        const diffMs = eventTime.getTime() - now.getTime()
        const diffMins = Math.round(diffMs / 60000)

        // Thresholds we want to alert on: 5 mins, 2 mins, and 0 mins
        const alertThresholds = [5, 2, 0]

        if (alertThresholds.includes(diffMins)) {
          if (!groupedEvents[diffMins]) groupedEvents[diffMins] = []
          groupedEvents[diffMins].push(event)
        }
      })

      // Process grouped alerts
      for (const [minsStr, evs] of Object.entries(groupedEvents)) {
        const diffMins = parseInt(minsStr, 10)
        
        // Filter out events that were already notified for this threshold
        const newEvs = evs.filter(ev => {
          const id = ev.id
          if (!notifiedRef.current[id]) notifiedRef.current[id] = []
          if (!notifiedRef.current[id].includes(diffMins)) {
            notifiedRef.current[id].push(diffMins)
            return true
          }
          return false
        })

        if (newEvs.length > 0) {
          const timeWord = diffMins === 0 ? "right now" : `in ${diffMins} minute${diffMins > 1 ? 's' : ''}`
          
          let announcement = ""
          if (newEvs.length === 1) {
            announcement = `Sir, your scheduled event, ${newEvs[0].summary}, starts ${timeWord}.`
          } else {
            const summaries = newEvs.map(e => e.summary).join(" and ")
            announcement = `Sir, you have ${newEvs.length} events starting ${timeWord}: ${summaries}.`
          }

          if (speakRef.current) {
            speakRef.current(announcement)
          }
        }
      }
    }, 10000)

    return () => clearInterval(checkInterval)
  }, [events])
}
