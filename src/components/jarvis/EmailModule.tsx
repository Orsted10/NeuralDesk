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

  // Intercept any pending email drafted by Aetheria
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="w-full h-full glass-panel rounded-t-3xl lg:rounded-3xl shadow-2xl flex flex-col relative overflow-hidden mt-auto lg:mt-0 border-none"
    >
      <div className="p-6 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
            <Mail className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Email Dispatch System</h2>
            <p className="text-xs text-muted-foreground">Secure Communications</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setView('compose')} 
            className={`text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-xl transition-all ${view === 'compose' ? 'bg-indigo-500 text-white shadow-md' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'}`}
          >
            Compose
          </button>
          <button 
            onClick={() => setView('inbox')} 
            className={`text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-xl transition-all ${view === 'inbox' ? 'bg-indigo-500 text-white shadow-md' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'}`}
          >
            Inbox (Unread)
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

          {view === 'inbox' ? (
            <div className="space-y-4 h-full overflow-y-auto scrollbar-thin scrollbar-thumb-border pr-2">
              {isLoadingEmails ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                </div>
              ) : emails.length === 0 ? (
                <div className="text-center text-sm text-muted-foreground font-medium py-8 uppercase tracking-wider">
                  Inbox is clear.
                </div>
              ) : (
                emails.map((email) => (
                  <div 
                    key={email.id} 
                    onClick={() => setExpandedEmailId(expandedEmailId === email.id ? null : email.id)}
                    className="glass-card p-4 rounded-xl cursor-pointer"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs text-zinc-400 font-medium truncate max-w-[200px]">{email.from}</span>
                      <span className="text-[10px] text-zinc-500 font-medium">{email.date.substring(0, 16)}</span>
                    </div>
                    <div className="text-sm text-zinc-200 font-semibold mb-1 truncate">{email.subject}</div>
                    {expandedEmailId === email.id ? (
                      <div className="text-sm text-zinc-400 mt-3 whitespace-pre-wrap leading-relaxed border-t border-white/5 pt-3">
                        {email.body || email.snippet}
                      </div>
                    ) : (
                      <div className="text-xs text-zinc-500 line-clamp-2 leading-relaxed">{email.snippet}</div>
                    )}
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-5">
              <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-400 ml-1">Recipient</label>
            <Input 
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="recipient@example.com"
              className="glass-input h-12 px-4 text-zinc-200 placeholder:text-zinc-600 focus-visible:ring-1 focus-visible:ring-indigo-500"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-400 ml-1">Subject</label>
            <Input 
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Meeting details"
              className="glass-input h-12 px-4 text-zinc-200 placeholder:text-zinc-600 focus-visible:ring-1 focus-visible:ring-indigo-500"
            />
          </div>

          <div className="space-y-2 relative">
            <label className="text-xs font-semibold text-zinc-400 ml-1 flex justify-between">
              Body
              <button 
                onClick={generateDraft}
                disabled={isDrafting}
                className="flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                {isDrafting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                <span>AI Draft</span>
              </button>
            </label>
            <textarea 
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={6}
              className="w-full glass-input rounded-xl p-4 text-zinc-200 text-sm focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-indigo-500 scrollbar-thin scrollbar-thumb-white/10 placeholder:text-zinc-600"
              placeholder="Compose your message here..."
            />
          </div>

          <div className="flex justify-end pt-4">
            <Button 
              onClick={handleSend}
              disabled={isSending}
              className="bg-indigo-500 hover:bg-indigo-600 text-white flex gap-2 font-semibold text-sm py-6 px-8 rounded-xl shadow-lg transition-all"
            >
              {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Dispatch
              </Button>
            </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
