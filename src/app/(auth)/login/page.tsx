'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export default function LoginPage() {
  const [text, setText] = useState('')
  const fullText = 'JARVIS SYSTEM ONLINE'
  const supabase = createClient()

  useEffect(() => {
    let i = 0
    const interval = setInterval(() => {
      setText(fullText.slice(0, i))
      i++
      if (i > fullText.length) clearInterval(interval)
    }, 100)

    // Check if user is already logged in or if implicit flow redirects here
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        window.location.href = '/dashboard'
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        window.location.href = '/dashboard'
      }
    })

    return () => {
      clearInterval(interval)
      subscription.unsubscribe()
    }
  }, [])

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        scopes: 'https://mail.google.com/ https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/youtube.force-ssl https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/games',
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  return (
    <main className="min-h-screen w-full flex items-center justify-center bg-[#0a0a0f] relative overflow-hidden grid-bg">
      {/* Scanline effect */}
      <div className="scanline" />

      {/* Animated HUD Rings */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          className="absolute w-[500px] h-[500px] border-[1px] border-cyan-500/20 rounded-full border-dashed"
        />
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
          className="absolute w-[400px] h-[400px] border-[2px] border-cyan-500/30 rounded-full border-dotted"
        />
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute w-[300px] h-[300px] border-[1px] border-cyan-500/10 rounded-full bg-cyan-500/5 shadow-[0_0_50px_rgba(0,242,255,0.05)]"
        />
      </div>

      <Card className="relative z-20 w-full max-w-md p-8 bg-black/40 backdrop-blur-md border-cyan-500/50 glow-border flex flex-col items-center gap-8">
        <div className="text-center space-y-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xs uppercase tracking-[0.5em] text-cyan-500/60 mb-2"
          >
            Authentication Required
          </motion.div>
          <h1 className="text-3xl font-bold tracking-tighter glow-text h-10">
            {text}
            <motion.span
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.5, repeat: Infinity }}
              className="inline-block w-1 h-8 bg-cyan-400 ml-1 align-middle"
            />
          </h1>
          <p className="text-cyan-500/40 text-sm">Welcome back, Sir. Please identify yourself.</p>
        </div>

        <div className="w-full space-y-4">
          <Button
            onClick={handleLogin}
            className="w-full bg-transparent border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/20 hover:text-cyan-300 transition-all duration-300 glow-border py-6 text-lg tracking-widest uppercase font-bold"
          >
            <span className="mr-2">Initiate Google Login</span>
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
               <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
               <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
               <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
               <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
          </Button>
        </div>

        <div className="flex gap-4 w-full text-[10px] uppercase tracking-widest text-cyan-500/30 justify-between">
          <span>Encrypted Session</span>
          <span>SRV-7700-JARVIS</span>
        </div>
      </Card>

      {/* Decorative corner brackets */}
      <div className="absolute top-10 left-10 w-20 h-20 border-t-2 border-l-2 border-cyan-500/30" />
      <div className="absolute top-10 right-10 w-20 h-20 border-t-2 border-r-2 border-cyan-500/30" />
      <div className="absolute bottom-10 left-10 w-20 h-20 border-b-2 border-l-2 border-cyan-500/30" />
      <div className="absolute bottom-10 right-10 w-20 h-20 border-b-2 border-r-2 border-cyan-500/30" />
    </main>
  )
}
