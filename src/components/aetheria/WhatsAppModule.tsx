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
    "Sounds good, see you soon!",
    "I'm on my way.",
    "Give me 5 minutes.",
    "Can't talk right now, I'll call you later."
  ]

  useEffect(() => {
    async function fetchContacts() {
      if (typeof window !== 'undefined' && (window as any).aetheriaDesktop) {
        const desktopContacts = await (window as any).aetheriaDesktop.getWhatsappContacts()
        const uniqueContacts = desktopContacts.filter((v: any, i: number, a: any[]) => a.findIndex(v2 => (v2.name === v.name)) === i)
        setContacts(uniqueContacts)
      } else {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        const { data } = await supabase.from('contacts').select('*').order('name')
        if (data) setContacts(data)
      }
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
      if (typeof window !== 'undefined' && (window as any).aetheriaDesktop) {
        // Desktop native whatsapp
        const result = await (window as any).aetheriaDesktop.sendWhatsappMessage(to, message)
        if (result && result.success === false) {
           throw new Error(result.error)
        }
      } else {
        // Web fallback (Evolution API)
        const instanceName = localStorage.getItem('aetheria_wa_instance')
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="w-full h-full glass-panel rounded-t-3xl lg:rounded-3xl shadow-2xl flex flex-col relative overflow-hidden mt-auto lg:mt-0 border-none"
    >
      <AnimatePresence mode="wait">
        {showPairing ? (
          <WhatsAppLink key="pairing" onClose={() => setShowPairing(false)} />
        ) : (
          <>
            <div className="p-6 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">WhatsApp Messaging</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider">Session Active</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setShowPairing(true)}
                  className="flex items-center gap-1.5 text-xs font-bold text-indigo-400 bg-indigo-500/10 px-4 py-2 rounded-xl transition-all hover:bg-indigo-500/20 uppercase tracking-wider"
                >
                  <Link2 className="w-4 h-4" /> Link Device
                </button>
                {onClose && (
                  <button onClick={onClose} className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-lg transition-all">
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-6 scrollbar-thin scrollbar-thumb-border flex flex-col">
              <div className="flex-1 glass-card rounded-2xl p-6">

              <div className="bg-emerald-500/10 border-b border-emerald-500/20 px-6 py-2 text-xs text-emerald-500 font-medium flex items-center gap-2 -mx-6 mb-6">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Mobile Sync Active: Ensure AetheriaCompute Desktop is running on your home network for WhatsApp background services.
              </div>

              <div className="grid grid-cols-2 gap-6 mb-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1 flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5" /> Mobile Number
                  </label>
                  <Input 
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    placeholder="+1 234 567 8900"
                    className="glass-input h-12 px-4 text-foreground placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-indigo-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1 flex items-center gap-2">
                    <User className="w-3.5 h-3.5" /> Contacts Directory
                  </label>
                  <select 
                    onChange={(e) => setTo(e.target.value)}
                    className="w-full glass-input h-12 px-4 rounded-xl text-foreground bg-background focus:outline-none focus:ring-1 focus:ring-indigo-500 appearance-none cursor-pointer"
                  >
                    <option value="">{isLoadingContacts ? 'Loading contacts...' : 'Select Contact'}</option>
                    {contacts.map(c => (
                      <option key={c.id || c.number} value={c.number || c.phone}>{c.name} {c.relationship ? `(${c.relationship})` : ''}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2 mb-6">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Quick Replies</label>
                <div className="flex flex-wrap gap-2">
                  {quickTemplates.map((t, i) => (
                    <button
                      key={i}
                      onClick={() => setMessage(t)}
                      className="text-xs font-medium px-4 py-2 rounded-xl border border-border text-foreground bg-secondary/30 hover:bg-secondary transition-all"
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2 mb-6">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Message</label>
                <textarea 
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  className="w-full glass-input rounded-xl p-4 text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 scrollbar-thin scrollbar-thumb-border placeholder:text-muted-foreground"
                  placeholder="Type your message..."
                />
              </div>

              <div className="flex justify-between items-center border-t border-border pt-6 mt-auto">
                <div className="flex gap-4 text-xs font-medium text-emerald-500 uppercase tracking-wider font-bold">
                  <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> End-to-End Encrypted</span>
                </div>
                <Button 
                  onClick={handleSend}
                  disabled={isSending}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold tracking-wider uppercase flex gap-2 text-xs py-5 px-8 rounded-xl shadow-lg transition-all"
                >
                  <Send className="w-4 h-4" />
                  Send Message
                </Button>
              </div>
              </div>
            </div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
