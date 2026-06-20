'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquare, Send, X, Phone, User, Clock, Link2 } from 'lucide-react'
import WhatsAppLink from './WhatsAppLink'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { HUDCard, StatusIndicator } from './HUD'
import { toast } from 'sonner'

export default function WhatsAppModule({ onClose }: { onClose?: () => void }) {
  const [to, setTo] = useState('')
  const [message, setMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [contacts, setContacts] = useState<any[]>([])
  const [isLoadingContacts, setIsLoadingContacts] = useState(true)
  const [showPairing, setShowPairing] = useState(false)

  // Dynamic templates based on context
  const quickTemplates = [
    "Mission accomplished. Heading back to base.",
    "Status report: All systems nominal.",
    "Emergency protocol initiated. Please advise."
  ]

  useEffect(() => {
    async function fetchContacts() {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data } = await supabase.from('contacts').select('*').order('name')
      if (data) setContacts(data)
      setIsLoadingContacts(false)
    }
    fetchContacts()
  }, [])

  const handleSend = async () => {
    if (!to || !message) {
      toast.error('Sir, recipient and message are required.')
      return
    }

    setIsSending(true)
    try {
      const instanceName = localStorage.getItem('jarvis_wa_instance')
      const res = await fetch('/api/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, message, instanceName }),
      })

      if (!res.ok) throw new Error('Communication link failure.')

      toast.success('WhatsApp dispatched, Sir.')
      setMessage('')
    } catch (error) {
      toast.error('Failed to dispatch WhatsApp message.')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="w-full max-w-2xl"
    >
      <AnimatePresence mode="wait">
        {showPairing ? (
          <WhatsAppLink key="pairing" onClose={() => setShowPairing(false)} />
        ) : (
          <HUDCard key="messaging" title="Secure Messaging Uplink">
            <div className="space-y-6 p-2">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[10px] text-cyan-500/40 uppercase tracking-widest">Neural Link Ready</span>
                  </div>
                  <button 
                    onClick={() => setShowPairing(true)}
                    className="flex items-center gap-1 text-[9px] uppercase tracking-tighter text-cyan-400 bg-cyan-400/10 px-2 py-0.5 rounded border border-cyan-400/30 hover:bg-cyan-400/20 transition-colors"
                  >
                    <Link2 className="w-3 h-3" /> Authorize Session
                  </button>
                </div>
                {onClose && (
                  <button onClick={onClose} className="text-cyan-500/40 hover:text-cyan-400">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase text-cyan-500/60 flex items-center gap-2 font-mono">
                    <Phone className="w-3 h-3" /> Secure Line
                  </label>
                  <Input 
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    placeholder="+919876543210"
                    className="bg-black/40 border-cyan-500/20 text-cyan-300 focus:border-cyan-400 font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase text-cyan-500/60 flex items-center gap-2 font-mono">
                    <User className="w-3 h-3" /> Encrypted Contacts
                  </label>
                  <select 
                    onChange={(e) => setTo(e.target.value)}
                    className="w-full bg-black/40 border border-cyan-500/20 rounded-md p-2 text-xs text-cyan-300 focus:border-cyan-400 outline-none font-mono"
                  >
                    <option value="">{isLoadingContacts ? 'Syncing...' : 'Select Contact'}</option>
                    {contacts.map(c => (
                      <option key={c.id} value={c.phone}>{c.name} ({c.relationship})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase text-cyan-500/60 font-mono">Mission Templates</label>
                <div className="flex flex-wrap gap-2">
                  {quickTemplates.map((t, i) => (
                    <button
                      key={i}
                      onClick={() => setMessage(t)}
                      className="text-[10px] bg-cyan-500/5 border border-cyan-500/20 px-2 py-1 rounded hover:bg-cyan-500/20 transition-all text-cyan-400 font-mono"
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase text-cyan-500/60 font-mono">Command String</label>
                <textarea 
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  className="w-full bg-black/40 border border-cyan-500/20 rounded-md p-3 text-cyan-300 text-sm focus:outline-none focus:border-cyan-400 scrollbar-thin font-mono"
                  placeholder="Enter message text, Sir..."
                />
              </div>

              <div className="flex justify-between items-center pt-2">
                <div className="flex gap-4 text-[9px] uppercase tracking-widest text-cyan-500/20 font-mono">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> E2E Encrypted</span>
                  <span>Priority: Alpha</span>
                </div>
                <Button 
                  onClick={handleSend}
                  disabled={isSending}
                  className="bg-green-500/20 border border-green-500/50 hover:bg-green-500/40 text-green-400 flex gap-2 uppercase tracking-widest text-xs py-6 px-8 glow-border"
                >
                  <Send className="w-4 h-4" />
                  Transmit
                </Button>
              </div>
            </div>
          </HUDCard>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
