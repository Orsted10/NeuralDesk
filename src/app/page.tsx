import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AuthRedirect from '@/components/aetheria/AuthRedirect'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  }

  return (
    <main className="min-h-screen relative overflow-hidden font-sans">
      <AuthRedirect />
      
      {/* Ambient background gradients */}
      <div className="gradient-blur-bg" />
      <div className="absolute top-0 right-0 w-[50vw] h-[50vw] bg-indigo-500/10 rounded-full blur-[150px] pointer-events-none transform translate-x-1/3 -translate-y-1/3" />
      <div className="absolute bottom-0 left-0 w-[50vw] h-[50vw] bg-purple-500/10 rounded-full blur-[150px] pointer-events-none transform -translate-x-1/3 translate-y-1/3" />

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-8 md:p-24 text-center">
        <div className="glass-panel p-12 md:p-20 rounded-3xl max-w-5xl mx-auto w-full flex flex-col items-center space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">
          
          <div className="space-y-4">
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight">
              <span className="premium-text">Aetheria</span>Compute
            </h1>
            <p className="text-xl md:text-2xl text-zinc-400 font-light tracking-wide">
              The Ambient Compute Engine.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6 w-full max-w-3xl text-left">
            <div className="glass-card p-6 rounded-2xl">
              <h3 className="text-lg font-semibold text-zinc-200 mb-2">Zero-UI Philosophy</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Aetheria anticipates your needs, monitoring your clipboard, peripheral vision, and acoustic environment to act proactively.
              </p>
            </div>
            <div className="glass-card p-6 rounded-2xl">
              <h3 className="text-lg font-semibold text-zinc-200 mb-2">Omnipresent Integration</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Bridging your local OS, WhatsApp, and Google Workspace into a single, seamless, synchronized intelligence node.
              </p>
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-center gap-6 w-full max-w-md">
            <Link 
              href="/login" 
              className="w-full sm:w-auto px-10 py-4 bg-white text-black hover:bg-zinc-200 font-semibold rounded-full transition-all duration-300 shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:shadow-[0_0_30px_rgba(255,255,255,0.25)] hover:-translate-y-0.5"
            >
              Initialize Node
            </Link>
          </div>
          
          <div className="flex gap-6 text-sm pt-4">
            <Link href="/privacy" className="text-zinc-500 hover:text-zinc-300 transition-colors">Privacy Architecture</Link>
            <Link href="/terms" className="text-zinc-500 hover:text-zinc-300 transition-colors">Terms of Synchrony</Link>
          </div>
          
        </div>
      </div>
    </main>
  )
}
