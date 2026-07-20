import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Newspaper, X, ExternalLink } from 'lucide-react'

export default function NewsModule({ onClose }: { onClose?: () => void }) {
  const [news, setNews] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [category, setCategory] = useState<string>('WORLD')

  useEffect(() => {
    setLoading(true)
    const rssUrls: Record<string, string> = {
      'WORLD': 'https://news.google.com/rss',
      'TECH': 'https://news.google.com/rss/search?q=technology',
      'BUSINESS': 'https://news.google.com/rss/search?q=finance',
    }
    const target = encodeURIComponent(rssUrls[category] || rssUrls['WORLD'])
    fetch(`https://api.rss2json.com/v1/api.json?rss_url=${target}`)
      .then(res => res.json())
      .then(data => {
        if (data.items) {
          setNews(data.items.slice(0, 15))
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [category])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="w-full h-full glass-panel rounded-t-3xl lg:rounded-3xl shadow-2xl flex flex-col relative overflow-hidden mt-auto lg:mt-0 border-none"
    >
      <div className="p-6 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
            <Newspaper className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Global News Feed</h2>
            <div className="flex gap-2 mt-1">
              {['WORLD', 'TECH', 'BUSINESS'].map(c => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full transition-all ${category === c ? 'bg-orange-500 text-white' : 'bg-secondary text-muted-foreground hover:bg-secondary/80'}`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white rounded-lg hover:bg-white/10 transition-all">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 scrollbar-thin scrollbar-thumb-border">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-2 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
          </div>
        ) : (
          news.map((item, i) => (
            <motion.a
              href={item.link}
              target="_blank"
              rel="noreferrer"
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex gap-4 p-4 rounded-2xl bg-card/40 border border-border hover:bg-accent/40 transition-all group"
            >
              {item.thumbnail && (
                <div className="hidden sm:block w-24 h-24 rounded-xl overflow-hidden flex-shrink-0 bg-secondary">
                  <img src={item.thumbnail} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
              )}
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start gap-4">
                    <h3 className="font-semibold text-foreground group-hover:text-orange-500 transition-colors line-clamp-2">
                      {item.title}
                    </h3>
                    <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0 group-hover:text-orange-500" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-2" dangerouslySetInnerHTML={{ __html: item.description?.replace(/<[^>]+>/g, '') }} />
                </div>
                <div className="mt-4 flex items-center gap-3 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  <span>{new Date(item.pubDate).toLocaleDateString()}</span>
                  <span className="w-1 h-1 rounded-full bg-border" />
                  <span>{item.author || 'Google News'}</span>
                </div>
              </div>
            </motion.a>
          ))
        )}
      </div>
    </motion.div>
  )
}
