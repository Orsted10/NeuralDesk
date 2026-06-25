'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Mail, Send, Sparkles, Loader2, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { HUDCard } from './HUD'
import { toast } from 'sonner'

export default function EmailModule({ onClose, initialView = 'compose' }: { onClose?: () => void, initialView?: 'compose' | 'inbox' }) {
  const [to, setTo] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isDrafting, setIsDrafting] = useState(false)
  const [view, setView] = useState<'compose' | 'inbox'>(initialView)
  const [expandedEmailId, setExpandedEmailId] = useState<string | null>(null)
  const [emails, setEmails] = useState<any[]>([])
  const [isLoadingEmails, setIsLoadingEmails] = useState(false)

  const loadInbox = async () => {
    setIsLoadingEmails(true)
    try {
      const res = await fetch('/api/gmail')
      const data = await res.json()
      if (data.emails) {
        setEmails(data.emails)
      }
    } catch (e) {
      toast.error('Failed to access secure inbox.')
    } finally {
      setIsLoadingEmails(false)
    }
  }

  useEffect(() => {
    if (view === 'inbox') {
      loadInbox()
    }
  }, [view])

  const sendEmailDirectly = async (targetTo: string, targetSubject: string, targetBody: string) => {
    setIsSending(true)
    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: targetTo, subject: targetSubject, html: targetBody.replace(/\n/g, '<br>') }),
      })

      if (!res.ok) throw new Error('Communication failure.')

      toast.success('Message dispatched successfully, Sir.', { icon: '📧' })
      setTo('')
      setSubject('')
      setBody('')
      onClose?.()
    } catch (error) {
      toast.error('Failed to dispatch message.')
    } finally {
      setIsSending(false)
    }
  }

  // Intercept any pending email drafted by JARVIS
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).pendingEmailData) {
      const { to: pTo, subject: pSubject, body: pBody } = (window as any).pendingEmailData
      ;(window as any).pendingEmailData = undefined
      if (pTo) setTo(pTo)
      if (pSubject) setSubject(pSubject)
      if (pBody) setBody(pBody)
      
      if (pTo && pSubject && pBody) {
        sendEmailDirectly(pTo, pSubject, pBody)
      }
    }

    const handleSendEmailEvent = (e: CustomEvent) => {
      const { to: pTo, subject: pSubject, body: pBody } = e.detail || {}
      if (pTo) setTo(pTo)
      if (pSubject) setSubject(pSubject)
      if (pBody) setBody(pBody || '')

      if (pTo && pSubject && pBody) {
        sendEmailDirectly(pTo, pSubject, pBody)
      }
    }

    window.addEventListener('send-email' as any, handleSendEmailEvent)
    return () => window.removeEventListener('send-email' as any, handleSendEmailEvent)
  }, [])

  const handleSend = async () => {
    if (!to || !subject || !body) {
      toast.error('Sir, please complete all fields.')
      return
    }

    await sendEmailDirectly(to, subject, body)
  }

  const generateDraft = async () => {
    if (!subject) {
      toast.error('Sir, please provide a subject for context.')
      return
    }

    setIsDrafting(true)
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Write a professional email body for the subject: "${subject}". Keep it concise and formal.`,
          history: [],
          provider: 'openai'
        }),
      })

      if (!res.ok) throw new Error('AI drafting failed.')

      const reader = res.body?.getReader()
      if (!reader) throw new Error('No reader')

      let draft = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        draft += new TextDecoder().decode(value)
        setBody(draft)
      }
    } catch (error) {
      toast.error('AI could not generate a draft.')
    } finally {
      setIsDrafting(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-2xl"
    >
      <HUDCard title="Email Dispatch System">
        <div className="space-y-4 p-2">
           <div className="flex justify-between items-center mb-2 border-b border-cyan-500/20 pb-2">
             <div className="flex gap-4">
               <button 
                 onClick={() => setView('compose')} 
                 className={`text-[10px] uppercase tracking-widest px-2 py-1 rounded transition-colors ${view === 'compose' ? 'bg-cyan-500/20 text-cyan-300' : 'text-cyan-500/40 hover:text-cyan-400'}`}
               >
                 Compose
               </button>
               <button 
                 onClick={() => setView('inbox')} 
                 className={`text-[10px] uppercase tracking-widest px-2 py-1 rounded transition-colors ${view === 'inbox' ? 'bg-cyan-500/20 text-cyan-300' : 'text-cyan-500/40 hover:text-cyan-400'}`}
               >
                 Inbox (Unread)
               </button>
             </div>
             {onClose && (
               <button onClick={onClose} className="text-cyan-500/40 hover:text-cyan-400">
                 <X className="w-4 h-4" />
               </button>
             )}
          </div>

          {view === 'inbox' ? (
            <div className="space-y-4 max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-cyan-500/20 pr-2">
              {isLoadingEmails ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-cyan-500/50" />
                </div>
              ) : emails.length === 0 ? (
                <div className="text-center text-xs uppercase tracking-widest text-cyan-500/40 py-8">
                  Inbox is clear, Sir.
                </div>
              ) : (
                emails.map((email) => (
                  <div 
                    key={email.id} 
                    onClick={() => setExpandedEmailId(expandedEmailId === email.id ? null : email.id)}
                    className="bg-black/40 border border-cyan-500/20 p-3 rounded-md hover:border-cyan-500/50 transition-colors cursor-pointer"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-[10px] text-cyan-500/60 uppercase truncate max-w-[200px]">{email.from}</span>
                      <span className="text-[9px] text-cyan-500/40">{email.date.substring(0, 16)}</span>
                    </div>
                    <div className="text-xs text-cyan-300 font-bold mb-1 truncate">{email.subject}</div>
                    {expandedEmailId === email.id ? (
                      <div className="text-xs text-cyan-100 mt-2 whitespace-pre-wrap leading-relaxed border-t border-cyan-500/20 pt-2">
                        {email.body || email.snippet}
                      </div>
                    ) : (
                      <div className="text-[10px] text-cyan-500/50 line-clamp-2">{email.snippet}</div>
                    )}
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
            <label className="text-[10px] uppercase text-cyan-500/60">Recipient</label>
            <Input 
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="sir.recipient@example.com"
              className="bg-black/40 border-cyan-500/20 text-cyan-300 focus:border-cyan-400"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] uppercase text-cyan-500/60">Subject</label>
            <Input 
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Mission Objective"
              className="bg-black/40 border-cyan-500/20 text-cyan-300 focus:border-cyan-400"
            />
          </div>

          <div className="space-y-2 relative">
            <label className="text-[10px] uppercase text-cyan-500/60 flex justify-between">
              Body
              <button 
                onClick={generateDraft}
                disabled={isDrafting}
                className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                {isDrafting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                <span>AI Draft</span>
              </button>
            </label>
            <textarea 
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={6}
              className="w-full bg-black/40 border border-cyan-500/20 rounded-md p-3 text-cyan-300 text-sm focus:outline-none focus:border-cyan-400 scrollbar-thin scrollbar-thumb-cyan-500/20"
              placeholder="Compose your message here, Sir..."
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button 
              onClick={handleSend}
              disabled={isSending}
              className="bg-cyan-500/20 border border-cyan-500/50 hover:bg-cyan-500/40 text-cyan-400 flex gap-2 uppercase tracking-widest text-xs py-6 px-8 glow-border"
            >
              {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Dispatch
              </Button>
            </div>
            </div>
          )}
        </div>
      </HUDCard>
    </motion.div>
  )
}
