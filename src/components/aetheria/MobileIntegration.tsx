'use client'

import { useEffect, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { Share } from '@capacitor/share'
import { PushNotifications } from '@capacitor/push-notifications'
import { toast } from 'react-hot-toast'
import { Share2 } from 'lucide-react'

export function MobileNativeSetup() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = async () => {
      if (typeof window !== 'undefined' && Capacitor.isNativePlatform()) {
        setIsMobile(true)
        
        try {
          // Request Push Notification permissions
          let permStatus = await PushNotifications.checkPermissions()
          if (permStatus.receive === 'prompt') {
            permStatus = await PushNotifications.requestPermissions()
          }

          if (permStatus.receive === 'granted') {
            await PushNotifications.register()
          }

          // Register event listeners
          PushNotifications.addListener('registration', (token) => {
             console.log('Push registration success, token: ' + token.value)
          })

          PushNotifications.addListener('pushNotificationReceived', (notification) => {
             toast.success(`[Native Push] ${notification.title}: ${notification.body}`, { icon: '📱' })
          })

        } catch (e) {
          console.error("Push Notifications failed to init", e)
        }
      }
    }
    checkMobile()
    
    return () => {
      if (Capacitor.isNativePlatform()) {
        try {
          PushNotifications.removeAllListeners()
        } catch {}
      }
    }
  }, [])

  return null
}

export function MobileShareButton({ text, url, title }: { text: string, url?: string, title?: string }) {
  const [isNative, setIsNative] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined' && Capacitor.isNativePlatform()) {
      setIsNative(true)
    }
  }, [])

  if (!isNative) return null

  const handleShare = async () => {
    try {
      await Share.share({
        title: title || 'Aetheria',
        text: text,
        url: url,
        dialogTitle: 'Share with friends',
      })
    } catch (e) {
      console.error('Error sharing', e)
    }
  }

  return (
    <button onClick={handleShare} className="p-2 text-zinc-600 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-all" title="Share Natively">
      <Share2 className="w-4 h-4" />
    </button>
  )
}
