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
      if (typeof window !== 'undefined' && (window as any).jarvisDesktop) {
        // Desktop native whatsapp
        const result = await (window as any).jarvisDesktop.sendWhatsappMessage(to, message)
        if (result && result.success === false) {
           throw new Error(result.error)
        }
      } else {
        // Web fallback (Evolution API)
        const instanceName = localStorage.getItem('jarvis_wa_instance')
        const res = await fetch('/api/whatsapp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to, message, instanceName }),
        })
        if (!res.ok) throw new Error('Communication link failure.')
      }

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
          <HUDCard key="messaging" title="WhatsApp Messaging">
            <div className="space-y-6 p-4">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs text-emerald-500 font-medium">Session Active</span>
                  </div>
                  <button 
                    onClick={() => setShowPairing(true)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-indigo-400 bg-indigo-500/10 px-3 py-1.5 rounded-xl transition-all hover:bg-indigo-500/20"
                  >
                    <Link2 className="w-3.5 h-3.5" /> Link Device
                  </button>
                </div>
                {onClose && (
                  <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 hover:bg-white/10 p-2 rounded-full transition-all">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-400 ml-1 flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5" /> Mobile Number
                  </label>
                  <Input 
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    placeholder="+1 234 567 8900"
                    className="glass-input h-12 px-4 text-zinc-200 placeholder:text-zinc-600 focus-visible:ring-1 focus-visible:ring-indigo-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-400 ml-1 flex items-center gap-2">
                    <User className="w-3.5 h-3.5" /> Contacts Directory
                  </label>
                  <select 
                    onChange={(e) => setTo(e.target.value)}
                    className="w-full glass-input h-12 px-4 rounded-xl text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 appearance-none cursor-pointer"
                  >
                    <option value="" className="bg-zinc-900 text-zinc-300">{isLoadingContacts ? 'Loading contacts...' : 'Select Contact'}</option>
                    {contacts.map(c => (
                      <option key={c.id} value={c.phone} className="bg-zinc-900 text-zinc-300">{c.name} ({c.relationship})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-400 ml-1">Quick Replies</label>
                <div className="flex flex-wrap gap-2">
                  {quickTemplates.map((t, i) => (
                    <button
                      key={i}
                      onClick={() => setMessage(t)}
                      className="text-xs font-medium px-3 py-1.5 rounded-lg border border-white/10 text-zinc-300 bg-white/5 hover:bg-white/10 transition-all"
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-400 ml-1">Message</label>
                <textarea 
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  className="w-full glass-input rounded-xl p-4 text-zinc-200 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 scrollbar-thin scrollbar-thumb-white/10 placeholder:text-zinc-600"
                  placeholder="Type your message..."
                />
              </div>

              <div className="flex justify-between items-center pt-2">
                <div className="flex gap-4 text-xs font-medium text-zinc-500">
                  <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> End-to-End Encrypted</span>
                </div>
                <Button 
                  onClick={handleSend}
                  disabled={isSending}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold flex gap-2 text-sm py-6 px-8 rounded-xl shadow-lg transition-all"
                >
                  <Send className="w-4 h-4" />
                  Send Message
                </Button>
              </div>
            </div>
          </HUDCard>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
