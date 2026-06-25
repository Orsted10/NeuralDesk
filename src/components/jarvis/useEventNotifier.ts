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

  const handleSendRef = useRef(handleSend)
  useEffect(() => {
    handleSendRef.current = handleSend
  }, [handleSend])

  // 2. 10-Second Polling for Thresholds
  useEffect(() => {
    if (events.length === 0) return

    const checkInterval = setInterval(() => {
      const now = new Date()
      
      events.forEach(event => {
        if (!event.start?.dateTime) return // skip all-day events

        const eventTime = new Date(event.start.dateTime)
        const diffMs = eventTime.getTime() - now.getTime()
        const diffMins = Math.round(diffMs / 60000)

        // Thresholds we want to alert on: 5 mins, 3 mins, 2 mins, 1 min
        const alertThresholds = [5, 3, 2, 1]

        if (alertThresholds.includes(diffMins)) {
          const id = event.id
          if (!notifiedRef.current[id]) {
            notifiedRef.current[id] = []
          }

          // If we haven't notified for this specific threshold yet
          if (!notifiedRef.current[id].includes(diffMins)) {
            notifiedRef.current[id].push(diffMins)

            // Trigger AI!
            const prompt = `<system>ALARM: The scheduled event "${event.summary}" starts in ${diffMins} minute${diffMins > 1 ? 's' : ''}. Autonomously inform the user right now in a brief, urgent JARVIS-style voice announcement without asking for commands.</system>`
            
            if (handleSendRef.current) {
              handleSendRef.current(prompt)
            }
          }
        }
      })
    }, 10000)

    return () => clearInterval(checkInterval)
  }, [events])
}
