'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquare, Send, X, Phone, User, Clock, Link2, Search, RefreshCw, CreditCard } from 'lucide-react'
import WhatsAppLink from './WhatsAppLink'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export default function WhatsAppModule({ onClose }: { onClose?: () => void }) {
  const [to, setTo] = useState('')
  const [contactSearch, setContactSearch] = useState('')
  const [message, setMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [contacts, setContacts] = useState<any[]>([])
  const [filteredContacts, setFilteredContacts] = useState<any[]>([])
  const [showContactDropdown, setShowContactDropdown] = useState(false)
  const [isLoadingContacts, setIsLoadingContacts] = useState(true)
  const [isLoadingChats, setIsLoadingChats] = useState(false)
  const [showPairing, setShowPairing] = useState(false)
  const [activeTab, setActiveTab] = useState<'compose' | 'chats' | 'upi'>('compose')
  const [chats, setChats] = useState<any[]>([])
  const searchRef = useRef<HTMLDivElement>(null)
  
  // UPI State — auto-populated from contact
  const [upiContact, setUpiContact] = useState('')
  const [upiContactObj, setUpiContactObj] = useState<any>(null)  // stores full contact {name, number, id}
  const [upiContactSearch, setUpiContactSearch] = useState('')
  const [showUpiDropdown, setShowUpiDropdown] = useState(false)
  const [upiAmount, setUpiAmount] = useState('')
  const [upiNote, setUpiNote] = useState('')
  const [upiManualId, setUpiManualId] = useState('')  // for manual UPI ID override

  const quickTemplates = [
    "Sounds good, see you soon!",
    "I'm on my way.",
    "Give me 5 minutes.",
    "Can't talk right now, I'll call you later."
  ]

  // Load contacts FAST — parallel fetch
  useEffect(() => {
    async function fetchContacts() {
      setIsLoadingContacts(true)
      if (typeof window !== 'undefined' && (window as any).aetheriaDesktop) {
        try {
          const desktopContacts = await (window as any).aetheriaDesktop.getWhatsappContacts()
          const unique = desktopContacts
            .filter((c: any) => c.name && c.name.trim() !== '')
            .filter((v: any, i: number, a: any[]) => a.findIndex(v2 => v2.name === v.name) === i)
            .sort((a: any, b: any) => a.name.localeCompare(b.name))
          setContacts(unique)
        } catch(e) { console.error('Failed to load contacts', e) }
      } else {
        try {
          const { createClient } = await import('@/lib/supabase/client')
          const supabase = createClient()
          const { data } = await supabase.from('contacts').select('*').order('name')
          if (data) setContacts(data)
        } catch(e) {}
      }
      setIsLoadingContacts(false)
    }
    fetchContacts()
  }, [])

  // Real-time contact search filter
  useEffect(() => {
    if (!contactSearch.trim()) { setFilteredContacts([]); return }
    const q = contactSearch.toLowerCase()
    setFilteredContacts(contacts.filter(c => (c.name || '').toLowerCase().includes(q)).slice(0, 8))
    setShowContactDropdown(true)
  }, [contactSearch, contacts])

  // UPI contact search
  const upiFilteredContacts = upiContactSearch.trim()
    ? contacts.filter(c => (c.name || '').toLowerCase().includes(upiContactSearch.toLowerCase())).slice(0, 6)
    : []

  // Load chats FAST — parallel using Promise.allSettled
  const loadChats = async () => {
    setIsLoadingChats(true)
    try {
      if (typeof window !== 'undefined' && (window as any).aetheriaDesktop) {
        const res = await (window as any).aetheriaDesktop.getWhatsappRecentChats()
        if (res?.success) setChats(res.messages || [])
        else toast.error('Sync failed: ' + (res?.error || 'unknown'))
      } else {
        // Try local bridge for Web
        const ping = await fetch('http://localhost:3333/ping').catch(() => null)
        if (ping && ping.ok) {
          const res = await fetch('http://localhost:3333/api/whatsapp/chats').then(r => r.json())
          if (res.success) setChats(res.messages || [])
        }
      }
    } catch(e) { toast.error('Could not reach WhatsApp engine') }
    setIsLoadingChats(false)
  }

  // Auto-load chats when contacts are ready (desktop only)
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).aetheriaDesktop) {
      loadChats()
    }
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
        // Web fallback - try local bridge first
        let usedBridge = false
        try {
          const ping = await fetch('http://localhost:3333/ping').catch(() => null)
          if (ping && ping.ok) {
            const bridgeRes = await fetch('http://localhost:3333/api/whatsapp/send', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ to, message })
            })
            if (!bridgeRes.ok) throw new Error('Local bridge failed')
            usedBridge = true
          }
        } catch(e) { console.warn('Local bridge not available') }

        if (!usedBridge) {
          const instanceName = localStorage.getItem('aetheria_wa_instance')
          const res = await fetch('/api/whatsapp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ to, message, instanceName }),
          })
          if (!res.ok) throw new Error('Communication link failure.')
        }
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
          <div className="flex flex-col h-full" key="main">
            <div className="p-6 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">WhatsApp Matrix</h2>
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

            <div className="px-6 pt-4">
              <div className="flex gap-2 bg-white/5 p-1 rounded-xl w-full max-w-sm">
                {(['compose', 'chats', 'upi'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => {
                      setActiveTab(tab)
                      if (tab === 'chats') loadChats()
                    }}
                    className={`flex-1 text-[11px] font-semibold py-1.5 rounded-lg transition-all capitalize ${
                      activeTab === tab 
                        ? 'bg-emerald-500/20 text-emerald-300 shadow-md border border-emerald-500/30' 
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-6 scrollbar-thin scrollbar-thumb-border flex flex-col">
              <div className="flex-1 glass-card rounded-2xl p-6">


              <div className="bg-emerald-500/10 border-b border-emerald-500/20 px-6 py-2 text-xs text-emerald-500 font-medium flex items-center gap-2 -mx-6 mb-6">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Mobile Sync Active: Ensure AetheriaCompute Desktop is running on your home network for WhatsApp background services.
              </div>

              {activeTab === 'compose' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-full">
                  {/* Single smart contact search — shows name, sends by name (backend resolves to number) */}
                  <div className="mb-6 relative" ref={searchRef}>
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1 flex items-center gap-2 mb-2">
                      <Search className="w-3.5 h-3.5" /> Send To
                    </label>
                    <div className="relative">
                      <input
                        value={contactSearch || to}
                        onChange={(e) => {
                          const v = e.target.value
                          setContactSearch(v)
                          setTo(v) // also set to directly for manual numbers
                          if (!v) setShowContactDropdown(false)
                        }}
                        onFocus={() => contactSearch && setShowContactDropdown(true)}
                        placeholder={isLoadingContacts ? `Loading ${contacts.length || '...'} contacts...` : `Search contacts or type number...`}
                        className="w-full h-12 px-4 rounded-xl text-foreground bg-white/5 border border-white/10 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm transition-all"
                      />
                      {isLoadingContacts && <div className="absolute right-4 top-3.5 w-4 h-4 border-2 border-emerald-500/40 border-t-emerald-500 rounded-full animate-spin" />}
                    </div>
                    {showContactDropdown && filteredContacts.length > 0 && (
                      <div className="absolute z-50 top-full mt-1 w-full bg-zinc-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden">
                        {filteredContacts.map((c, i) => (
                            <button key={i} onClick={() => {
                              setTo(c.name)
                              setContactSearch('') // Clear search to prevent useEffect from reopening dropdown
                              setShowContactDropdown(false)
                            }} className="w-full text-left px-4 py-3 hover:bg-white/5 flex items-center gap-3 border-b border-white/5 last:border-0 transition-colors">
                            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-sm flex-shrink-0">
                              {c.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-foreground">{c.name}</div>
                              <div className="text-xs text-zinc-500">{c.number || c.id?.split('@')[0] || 'WhatsApp contact'}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
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

                  <div className="space-y-2 mb-6 flex-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Message</label>
                    <textarea 
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={4}
                      className="w-full glass-input rounded-xl p-4 text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 scrollbar-thin scrollbar-thumb-border placeholder:text-muted-foreground h-full min-h-[100px]"
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
                </motion.div>
              )}

              {activeTab === 'chats' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">All Conversations</h3>
                    <button onClick={loadChats} className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 transition-colors">
                      <RefreshCw className={`w-3.5 h-3.5 ${isLoadingChats ? 'animate-spin' : ''}`} /> Sync Now
                    </button>
                  </div>
                  {isLoadingChats ? (
                    <div className="flex flex-col gap-3">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="bg-white/5 p-4 rounded-xl border border-white/10 animate-pulse">
                          <div className="h-3 bg-white/10 rounded w-1/3 mb-2" />
                          <div className="h-2.5 bg-white/5 rounded w-3/4" />
                        </div>
                      ))}
                    </div>
                  ) : chats.length === 0 ? (
                    <div className="text-center p-12">
                      <MessageSquare className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                      <p className="text-zinc-500 text-sm">No chats loaded yet.</p>
                      <button onClick={loadChats} className="mt-4 text-xs text-emerald-400 hover:underline">Tap to sync now</button>
                    </div>
                  ) : chats.map((c, i) => (
                    <button key={i} onClick={() => { setTo(c.sender); setContactSearch(c.sender); setActiveTab('compose') }}
                      className="w-full text-left bg-white/5 hover:bg-white/10 p-4 rounded-xl border border-white/10 transition-all">
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-semibold text-emerald-400">{c.sender}</span>
                        <span className="text-[10px] text-zinc-500">{c.timestamp}</span>
                      </div>
                      <p className="text-sm text-zinc-400 truncate">{c.body}</p>
                    </button>
                  ))}
                </motion.div>
              )}

              {activeTab === 'upi' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
                  <div className="bg-gradient-to-r from-emerald-500/10 to-indigo-500/10 border border-emerald-500/20 p-4 rounded-xl">
                    <div className="flex items-center gap-2 mb-1">
                      <CreditCard className="w-4 h-4 text-emerald-400" />
                      <h3 className="text-xs font-bold text-emerald-400 uppercase">Aetheria UPI Smart Pay</h3>
                    </div>
                    <p className="text-xs text-zinc-400">Search a contact by name. Aetheria builds the UPI link from their phone number. Enter amount and pay instantly.</p>
                  </div>

                  {/* Smart contact search for UPI */}
                  <div className="relative">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1 mb-2 flex items-center gap-2"><User className="w-3 h-3" /> Pay To</label>
                    <input
                      value={upiContactSearch}
                      onChange={(e) => { setUpiContactSearch(e.target.value); setShowUpiDropdown(true) }}
                      placeholder="Search contact name..."
                      className="w-full h-12 px-4 rounded-xl text-foreground bg-white/5 border border-white/10 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm"
                    />
                    {showUpiDropdown && upiFilteredContacts.length > 0 && (
                      <div className="absolute z-50 top-full mt-1 w-full bg-zinc-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden">
                        {upiFilteredContacts.map((c, i) => {
                          // Build proper 10-digit UPI phone number (strip 91 country code)
                          const rawNum = c.number || c.id?.replace('@c.us', '') || ''
                          const phone10 = rawNum.startsWith('91') && rawNum.length === 12
                            ? rawNum.slice(2)   // 919140135843 -> 9140135843
                            : rawNum.length === 10 ? rawNum : ''
                          const hasPhone = phone10.length === 10
                          return (
                            <button key={i} onClick={() => {
                              setUpiContactSearch(c.name)
                              setUpiContact(c.name)
                              setUpiContactObj(c)
                              setShowUpiDropdown(false)
                              setTo(c.name)
                              setContactSearch(c.name)
                              setUpiManualId('')  // clear any previous manual ID
                              if (hasPhone) toast.success(`Contact found — phone: ${phone10}`)
                              else toast.info('No phone on file — enter UPI ID manually below.')
                            }} className="w-full text-left px-4 py-3 hover:bg-white/5 flex items-center gap-3 border-b border-white/5 last:border-0">
                              <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-sm flex-shrink-0">
                                {c.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="text-sm font-medium">{c.name}</div>
                                <div className="text-xs text-zinc-500">{hasPhone ? `📱 ${phone10}` : 'No phone — enter UPI ID manually'}</div>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* Manual UPI ID override — always visible after contact selection */}
                  {upiContact && (
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                      <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider">ℹ️ Confirm Payment Details</div>
                      {(() => {
                        const rawNum = upiContactObj?.number || upiContactObj?.id?.replace('@c.us', '') || ''
                        const phone10 = rawNum.startsWith('91') && rawNum.length === 12 ? rawNum.slice(2) : rawNum.length === 10 ? rawNum : ''
                        return (
                          <div className="text-xs text-zinc-400 space-y-1">
                            <div>Contact: <span className="text-white font-semibold">{upiContact}</span></div>
                            {phone10 ? (
                              <div>Detected phone: <span className="text-emerald-400 font-mono">{phone10}</span></div>
                            ) : null}
                          </div>
                        )
                      })()}
                      <div>
                        <label className="text-xs text-zinc-500 block mb-1">Select UPI ID or enter manually:</label>
                        <div className="flex gap-2 mb-2 overflow-x-auto pb-1 scrollbar-thin">
                          {(() => {
                            const rawNum = upiContactObj?.number || upiContactObj?.id?.replace('@c.us', '') || ''
                            const phone10 = rawNum.startsWith('91') && rawNum.length === 12 ? rawNum.slice(2) : rawNum.length === 10 ? rawNum : ''
                            if (!phone10) return null
                            return ['@ybl', '@paytm', '@oksbi', '@okhdfcbank', '@okicici', '@ibl'].map(handle => (
                              <button key={handle} onClick={() => setUpiManualId(`${phone10}${handle}`)} className="text-[10px] bg-white/10 hover:bg-white/20 px-2 py-1 rounded border border-white/10 whitespace-nowrap transition-colors">
                                {phone10}{handle}
                              </button>
                            ))
                          })()}
                        </div>
                        <input
                          value={upiManualId}
                          onChange={e => setUpiManualId(e.target.value)}
                          placeholder="e.g. 9876543210@ybl or name@paytm"
                          className="w-full h-10 px-3 rounded-lg text-foreground bg-black/40 border border-white/10 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm font-mono"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Amount (₹)</label>
                    <Input type="number" value={upiAmount} onChange={(e) => setUpiAmount(e.target.value)} placeholder="0.00" className="glass-input mt-1 h-12" />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Note (Optional)</label>
                    <Input value={upiNote} onChange={(e) => setUpiNote(e.target.value)} placeholder="Lunch, Cab, etc..." className="glass-input mt-1 h-12" />
                  </div>

                  <Button
                    onClick={() => {
                      if (!upiContact || !upiAmount) return toast.error('Select a contact and enter amount.')
                      // Resolve final UPI ID
                      let finalVpa = upiManualId.trim()
                      if (!finalVpa) {
                        const rawNum = upiContactObj?.number || upiContactObj?.id?.replace('@c.us', '') || ''
                        const phone10 = rawNum.startsWith('91') && rawNum.length === 12 ? rawNum.slice(2) : rawNum.length === 10 ? rawNum : ''
                        finalVpa = phone10 ? `${phone10}@ybl` : ''  // default to PhonePe (most common in India)
                      }
                      if (!finalVpa) return toast.error('Could not determine UPI ID. Please enter or select it manually.')

                      const link = `upi://pay?pa=${encodeURIComponent(finalVpa)}&pn=${encodeURIComponent(upiContact)}&am=${upiAmount}&cu=INR&tn=${encodeURIComponent(upiNote || 'Payment')}`
                      
                      // Trigger direct payment intent
                      window.location.href = link;
                      
                      toast.success(`Opening UPI App to pay ₹${upiAmount} to ${upiContact}!`)
                    }}
                    className="w-full mt-6 h-12 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.3)] font-semibold tracking-wide transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    <CreditCard className="w-4 h-4" />
                    Pay Now
                  </Button>
                </motion.div>
              )}

              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
