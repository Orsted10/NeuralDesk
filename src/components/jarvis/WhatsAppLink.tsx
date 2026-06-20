'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { QrCode, CheckCircle, RefreshCcw, Wifi, X, ShieldCheck } from 'lucide-react'
import { HUDCard } from './HUD'

export default function WhatsAppLink({ onClose }: { onClose?: () => void }) {
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'pairing' | 'connected' | 'error'>('idle')
  const [instanceName, setInstanceName] = useState<string | null>(null)

  const API_URL = process.env.NEXT_PUBLIC_WA_API_URL
  const API_KEY = process.env.NEXT_PUBLIC_WA_API_KEY

  // Initialize or resume instance
  useEffect(() => {
    const savedInstance = localStorage.getItem('jarvis_wa_instance')
    if (savedInstance) {
      setInstanceName(savedInstance)
      checkStatus(savedInstance)
    } else {
      const newInstance = `user_${Math.random().toString(36).substring(2, 10)}`
      setInstanceName(newInstance)
      localStorage.setItem('jarvis_wa_instance', newInstance)
    }
  }, [])

  const checkStatus = async (name: string) => {
    try {
      const res = await fetch(`${API_URL}/instance/connectionState/${name}`, {
        headers: { 'apikey': API_KEY! }
      })
      const data = await res.json()
      if (data.instance.state === 'open') {
        setStatus('connected')
      } else {
        setStatus('idle')
      }
    } catch (e) {
      setStatus('idle')
    }
  }

  const startPairing = async () => {
    if (!instanceName) return
    setStatus('pairing')
    try {
      // 1. Create Instance
      await fetch(`${API_URL}/instance/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': API_KEY! },
        body: JSON.stringify({
          instanceName: instanceName,
          token: API_KEY,
          number: ""
        })
      })

      // 2. Get QR Code
      const res = await fetch(`${API_URL}/instance/connect/${instanceName}`, {
        headers: { 'apikey': API_KEY! }
      })
      const data = await res.json()
      if (data.base64) {
        setQrCode(data.base64)
      } else {
        // If already connected
        setStatus('connected')
      }
    } catch (error) {
      console.error("Pairing failed", error)
      setStatus('error')
    }
  }

  return (
    <HUDCard title="Neural Link: Private Relay">
      <div className="p-6 flex flex-col items-center justify-center space-y-6 min-h-[300px]">
        <div className="flex justify-between w-full items-center mb-2">
           <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`} />
              <span className="text-[10px] text-cyan-500/60 uppercase tracking-widest font-mono">
                {status === 'connected' ? 'Secure Link Active' : 'Uplink Authorization Required'}
              </span>
           </div>
           {onClose && (
             <button onClick={onClose} className="text-cyan-500/40 hover:text-cyan-400 p-1">
               <X className="w-4 h-4" />
             </button>
           )}
        </div>

        <AnimatePresence mode="wait">
          {status === 'idle' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center space-y-4"
            >
              <div className="p-6 border border-cyan-500/10 bg-cyan-500/5 rounded-2xl">
                <Wifi className="w-12 h-12 text-cyan-500/40 mx-auto mb-2" />
                <p className="text-[11px] text-cyan-400/80 max-w-[200px] font-mono leading-relaxed">
                  Establish a private encrypted bridge to your WhatsApp account.
                </p>
              </div>
              <button
                onClick={startPairing}
                className="w-full py-3 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[10px] uppercase tracking-[0.2em] hover:bg-cyan-500/20 transition-all font-bold rounded-lg"
              >
                Initialize Neural Handshake
              </button>
            </motion.div>
          )}

          {status === 'pairing' && qrCode && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative flex flex-col items-center gap-4"
            >
              <div className="p-3 bg-white rounded-xl shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                <img src={qrCode} alt="Scan QR" className="w-44 h-44" />
              </div>
              <div className="text-[10px] uppercase text-cyan-400 font-mono animate-pulse">
                Scan with your device to sync identity
              </div>
            </motion.div>
          )}

          {status === 'connected' && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center space-y-4"
            >
              <div className="relative inline-block">
                <div className="absolute inset-0 bg-green-500/20 blur-xl rounded-full" />
                <ShieldCheck className="w-20 h-20 text-green-500 relative z-10" />
              </div>
              <div className="space-y-1">
                <div className="text-green-400 font-mono text-sm uppercase tracking-tighter">Identity Verified</div>
                <div className="text-cyan-500/40 font-mono text-[9px] uppercase tracking-widest">Encrypted Tunnel: {instanceName}</div>
              </div>
              <button
                onClick={onClose}
                className="px-6 py-2 border border-green-500/30 text-green-500 text-[9px] uppercase tracking-widest hover:bg-green-500/10 transition-all rounded-full"
              >
                Return to Command Center
              </button>
            </motion.div>
          )}

          {status === 'pairing' && !qrCode && (
            <motion.div className="flex flex-col items-center gap-4">
               <RefreshCcw className="w-10 h-10 text-cyan-500 animate-spin" />
               <span className="text-[10px] text-cyan-500/60 uppercase font-mono">Generating Secure Key...</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </HUDCard>
  )
}
