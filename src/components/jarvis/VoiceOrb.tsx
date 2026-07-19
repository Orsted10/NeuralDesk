import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface VoiceOrbProps {
  isListening?: boolean
  isSpeaking?: boolean
  onClick?: () => void
}

export default function VoiceOrb({ isListening = false, isSpeaking = false, onClick }: VoiceOrbProps) {
  const [micVolume, setMicVolume] = useState(0)
  const [waveHeights, setWaveHeights] = useState([8, 8, 8, 8, 8])

  const handleClick = () => {
    if (onClick) onClick()
    else window.dispatchEvent(new Event('toggle-voice'))
  }

  // Real-time physical microphone decibel visualizer
  useEffect(() => {
    if (!isListening) {
      setMicVolume(0)
      setWaveHeights([8, 8, 8, 8, 8])
      return
    }

    let audioContext: AudioContext | null = null
    let analyser: AnalyserNode | null = null
    let microphone: MediaStreamAudioSourceNode | null = null
    let stream: MediaStream | null = null
    let animationId: number = 0

    const initAudio = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
        audioContext = new AudioContextClass()
        analyser = audioContext.createAnalyser()
        analyser.fftSize = 32
        
        microphone = audioContext.createMediaStreamSource(stream)
        microphone.connect(analyser)

        const bufferLength = analyser.frequencyBinCount
        const dataArray = new Uint8Array(bufferLength)

        const analyze = () => {
          if (!analyser) return
          analyser.getByteFrequencyData(dataArray)
          
          let sum = 0
          for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i]
          }
          const average = sum / bufferLength
          // Normalize volume to a scale (0 to 30)
          setMicVolume(Math.min(30, average / 4))

          // Map specific frequency bands to visual wave bars
          const h1 = Math.max(8, Math.min(48, (dataArray[1] || 0) / 3))
          const h2 = Math.max(8, Math.min(48, (dataArray[3] || 0) / 2.2))
          const h3 = Math.max(8, Math.min(48, (dataArray[5] || 0) / 1.5))
          const h4 = Math.max(8, Math.min(48, (dataArray[7] || 0) / 2.2))
          const h5 = Math.max(8, Math.min(48, (dataArray[9] || 0) / 3))
          setWaveHeights([h1, h2, h3, h4, h5])

          animationId = requestAnimationFrame(analyze)
        }

        analyze()
      } catch (err) {
        console.error("Local mic visualizer failed:", err)
      }
    }

    initAudio()

    return () => {
      if (animationId) cancelAnimationFrame(animationId)
      if (microphone) microphone.disconnect()
      if (audioContext) audioContext.close()
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [isListening])

  return (
    <div 
      onClick={handleClick}
      className="relative flex items-center justify-center w-64 h-64 cursor-pointer group active:scale-95 transition-transform"
    >
      {/* Siri / Apple Intelligence Style Organic Mesh Glows */}
      <AnimatePresence>
        {(isListening || isSpeaking) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: isListening ? 1.2 + (micVolume / 150) : 1.1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            {/* Layer 1: Core Brightness */}
            <motion.div
              animate={{ rotate: 360, scale: isSpeaking ? [1, 1.05, 1] : 1 }}
              transition={{ rotate: { duration: 8, repeat: Infinity, ease: "linear" }, scale: { duration: 1.5, repeat: Infinity, ease: "easeInOut" } }}
              className="absolute w-40 h-40 bg-white/30 dark:bg-zinc-100/10 rounded-full mix-blend-screen dark:mix-blend-lighten filter blur-3xl origin-bottom-right"
            />
            {/* Layer 2: Subtle Accent */}
            <motion.div
              animate={{ rotate: -360, scale: isSpeaking ? [1, 1.1, 1] : 1 }}
              transition={{ rotate: { duration: 12, repeat: Infinity, ease: "linear" }, scale: { duration: 2, repeat: Infinity, ease: "easeInOut" } }}
              className="absolute w-48 h-48 bg-primary/20 dark:bg-primary/30 rounded-[40%_60%_70%_30%] mix-blend-overlay filter blur-3xl origin-top-left"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Inner Organic Core Orb */}
      <motion.div
        animate={{
          scale: isSpeaking ? [1, 1.02, 1] : 1,
          boxShadow: isListening 
            ? `0 0 ${40 + micVolume * 2}px rgba(255, 255, 255, ${0.1 + (micVolume / 100)})` 
            : "0 20px 40px rgba(0, 0, 0, 0.1)"
        }}
        transition={{ scale: { duration: 2, repeat: Infinity, ease: "easeInOut" } }}
        className="relative w-32 h-32 bg-gradient-to-br from-background/90 to-background/50 dark:from-zinc-800/90 dark:to-zinc-950/90 rounded-full flex items-center justify-center backdrop-blur-2xl border border-border shadow-2xl z-10 overflow-hidden"
      >
        {/* Subtle glass reflection */}
        <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/0 dark:from-white/0 dark:via-white/5 dark:to-white/0 opacity-50" />
        
        <div className="w-16 h-16 rounded-full flex items-center justify-center relative z-20 mix-blend-difference text-white">
          {/* Real Animated Waveform Driven by Physical Mic */}
          <div className="flex gap-1 items-center">
            {waveHeights.map((h, i) => (
              <motion.div
                key={i}
                animate={{ height: isListening ? h : (isSpeaking ? [8, 24, 8][i % 3] : 4) }}
                transition={isSpeaking ? { duration: 0.5, repeat: Infinity, delay: i * 0.1 } : { duration: 0.1 }}
                className="w-1 bg-current rounded-full"
              />
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
