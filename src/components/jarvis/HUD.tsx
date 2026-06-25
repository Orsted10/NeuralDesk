'use client'

import { ReactNode } from 'react'
import { motion } from 'framer-motion'

export function HUDCard({ title, children, className = "" }: { title: string, children: ReactNode, className?: string }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={`glass-panel rounded-2xl p-6 ${className}`}
    >
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-sm font-medium text-zinc-300 tracking-wide">{title}</h3>
      </div>
      {children}
    </motion.div>
  )
}

export function StatusIndicator({ label, value, color = "zinc" }: { label: string, value: string, color?: string }) {
  // Map legacy cyan/green colors to modern soft colors
  const colorMap: Record<string, string> = {
    cyan: 'text-indigo-400',
    green: 'text-emerald-400',
    red: 'text-rose-400',
    zinc: 'text-zinc-300'
  }
  const colorClass = colorMap[color] || 'text-zinc-300'

  return (
    <div className="flex justify-between items-center py-2 border-b border-white/[0.03] last:border-0">
      <span className="text-xs font-medium text-zinc-500">{label}</span>
      <span className={`text-sm font-semibold tracking-tight ${colorClass}`}>{value}</span>
    </div>
  )
}

export function ParticleBackground() {
  return (
    <div className="gradient-blur-bg" />
  )
}
