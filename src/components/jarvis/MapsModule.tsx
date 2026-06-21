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

  // Custom Graphite & Obsidian High-Tech Map Theme
  const darkMapStyle = [
    { elementType: 'geometry', stylers: [{ color: '#090e14' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#090e14' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#00f2ff' }] },
    {
      featureType: 'administrative.locality',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#00f2ff' }]
    },
    {
      featureType: 'poi',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#00f2ff', opacity: 0.5 }]
    },
    {
      featureType: 'poi.park',
      elementType: 'geometry',
      stylers: [{ color: '#0d1622' }]
    },
    {
      featureType: 'poi.park',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#00c3ff' }]
    },
    {
      featureType: 'road',
      elementType: 'geometry',
      stylers: [{ color: '#131d2b' }]
    },
    {
      featureType: 'road',
      elementType: 'geometry.stroke',
      stylers: [{ color: '#1a2b3e' }]
    },
    {
      featureType: 'road',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#a0aec0' }]
    },
    {
      featureType: 'road.highway',
      elementType: 'geometry',
      stylers: [{ color: '#1b2c40' }]
    },
    {
      featureType: 'road.highway',
      elementType: 'geometry.stroke',
      stylers: [{ color: '#2b3f57' }]
    },
    {
      featureType: 'road.highway',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#00f2ff' }]
    },
    {
      featureType: 'water',
      elementType: 'geometry',
      stylers: [{ color: '#050a10' }]
    },
    {
      featureType: 'water',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#00c3ff' }]
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
      title: 'Default Target: India Node',
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: '#00f2ff',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2
      }
    })

    const directionsRenderer = new google.maps.DirectionsRenderer({
      map: map,
      suppressMarkers: false,
      polylineOptions: { strokeColor: '#00f2ff', strokeWeight: 4 }
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

  // Intercept JARVIS event-based commands
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
    <div className="w-full flex flex-col h-full bg-black/40 border border-cyan-500/20 backdrop-blur-md rounded-lg overflow-hidden glow-border p-4">
      {/* Header bar */}
      <div className="flex justify-between items-center mb-4 border-b border-cyan-500/10 pb-3">
        <div className="flex gap-2 items-center">
          <Navigation className="w-4 h-4 text-cyan-400 animate-pulse" />
          <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-cyan-400 font-mono">Geospatial Telemetry</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 items-center bg-black/50 border border-cyan-500/20 px-2 py-1 rounded text-[9px] font-mono text-cyan-300">
            <Compass className="w-3 h-3 text-cyan-400" />
            <span>GRID: LAT/LNG ACTIVE</span>
          </div>
        </div>
      </div>

      {/* Search Input bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          handleSearch()
        }}
        className="flex gap-2 mb-4"
      >
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Specify geographical coordinates or location name, Sir..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-black/60 border border-cyan-500/30 text-cyan-300 text-xs px-3 py-2 pl-9 rounded focus:outline-none focus:border-cyan-400 transition-all font-mono placeholder-cyan-700 glow-input"
          />
          <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-cyan-500/50" />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 hover:border-cyan-400 text-cyan-400 uppercase tracking-widest text-[10px] px-4 rounded transition-all font-mono flex items-center justify-center gap-2 active:scale-95 duration-100 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            'Locate'
          )}
        </button>
      </form>

      {/* Map Embed Div */}
      <div className="flex-1 relative rounded border border-cyan-500/20 overflow-hidden bg-black/80">
        <div ref={mapRef} className="w-full h-full" style={{ minHeight: '350px' }} />
        
        {/* Cinematic HUD Grid Overlay */}
        <div className="absolute inset-0 pointer-events-none border border-cyan-500/10 bg-scanlines opacity-20" />

        {/* Floating Glassmorphic Locate Me Button */}
        <button
          onClick={handleLocateMe}
          disabled={locating}
          className="absolute bottom-4 right-4 bg-black/70 backdrop-blur-md hover:bg-black/90 border border-cyan-500/30 hover:border-cyan-400 text-cyan-400 px-3 py-2 rounded shadow-[0_0_15px_rgba(0,242,255,0.2)] hover:shadow-[0_0_20px_rgba(0,242,255,0.4)] transition-all font-mono text-[9px] uppercase tracking-widest flex items-center gap-1.5 active:scale-95 duration-100 disabled:opacity-50 pointer-events-auto"
          title="Track Live Node Coordinates"
        >
          {locating ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <MapPin className="w-3 h-3 animate-pulse" />
          )}
          <span>{locating ? 'Aligning Grid...' : 'Locate Me'}</span>
        </button>
      </div>
    </div>
  )
}
