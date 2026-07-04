'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { QrCode, CheckCircle, RefreshCcw, Wifi, X, ShieldCheck } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { HUDCard } from './HUD'

export default function WhatsAppLink({ onClose }: { onClose?: () => void }) {
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'pairing' | 'connected' | 'error'>('idle')
  const [instanceName, setInstanceName] = useState<string | null>(null)

  const API_URL = process.env.NEXT_PUBLIC_WA_API_URL
  const API_KEY = process.env.NEXT_PUBLIC_WA_API_KEY

  // Initialize or resume instance
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).jarvisDesktop) {
       checkStatus('desktop')
       return
    }
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
      if (name === 'desktop' && typeof window !== 'undefined' && (window as any).jarvisDesktop) {
         const ready = await (window as any).jarvisDesktop.whatsappReady()
         if (ready) {
           setStatus('connected')
         } else {
           setStatus('idle')
         }
         return
      }

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
    setStatus('pairing')
    if (typeof window !== 'undefined' && (window as any).jarvisDesktop) {
       // Desktop mode
       const ready = await (window as any).jarvisDesktop.whatsappReady()
       if (ready) {
         setStatus('connected')
         return
       }
       const qr = await (window as any).jarvisDesktop.getWhatsappQr()
       if (qr) {
         setQrCode(qr)
       }
       // Listen for updates
       ;(window as any).jarvisDesktop.onWhatsappQr((newQr: string) => {
         setQrCode(newQr)
       })
       return
    }

    if (!instanceName) return
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
    <HUDCard title="WhatsApp Secure Link">
      <div className="p-8 flex flex-col items-center justify-center space-y-8 min-h-[350px]">
        <div className="flex justify-between w-full items-center mb-4">
           <div className="flex items-center gap-2.5">
              <div className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.5)]'}`} />
              <span className="text-xs font-semibold tracking-wide text-zinc-400">
                {status === 'connected' ? 'Secure Link Active' : 'Device Link Required'}
              </span>
           </div>
           {onClose && (
             <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 hover:bg-white/10 p-2 rounded-full transition-all">
               <X className="w-4 h-4" />
             </button>
           )}
        </div>

        <AnimatePresence mode="wait">
          {status === 'idle' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center space-y-6 w-full max-w-sm"
            >
              <div className="p-8 border border-white/5 bg-white/[0.02] rounded-3xl shadow-inner">
                <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center mx-auto mb-4">
                  <Wifi className="w-8 h-8 text-indigo-400" />
                </div>
                <p className="text-sm text-zinc-400 font-medium leading-relaxed px-4">
                  Establish a secure, end-to-end encrypted connection with your device.
                </p>
              </div>
              <button
                onClick={startPairing}
                className="w-full py-4 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold transition-all rounded-xl shadow-lg active:scale-95"
              >
                Initialize Connection
              </button>
            </motion.div>
          )}

          {status === 'pairing' && qrCode && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative flex flex-col items-center gap-6"
            >
              <div className="p-4 bg-white rounded-3xl shadow-2xl">
                {qrCode.startsWith('data:image') ? (
                  <img src={qrCode} alt="Scan QR" className="w-48 h-48 rounded-xl" />
                ) : (
                  <div className="flex justify-center p-2"><QRCodeSVG value={qrCode} size={180} /></div>
                )}
              </div>
              <div className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
                Waiting for scan...
              </div>
            </motion.div>
          )}

          {status === 'connected' && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center space-y-6 w-full max-w-sm"
            >
              <div className="relative inline-block mt-4">
                <div className="absolute inset-0 bg-emerald-500/20 blur-2xl rounded-full" />
                <ShieldCheck className="w-24 h-24 text-emerald-400 relative z-10" />
              </div>
              <div className="space-y-2">
                <div className="text-emerald-400 font-semibold text-lg tracking-tight">Device Linked Successfully</div>
                <div className="text-zinc-500 text-xs font-mono bg-black/20 py-2 px-4 rounded-lg inline-block border border-white/5">
                  ID: {instanceName}
                </div>
              </div>
              <button
                onClick={onClose}
                className="mt-4 px-8 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 text-sm font-semibold transition-all rounded-xl active:scale-95"
              >
                Return to Dashboard
              </button>
            </motion.div>
          )}

          {status === 'pairing' && !qrCode && (
            <motion.div className="flex flex-col items-center gap-4 py-12">
               <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center">
                 <RefreshCcw className="w-6 h-6 text-indigo-400 animate-spin" />
               </div>
               <span className="text-sm font-medium text-zinc-400">Generating secure key...</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </HUDCard>
  )
}
