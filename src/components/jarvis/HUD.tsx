'use client'

import { ReactNode } from 'react'
import { motion } from 'framer-motion'

export function HUDCard({ title, children, className = "" }: { title: string, children: ReactNode, className?: string }) {
  return (
    <div className={`relative p-4 bg-black/40 border border-cyan-500/20 backdrop-blur-md glow-border rounded-lg ${className}`}>
      <div className="flex justify-between items-center mb-4 border-b border-cyan-500/20 pb-2">
        <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-cyan-400/80">{title}</h3>
        <div className="flex gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-500/40" />
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-500/10" />
        </div>
      </div>
      {children}
      {/* Decorative corners */}
      <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-cyan-500/40" />
      <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-cyan-500/40" />
      <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-cyan-500/40" />
      <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-cyan-500/40" />
    </div>
  )
}

export function StatusIndicator({ label, value, color = "cyan" }: { label: string, value: string, color?: string }) {
  return (
    <div className="flex justify-between items-end gap-4 py-1">
      <span className="text-[9px] uppercase tracking-widest text-cyan-500/40">{label}</span>
      <span className={`text-xs font-mono text-${color}-400 glow-text`}>{value}</span>
    </div>
  )
}

export function ParticleBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 opacity-20">
      <div className="absolute inset-0 grid-bg" />
      {/* Small floating dots could be added here with Framer Motion if needed */}
    </div>
  )
}
