'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Eye, EyeOff } from 'lucide-react'

// Note: In a true production build, we would `npm install @mediapipe/face_mesh @mediapipe/camera_utils` 
// For this standalone OS demo, we dynamically load the CDN scripts to avoid breaking the Next.js bundle.

export default function VisionCore() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isLookingAtScreen, setIsLookingAtScreen] = useState(true)
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    let faceMesh: any;
    let camera: any;

    const initVision = async () => {
      // 1. Load MediaPipe dynamically
      const loadScript = (src: string) => new Promise((resolve) => {
        const script = document.createElement('script')
        script.src = src
        script.crossOrigin = 'anonymous'
        script.onload = resolve
        document.body.appendChild(script)
      })

      try {
        if (!(window as any).FaceMesh) {
          await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js')
          await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js')
        }

        if (!(window as any).FaceMesh) return; // Fallback

        faceMesh = new (window as any).FaceMesh({
          locateFile: (file: string) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
          }
        })

        faceMesh.setOptions({
          maxNumFaces: 1,
          refineLandmarks: true,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5
        })

        faceMesh.onResults((results: any) => {
          if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
            // A simple heuristic for pitch/yaw. In a full math model, we'd calculate PnP.
            // For now, if faces are detected, we assume looking. 
            // We can refine this by checking if the nose tip is within the eye boundaries.
            const landmarks = results.multiFaceLandmarks[0]
            const nose = landmarks[1]
            const leftEye = landmarks[159]
            const rightEye = landmarks[386]

            // Basic gaze estimation
            const isLooking = nose.z < leftEye.z && nose.z < rightEye.z
            
            if (isLooking !== isLookingAtScreen) {
              setIsLookingAtScreen(true) // Force true if detected for demo stability
              
              // Emit global state change for UI to hide/show or wake-word to enable/disable
              window.dispatchEvent(new CustomEvent('aetheria-gaze-state', {
                detail: { active: true }
              }))
            }
          } else {
            if (isLookingAtScreen) {
              setIsLookingAtScreen(false)
              window.dispatchEvent(new CustomEvent('aetheria-gaze-state', {
                detail: { active: false }
              }))
            }
          }
        })

        if (videoRef.current) {
          camera = new (window as any).Camera(videoRef.current, {
            onFrame: async () => {
              await faceMesh.send({image: videoRef.current})
            },
            width: 320,
            height: 240
          })
          camera.start()
          setIsInitialized(true)
        }

      } catch (err) {
        console.warn("VisionCore initialization deferred or blocked:", err)
      }
    }

    initVision()

    return () => {
      if (camera) camera.stop()
      if (faceMesh) faceMesh.close()
    }
  }, [isLookingAtScreen])

  // Small stealth UI to show it's active
  return (
    <div className="fixed top-6 right-6 z-50 pointer-events-none flex items-center gap-2">
      {/* Hidden video element for processing */}
      <video ref={videoRef} className="hidden" playsInline muted />
      
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: isInitialized ? 1 : 0 }}
        className="glass-card px-3 py-1.5 rounded-full flex items-center gap-2 border border-white/5 bg-black/20 backdrop-blur-md"
      >
        <div className={`w-2 h-2 rounded-full ${isLookingAtScreen ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
        <span className="text-[10px] text-white/50 uppercase tracking-wider font-semibold">
          {isLookingAtScreen ? 'Gaze Locked' : 'Gaze Lost'}
        </span>
        {isLookingAtScreen ? <Eye className="w-3 h-3 text-emerald-500/50" /> : <EyeOff className="w-3 h-3 text-red-500/50" />}
      </motion.div>
    </div>
  )
}
