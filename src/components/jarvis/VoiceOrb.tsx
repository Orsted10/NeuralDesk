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
      {/* Siri / Apple Intelligence Style Gradient Glows */}
      <AnimatePresence>
        {(isListening || isSpeaking) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: isListening ? 1.2 + (micVolume / 150) : 1.1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            {/* Layer 1: Pink/Purple */}
            <motion.div
              animate={{ rotate: 360, scale: isSpeaking ? [1, 1.05, 1] : 1 }}
              transition={{ rotate: { duration: 4, repeat: Infinity, ease: "linear" }, scale: { duration: 0.8, repeat: Infinity } }}
              className="absolute w-40 h-40 bg-fuchsia-500/40 rounded-full mix-blend-screen filter blur-2xl origin-bottom-right"
            />
            {/* Layer 2: Blue/Cyan */}
            <motion.div
              animate={{ rotate: -360, scale: isSpeaking ? [1, 1.1, 1] : 1 }}
              transition={{ rotate: { duration: 5, repeat: Infinity, ease: "linear" }, scale: { duration: 1, repeat: Infinity } }}
              className="absolute w-40 h-40 bg-cyan-500/40 rounded-full mix-blend-screen filter blur-2xl origin-top-left"
            />
            {/* Layer 3: Indigo */}
            <motion.div
              animate={{ rotate: 360, scale: isSpeaking ? [1, 1.15, 1] : 1 }}
              transition={{ rotate: { duration: 6, repeat: Infinity, ease: "linear" }, scale: { duration: 1.2, repeat: Infinity } }}
              className="absolute w-40 h-40 bg-indigo-500/40 rounded-full mix-blend-screen filter blur-2xl origin-bottom-left"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Outer Rotating Ring (Subtle) */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="absolute w-48 h-48 border-[1px] border-white/5 rounded-full border-dashed pointer-events-none"
      />

      {/* Inner Glow Orb Core */}
      <motion.div
        animate={{
          scale: isSpeaking ? [1, 1.05, 1] : 1,
          boxShadow: isListening 
            ? `0 0 ${30 + micVolume}px rgba(99, 102, 241, ${0.4 + (micVolume / 60)})` 
            : "0 0 20px rgba(99, 102, 241, 0.15)"
        }}
        transition={{ scale: { duration: 0.5, repeat: Infinity } }}
        className="relative w-32 h-32 bg-gradient-to-br from-indigo-900/80 to-black/90 rounded-full flex items-center justify-center backdrop-blur-xl border border-white/10 transition-all duration-75 shadow-[inset_0_0_20px_rgba(255,255,255,0.05)] z-10"
      >
        <div className="w-20 h-20 rounded-full bg-black/40 border border-white/5 flex items-center justify-center overflow-hidden">
          {/* Real Animated Waveform Driven by Physical Mic */}
          <div className="flex gap-1 items-center">
            {waveHeights.map((h, i) => (
              <motion.div
                key={i}
                animate={{ height: isListening ? h : (isSpeaking ? [8, 24, 8][i % 3] : 4) }}
                transition={isSpeaking ? { duration: 0.5, repeat: Infinity, delay: i * 0.1 } : { duration: 0.1 }}
                className="w-1 bg-white/80 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.8)]"
              />
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
