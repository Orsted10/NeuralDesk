'use client'

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Loader2, Play, ArrowLeft, Tv } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface YouTubeVideo {
  id: string
  title: string
  description: string
  thumbnail: string
  channelTitle: string
  publishedAt: string
}

export default function YouTubeModule() {
  const [videos, setVideos] = useState<YouTubeVideo[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null)
  const [selectedVideoTitle, setSelectedVideoTitle] = useState<string>('')

  const handleSearch = async (forcedQuery?: string) => {
    const activeQuery = forcedQuery || searchQuery
    if (!activeQuery.trim()) return

    setLoading(true)
    try {
      const res = await fetch(`/api/youtube?query=${encodeURIComponent(activeQuery)}`)
      const data = await res.json()
      if (data.videos) {
        setVideos(data.videos)
        
        // Auto-play the very first matching video!
        if (data.videos.length > 0 && forcedQuery) {
          setSelectedVideoId(data.videos[0].id)
          setSelectedVideoTitle(data.videos[0].title)
          toast.success(`Playing target video, Sir.`, { icon: '🎬' })
        }
      } else if (data.error) {
        console.error(data.error)
        toast.error('Could not search videos.')
      }
    } catch (e) {
      console.error(e)
      toast.error('YouTube search pipeline offline.')
    } finally {
      setLoading(false)
    }
  }

  // Intercept JARVIS event-based commands
  useEffect(() => {
    // Intercept mount query to avoid module switching race condition
    if (typeof window !== 'undefined' && (window as any).pendingYoutubeQuery) {
      const query = (window as any).pendingYoutubeQuery
      ;(window as any).pendingYoutubeQuery = undefined
      setSearchQuery(query)
      handleSearch(query)
    }

    const handlePlayVideo = (e: CustomEvent) => {
      const query = e.detail?.query
      if (query) {
        setSearchQuery(query)
        handleSearch(query)
      }
    }
    window.addEventListener('play-video' as any, handlePlayVideo)
    return () => window.removeEventListener('play-video' as any, handlePlayVideo)
  }, [])

  // Helper to decode HTML entities in YouTube titles
  const decodeHtml = (html: string) => {
    if (typeof window === 'undefined') return html
    const txt = document.createElement('textarea')
    txt.innerHTML = html
    return txt.value
  }

  return (
    <div className="w-full flex flex-col h-full bg-black/40 border border-cyan-500/20 backdrop-blur-md rounded-lg overflow-hidden glow-border p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-4 border-b border-cyan-500/10 pb-3">
        <div className="flex gap-2 items-center">
          <Tv className="w-4 h-4 text-cyan-400 animate-pulse" />
          <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-cyan-400 font-mono">Cinematic Telemetry (YouTube)</span>
        </div>
        {selectedVideoId && (
          <button
            onClick={() => setSelectedVideoId(null)}
            className="flex items-center gap-1 text-[9px] uppercase tracking-wider font-mono border border-cyan-500/30 text-cyan-400 px-2 py-0.5 rounded bg-cyan-500/5 hover:bg-cyan-500/10 active:scale-95 transition-all"
          >
            <ArrowLeft className="w-3 h-3" />
            <span>Search Feed</span>
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {selectedVideoId ? (
          /* View A: Embedded Cinematic Screen */
          <motion.div
            key="player"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="flex-1 flex flex-col justify-between h-full"
          >
            <div className="flex-1 relative rounded border border-cyan-500/20 overflow-hidden bg-black aspect-video w-full h-[400px] mb-3">
              <iframe
                title="Cinematic Screen"
                src={`https://www.youtube.com/embed/${selectedVideoId}?autoplay=1&rel=0`}
                className="w-full h-full absolute inset-0 border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
              {/* Scanline overlay */}
              <div className="absolute inset-0 pointer-events-none border border-cyan-500/10 bg-scanlines opacity-10" />
            </div>

            <div className="bg-cyan-500/5 border border-cyan-500/25 p-3 rounded flex items-center gap-2">
              <Tv className="w-4 h-4 text-cyan-400 shrink-0" />
              <div className="text-[10px] font-mono text-cyan-300 truncate">
                <span className="text-cyan-500 font-bold uppercase tracking-wider block text-[8px] mb-0.5">CURRENT STREAM</span>
                {decodeHtml(selectedVideoTitle)}
              </div>
            </div>
          </motion.div>
        ) : (
          /* View B: Video Search and Grid Feed */
          <motion.div
            key="feed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col overflow-hidden h-full"
          >
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
                  placeholder="Specify video search query or lo-fi stream link, Sir..."
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
                  'Query'
                )}
              </button>
            </form>

            {/* Video Search Grid */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-3 scrollbar-thin scrollbar-thumb-cyan-500/20 h-full">
              {loading && videos.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <Loader2 className="w-6 h-6 text-cyan-400 animate-spin mt-12" />
                </div>
              ) : videos.length === 0 ? (
                <div className="h-full flex items-center justify-center text-cyan-700 font-mono text-[10px] text-center uppercase tracking-widest mt-16">
                  Ready to query video streams, Sir.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-2">
                  {videos.map((vid) => (
                    <motion.div
                      key={vid.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={() => {
                        setSelectedVideoId(vid.id)
                        setSelectedVideoTitle(vid.title)
                      }}
                      className="flex flex-col bg-cyan-500/5 hover:bg-cyan-500/10 border border-cyan-500/15 hover:border-cyan-500/40 rounded overflow-hidden cursor-pointer group transition-all duration-200"
                    >
                      <div className="relative aspect-video w-full overflow-hidden bg-black border-b border-cyan-500/10">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={vid.thumbnail}
                          alt={vid.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                          <div className="p-2.5 bg-cyan-500 text-black rounded-full shadow-[0_0_15px_rgba(0,242,255,0.7)] active:scale-90 transition-transform">
                            <Play className="w-4 h-4 fill-black" />
                          </div>
                        </div>
                      </div>

                      <div className="p-2.5">
                        <div className="text-[10px] font-mono text-cyan-300 font-bold truncate">
                          {decodeHtml(vid.title)}
                        </div>
                        <div className="text-[8px] font-mono text-cyan-600 uppercase tracking-widest mt-0.5 truncate">
                          {vid.channelTitle}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
