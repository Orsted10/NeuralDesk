import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Newspaper, X, ExternalLink } from 'lucide-react'

export default function NewsModule({ onClose }: { onClose?: () => void }) {
  const [news, setNews] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=10')
      .then(res => res.json())
      .then(data => {
        setNews(data.hits)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="w-full max-w-4xl h-[85vh] lg:h-[70vh] glass-panel rounded-t-3xl lg:rounded-3xl shadow-2xl flex flex-col relative overflow-hidden mt-auto lg:mt-0"
    >
      <div className="p-6 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
            <Newspaper className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-100">Global News Feed</h2>
            <p className="text-xs text-zinc-500">Live Top Headlines</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white rounded-lg hover:bg-white/10 transition-all">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-2 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
          </div>
        ) : (
          news.map((item, i) => (
            <motion.a
              href={item.url}
              target="_blank"
              rel="noreferrer"
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="block p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-orange-500/30 transition-all group"
            >
              <div className="flex justify-between items-start">
                <h3 className="font-medium text-zinc-200 group-hover:text-orange-400 transition-colors pr-4">
                  {item.title}
                </h3>
                <ExternalLink className="w-4 h-4 text-zinc-500 flex-shrink-0 group-hover:text-orange-400" />
              </div>
              <div className="mt-3 flex items-center gap-4 text-xs text-zinc-500">
                <span>By {item.author}</span>
                <span>{item.points} pts</span>
              </div>
            </motion.a>
          ))
        )}
      </div>
    </motion.div>
  )
}
