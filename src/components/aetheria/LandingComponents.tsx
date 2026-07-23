'use client'

import { motion } from 'framer-motion'
import { Brain, Cpu, MessageSquare, Zap, Globe, Lock, Code, Shield } from 'lucide-react'
import Link from 'next/link'

export function HeroSection() {
  return (
    <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 flex flex-col items-center justify-center text-center">

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 space-y-6 max-w-4xl px-4"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-4">
          <Zap className="w-4 h-4" />
          <span>V1.0 is now live</span>
        </div>
        
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tight leading-[1.1]">
          The first <span className="premium-text">ambient</span> compute engine.
        </h1>
        
        <p className="text-xl md:text-2xl text-muted-foreground font-light max-w-2xl mx-auto leading-relaxed">
          Aetheria runs silently in the background, ingesting your digital life across Slack, Notion, and Gmail to become an omnipresent extension of your brain.
        </p>

        <div className="pt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link 
            href="/login" 
            className="w-full sm:w-auto px-8 py-4 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold rounded-full transition-all duration-300 shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:shadow-[0_0_30px_rgba(255,255,255,0.25)] hover:-translate-y-0.5 text-lg"
          >
            Initialize Node
          </Link>
          <a 
            href="#architecture" 
            className="w-full sm:w-auto px-8 py-4 bg-secondary text-secondary-foreground hover:bg-secondary/80 font-semibold rounded-full transition-all duration-300 text-lg"
          >
            View Architecture
          </a>
        </div>
      </motion.div>
    </section>
  )
}

export function FeaturesBentoGrid() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  }

  return (
    <section id="architecture" className="py-24 px-4 max-w-7xl mx-auto">
      <div className="text-center mb-16 space-y-4">
        <h2 className="text-3xl md:text-5xl font-bold tracking-tight">Built for Omnipresence.</h2>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">A true Zero-UI philosophy. No chat boxes unless requested. Aetheria acts proactively.</p>
      </div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        {/* Large Feature Card 1 */}
        <motion.div variants={itemVariants} className="md:col-span-2 glass-card p-8 rounded-3xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center mb-6">
              <Brain className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="text-2xl font-bold mb-3">The Living Brain</h3>
              <p className="text-muted-foreground leading-relaxed">
                A highly-optimized vector database that constantly ingests your company's data. Ask a question, and Aetheria recalls exactly what was said in Slack last week or typed in Notion yesterday.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Small Feature Card 1 */}
        <motion.div variants={itemVariants} className="glass-card p-8 rounded-3xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-bl from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative z-10">
            <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center mb-6">
              <Cpu className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-xl font-bold mb-3">Native OS Control</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Execute terminal commands, open applications, and manage your local desktop environment directly through natural language.
            </p>
          </div>
        </motion.div>

        {/* Small Feature Card 2 */}
        <motion.div variants={itemVariants} className="glass-card p-8 rounded-3xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative z-10">
            <div className="w-12 h-12 bg-purple-500/20 rounded-2xl flex items-center justify-center mb-6">
              <MessageSquare className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="text-xl font-bold mb-3">WhatsApp Bridging</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Read and reply to WhatsApp messages automatically. Aetheria acts as a proxy between your contacts and your schedule.
            </p>
          </div>
        </motion.div>

        {/* Large Feature Card 2 */}
        <motion.div variants={itemVariants} className="md:col-span-2 glass-card p-8 rounded-3xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-tl from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="w-12 h-12 bg-emerald-500/20 rounded-2xl flex items-center justify-center mb-6">
              <Globe className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-2xl font-bold mb-3">Infinite Context Window</h3>
              <p className="text-muted-foreground leading-relaxed">
                By synthesizing Google Calendar, Gmail, and active browser tabs, Aetheria knows exactly what you are working on right now, eliminating the need for manual prompting.
              </p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  )
}

export function PricingSection() {
  return (
    <section className="py-24 px-4 max-w-5xl mx-auto">
      <div className="text-center mb-16 space-y-4">
        <h2 className="text-3xl md:text-5xl font-bold tracking-tight">Simple Pricing.</h2>
        <p className="text-muted-foreground text-lg">One node. Infinite capabilities.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        <div className="glass-panel p-8 rounded-3xl flex flex-col border border-border">
          <h3 className="text-2xl font-bold mb-2">Pro Tier</h3>
          <div className="mb-6"><span className="text-4xl font-extrabold">$49</span><span className="text-muted-foreground">/month</span></div>
          <ul className="space-y-4 mb-8 flex-grow">
            <li className="flex items-center gap-3"><Lock className="w-5 h-5 text-primary" /><span>Cloud Vector Database</span></li>
            <li className="flex items-center gap-3"><Lock className="w-5 h-5 text-primary" /><span>3 Active Integrations</span></li>
            <li className="flex items-center gap-3"><Lock className="w-5 h-5 text-primary" /><span>Standard Latency</span></li>
          </ul>
          <Link href="/login" className="w-full py-4 rounded-xl bg-secondary hover:bg-secondary/80 font-semibold text-center transition-colors">Start Free Trial</Link>
        </div>

        <div className="glass-panel p-8 rounded-3xl flex flex-col border border-primary relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-4 py-1 text-xs font-bold rounded-bl-xl uppercase tracking-wider">Most Popular</div>
          <h3 className="text-2xl font-bold mb-2">Enterprise Node</h3>
          <div className="mb-6"><span className="text-4xl font-extrabold">$100</span><span className="text-muted-foreground">/month</span></div>
          <ul className="space-y-4 mb-8 flex-grow">
            <li className="flex items-center gap-3"><Lock className="w-5 h-5 text-primary" /><span>Local OS Integration (Desktop App)</span></li>
            <li className="flex items-center gap-3"><Lock className="w-5 h-5 text-primary" /><span>Unlimited Living Brain Integrations</span></li>
            <li className="flex items-center gap-3"><Lock className="w-5 h-5 text-primary" /><span>Priority AI Routing (Zero Latency)</span></li>
            <li className="flex items-center gap-3"><Lock className="w-5 h-5 text-primary" /><span>WhatsApp Web Bridging</span></li>
          </ul>
          <Link href="/login" className="w-full py-4 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-center transition-colors">Initialize Node</Link>
        </div>
      </div>
    </section>
  )
}

export function FooterSection() {
  return (
    <footer className="py-12 border-t border-border mt-20">
      <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-2">
          <span className="font-bold tracking-tight text-xl">Aetheria</span>
        </div>
        <div className="flex gap-8 text-sm text-muted-foreground">
          <a href="#" className="hover:text-foreground transition-colors">Documentation</a>
          <a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-foreground transition-colors">Terms of Service</a>
        </div>
        <div className="text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} AetheriaCompute. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
