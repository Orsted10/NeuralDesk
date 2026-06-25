import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

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
      {/* Outer Rotating Ring */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        className="absolute w-full h-full border-[1px] border-indigo-500/10 rounded-full border-dashed"
      />

      {/* Middle Pulsing Ring */}
      <motion.div
        animate={{
          scale: isListening ? 1.2 + (micVolume / 100) : 1,
          opacity: isListening ? 0.6 : 0.3
        }}
        className="absolute w-48 h-48 border border-indigo-400/20 rounded-full transition-all duration-75"
      />

      {/* Inner Glow Orb */}
      <motion.div
        animate={{
          scale: isSpeaking ? [1, 1.1, 1] : 1,
          boxShadow: isListening 
            ? `0 0 ${40 + micVolume}px rgba(99, 102, 241, ${0.4 + (micVolume / 60)})` 
            : "0 0 20px rgba(99, 102, 241, 0.15)"
        }}
        className="relative w-32 h-32 bg-gradient-to-br from-indigo-500/30 to-violet-600/20 rounded-full flex items-center justify-center backdrop-blur-xl border border-white/10 transition-all duration-75 shadow-inner"
      >
        <div className="w-24 h-24 rounded-full bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
          {/* Real Animated Waveform Driven by Physical Mic */}
          <div className="flex gap-1.5 items-center">
            {waveHeights.map((h, i) => (
              <motion.div
                key={i}
                animate={{ height: h }}
                className="w-1.5 bg-indigo-400 rounded-full transition-all duration-75 shadow-[0_0_8px_rgba(99,102,241,0.5)]"
              />
            ))}
          </div>
        </div>
      </motion.div>

      {/* Ornaments */}
      {[0, 90, 180, 270].map((angle) => (
        <div
          key={angle}
          style={{ transform: `rotate(${angle}deg)` }}
          className="absolute inset-0 flex flex-col items-center justify-start py-2"
        >
          <div className="w-1 h-3 bg-indigo-500/20 rounded-full" />
        </div>
      ))}
    </div>
  )
}
