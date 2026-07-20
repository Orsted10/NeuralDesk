'use client'

import React, { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Search, Navigation, Layers, Compass, Loader2, MapPin } from 'lucide-react'
import { toast } from 'react-hot-toast'

export default function MapsModule() {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<google.maps.Map | null>(null)
  const markerRef = useRef<google.maps.Marker | null>(null)
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null)
  
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [locating, setLocating] = useState(false)
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null)
  const [marker, setMarker] = useState<google.maps.Marker | null>(null)

  // Premium Slate/Zinc Map Theme
  const darkMapStyle = [
    { elementType: 'geometry', stylers: [{ color: '#18181b' }] }, // zinc-900
    { elementType: 'labels.text.stroke', stylers: [{ color: '#18181b' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#a1a1aa' }] }, // zinc-400
    {
      featureType: 'administrative.locality',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#d4d4d8' }] // zinc-300
    },
    {
      featureType: 'poi',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#71717a' }] // zinc-500
    },
    {
      featureType: 'poi.park',
      elementType: 'geometry',
      stylers: [{ color: '#27272a' }] // zinc-800
    },
    {
      featureType: 'poi.park',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#52525b' }] // zinc-600
    },
    {
      featureType: 'road',
      elementType: 'geometry',
      stylers: [{ color: '#27272a' }] // zinc-800
    },
    {
      featureType: 'road',
      elementType: 'geometry.stroke',
      stylers: [{ color: '#3f3f46' }] // zinc-700
    },
    {
      featureType: 'road',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#a1a1aa' }] // zinc-400
    },
    {
      featureType: 'road.highway',
      elementType: 'geometry',
      stylers: [{ color: '#3f3f46' }] // zinc-700
    },
    {
      featureType: 'road.highway',
      elementType: 'geometry.stroke',
      stylers: [{ color: '#52525b' }] // zinc-600
    },
    {
      featureType: 'road.highway',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#f4f4f5' }] // zinc-100
    },
    {
      featureType: 'water',
      elementType: 'geometry',
      stylers: [{ color: '#09090b' }] // zinc-950
    },
    {
      featureType: 'water',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#52525b' }] // zinc-600
    }
  ]

  // Load Google Maps Script (safely avoiding multiple script loading issues)
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!key) {
      toast.error('Google Maps client API Key not configured.')
      return
    }

    if (window.google && window.google.maps) {
      initMap()
      return
    }

    const existingScript = document.getElementById('google-maps-script')
    if (existingScript) {
      existingScript.addEventListener('load', () => initMap())
      return
    }

    const script = document.createElement('script')
    script.id = 'google-maps-script'
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`
    script.async = true
    script.defer = true
    script.onload = () => initMap()
    document.head.appendChild(script)

    return () => {
      // Keep script loaded to avoid multiple script loading errors
    }
  }, [])

  const initMap = () => {
    if (!mapRef.current) return

    const defaultCoords = { lat: 28.6139, lng: 77.2090 } // Default to New Delhi, India
    const map = new google.maps.Map(mapRef.current, {
      center: defaultCoords,
      zoom: 13,
      styles: darkMapStyle as google.maps.MapTypeStyle[],
      disableDefaultUI: true,
      zoomControl: true
    })

    const initialMarker = new google.maps.Marker({
      position: defaultCoords,
      map: map,
      title: 'Target Location',
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: '#6366f1', // indigo-500
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2
      }
    })

    const directionsRenderer = new google.maps.DirectionsRenderer({
      map: map,
      suppressMarkers: false,
      polylineOptions: { strokeColor: '#6366f1', strokeWeight: 4 }
    })

    setMapInstance(map)
    setMarker(initialMarker)
    mapInstanceRef.current = map
    markerRef.current = initialMarker
    directionsRendererRef.current = directionsRenderer
  }

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser, Sir.')
      return
    }

    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userCoords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        }

        const currentMap = mapInstance || mapInstanceRef.current
        const currentMarker = marker || markerRef.current

        if (currentMap && currentMarker) {
          currentMap.setCenter(userCoords);
          currentMap.setZoom(15);
          currentMarker.setPosition(userCoords);
          currentMarker.setTitle('Live User Location');

          // Elegant animation bounce on locate
          currentMarker.setAnimation(google.maps.Animation.BOUNCE)
          setTimeout(() => currentMarker.setAnimation(null), 1500)

          toast.success('Live coordinate links established, Sir!', { icon: '📍' })
        }
        setLocating(false)
      },
      (error) => {
        console.error(error)
        toast.error('Failed to capture live GPS telemetry. Please verify device permissions.')
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 5000 }
    )
  }

  const handleSearch = async (forcedQuery?: string) => {
    const activeQuery = forcedQuery || searchQuery
    if (!activeQuery.trim()) return

    setLoading(true)
    try {
      if (!window.google || !window.google.maps) {
        toast.error('Google Maps SDK not yet loaded, Sir.')
        return
      }

      const geocoder = new google.maps.Geocoder()
      geocoder.geocode({ address: activeQuery }, (results, status) => {
        setLoading(false)
        if (status === 'OK' && results && results[0]) {
          const location = results[0].geometry.location
          const formattedAddress = results[0].formatted_address

          const currentMap = mapInstance || mapInstanceRef.current
          const currentMarker = marker || markerRef.current

          if (currentMap && currentMarker) {
            currentMap.setCenter(location)
            currentMap.setZoom(15)
            currentMarker.setPosition(location)
            currentMarker.setTitle(formattedAddress)

            // Smooth animation bounce
            currentMarker.setAnimation(google.maps.Animation.BOUNCE)
            setTimeout(() => currentMarker.setAnimation(null), 1500)

            toast.success(`Centered target: ${formattedAddress}`, { icon: '📍' })
          }
        } else {
          toast.error(`Location scan failed: ${status}`, { icon: '⚠️' })
        }
      })
    } catch (e) {
      console.error(e)
      toast.error('Failed to locate coordinates.')
      setLoading(false)
    }
  }

  const handleDirections = async (origin: string, destination: string) => {
    if (!window.google || !window.google.maps) {
      toast.error('Google Maps SDK not yet loaded, Sir.')
      return
    }

    const directionsService = new google.maps.DirectionsService()
    setLoading(true)

    try {
      const response = await directionsService.route({
        origin: origin,
        destination: destination,
        travelMode: google.maps.TravelMode.DRIVING
      })

      if (directionsRendererRef.current) {
        directionsRendererRef.current.setDirections(response)
        toast.success(`Route calculated: ${response.routes[0].legs[0].distance?.text}`, { icon: '🛣️' })
      }
    } catch (e: any) {
      console.error(e)
      toast.error('Failed to calculate route.')
    } finally {
      setLoading(false)
    }
  }

  // Keep handleSearch in a ref so we can safely register single mount event listener without stale closures
  const handleSearchRef = useRef(handleSearch)
  useEffect(() => {
    handleSearchRef.current = handleSearch
  }, [handleSearch])

  // Safe state-driven intercept for pending mount queries to bypass rendering/script loading race conditions
  useEffect(() => {
    const currentMap = mapInstance || mapInstanceRef.current
    const currentMarker = marker || markerRef.current

    if (currentMap && currentMarker && typeof window !== 'undefined' && (window as any).pendingMapQuery) {
      const query = (window as any).pendingMapQuery
      ;(window as any).pendingMapQuery = undefined // Clear immediately
      setSearchQuery(query)
      handleSearch(query)
    }
  }, [mapInstance, marker])

  // Intercept Aetheria event-based commands
  useEffect(() => {
    const handleShowMap = (e: CustomEvent) => {
      const query = e.detail?.query
      if (query) {
        setSearchQuery(query)
        handleSearchRef.current(query)
      }
    }
    const handleGetDirections = (e: CustomEvent) => {
      const { origin, destination } = e.detail || {}
      if (origin && destination) {
        handleDirections(origin, destination)
      }
    }
    window.addEventListener('show-map' as any, handleShowMap)
    window.addEventListener('get-directions' as any, handleGetDirections)
    return () => {
      window.removeEventListener('show-map' as any, handleShowMap)
      window.removeEventListener('get-directions' as any, handleGetDirections)
    }
  }, [])

  return (
    <div className="w-full flex flex-col h-full glass-panel rounded-3xl overflow-hidden shadow-2xl p-6">
      {/* Header bar */}
      <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
        <div className="flex gap-3 items-center">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
             <Navigation className="w-5 h-5 text-indigo-400" />
          </div>
          <span className="text-lg font-semibold tracking-tight text-zinc-200">Maps & Navigation</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-2 items-center bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-300">
            <Compass className="w-4 h-4 text-zinc-400" />
            <span>GPS Active</span>
          </div>
        </div>
      </div>

      {/* Search Input bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          handleSearch()
        }}
        className="flex gap-3 mb-6"
      >
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Search for a location or address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full glass-input text-zinc-200 text-sm px-4 py-3 pl-11 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all placeholder-zinc-500"
          />
          <Search className="absolute left-4 top-3.5 w-4 h-4 text-zinc-400" />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold text-sm px-6 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            'Search'
          )}
        </button>
      </form>

      {/* Map Embed Div */}
      <div className="flex-1 relative rounded-2xl overflow-hidden border border-white/10 shadow-inner">
        <div ref={mapRef} className="w-full h-full" style={{ minHeight: '350px' }} />
        
        {/* Floating Glassmorphic Locate Me Button */}
        <button
          onClick={handleLocateMe}
          disabled={locating}
          className="absolute bottom-6 right-6 glass-card hover:bg-white/10 border border-white/10 text-zinc-200 px-4 py-2.5 rounded-xl shadow-xl transition-all text-xs font-semibold flex items-center gap-2 active:scale-95 disabled:opacity-50 pointer-events-auto"
          title="Track Live Location"
        >
          {locating ? (
            <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
          ) : (
            <MapPin className="w-4 h-4 text-indigo-400" />
          )}
          <span>{locating ? 'Locating...' : 'Current Location'}</span>
        </button>
      </div>
    </div>
  )
}
