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
    <div className="w-full flex flex-col h-full glass-panel rounded-3xl overflow-hidden shadow-2xl p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
        <div className="flex gap-3 items-center">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
             <Tv className="w-5 h-5 text-indigo-400" />
          </div>
          <span className="text-lg font-semibold tracking-tight text-zinc-200">YouTube Stream</span>
        </div>
        {selectedVideoId && (
          <button
            onClick={() => setSelectedVideoId(null)}
            className="flex items-center gap-2 text-xs font-semibold text-zinc-300 bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl transition-all border border-white/5 shadow-sm active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Search</span>
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
            <div className="flex-1 relative rounded-2xl border border-white/10 overflow-hidden bg-black aspect-video w-full h-[400px] mb-4 shadow-xl">
              <iframe
                title="Cinematic Screen"
                src={`https://www.youtube.com/embed/${selectedVideoId}?autoplay=1&rel=0`}
                className="w-full h-full absolute inset-0 border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>

            <div className="glass-card border border-white/5 p-4 rounded-xl flex items-center gap-3">
              <Tv className="w-5 h-5 text-indigo-400 shrink-0" />
              <div className="text-sm font-medium text-zinc-200 truncate">
                <span className="text-xs font-semibold tracking-wide text-zinc-500 block mb-0.5">NOW PLAYING</span>
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
              className="flex gap-3 mb-6"
            >
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Search for videos or paste a link..."
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

            {/* Video Search Grid */}
            <div className="flex-1 overflow-y-auto pr-2 space-y-4 scrollbar-thin scrollbar-thumb-white/10 h-full">
              {loading && videos.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <Loader2 className="w-6 h-6 text-indigo-400 animate-spin mt-12" />
                </div>
              ) : videos.length === 0 ? (
                <div className="h-full flex items-center justify-center text-zinc-500 font-medium text-sm mt-16">
                  Ready to search for videos.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-4">
                  {videos.map((vid) => (
                    <motion.div
                      key={vid.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={() => {
                        setSelectedVideoId(vid.id)
                        setSelectedVideoTitle(vid.title)
                      }}
                      className="flex flex-col glass-card border border-white/5 hover:border-white/10 hover:bg-white/[0.04] rounded-2xl overflow-hidden cursor-pointer group transition-all duration-200 shadow-md hover:shadow-xl"
                    >
                      <div className="relative aspect-video w-full overflow-hidden bg-zinc-900 border-b border-white/5">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={vid.thumbnail}
                          alt={vid.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all backdrop-blur-[2px]">
                          <div className="p-3 bg-white text-black rounded-full shadow-xl transform scale-90 group-hover:scale-100 transition-all duration-300">
                            <Play className="w-5 h-5 fill-black" />
                          </div>
                        </div>
                      </div>

                      <div className="p-4">
                        <div className="text-sm font-semibold text-zinc-200 line-clamp-2 leading-snug">
                          {decodeHtml(vid.title)}
                        </div>
                        <div className="text-xs font-medium text-zinc-500 mt-2 truncate flex items-center gap-1.5">
                          <Tv className="w-3 h-3" />
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
