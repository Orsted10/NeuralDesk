'use client'

import { useEffect, useState } from 'react'

export default function AmbientSensor() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)

  useEffect(() => {
    let audioContext: AudioContext | null = null
    let analyser: AnalyserNode | null = null
    let microphone: MediaStreamAudioSourceNode | null = null
    let animationFrameId: number

    const initSensor = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        setHasPermission(true)
        
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
        analyser = audioContext.createAnalyser()
        analyser.fftSize = 256
        
        microphone = audioContext.createMediaStreamSource(stream)
        microphone.connect(analyser)

        const dataArray = new Uint8Array(analyser.frequencyBinCount)

        const measureAmbientNoise = () => {
          if (!analyser) return
          analyser.getByteFrequencyData(dataArray)
          
          let sum = 0
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i]
          }
          const average = sum / dataArray.length
          
          // Emit custom event for the VoiceOrb and TTS engine to listen to
          const event = new CustomEvent('aetheria-ambient-noise', {
            detail: { level: average } // 0 to 255
          })
          window.dispatchEvent(event)

          animationFrameId = requestAnimationFrame(measureAmbientNoise)
        }

        measureAmbientNoise()
      } catch (err) {
        console.error("AmbientSensor failed to initialize microphone:", err)
        setHasPermission(false)
      }
    }

    initSensor()

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId)
      if (microphone) microphone.disconnect()
      if (analyser) analyser.disconnect()
      if (audioContext && audioContext.state !== 'closed') audioContext.close()
    }
  }, [])

  if (hasPermission === false) {
    return (
      <div className="fixed bottom-4 right-4 text-[10px] text-red-500/50 bg-black/50 px-2 py-1 rounded">
        Ambient Sensor: Mic Blocked
      </div>
    )
  }

  return null
}
