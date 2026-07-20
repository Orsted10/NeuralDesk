import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, X, TrendingDown, DollarSign } from 'lucide-react'

export default function FinanceModule({ onClose }: { onClose?: () => void }) {
  const [assets, setAssets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Fetch top 10 crypto assets for free from CoinCap API
    fetch('https://api.coincap.io/v2/assets?limit=10')
      .then(res => res.json())
      .then(data => {
        setAssets(data.data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="w-full h-full glass-panel rounded-t-3xl lg:rounded-3xl shadow-2xl flex flex-col relative overflow-hidden mt-auto lg:mt-0 border-none"
    >
      <div className="p-6 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Live Markets</h2>
            <p className="text-xs text-muted-foreground">Real-time Cryptocurrency Data</p>
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
            <div className="w-8 h-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {assets.map((item, i) => {
              const isPositive = parseFloat(item.changePercent24Hr) >= 0;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="p-5 rounded-2xl bg-card/40 border border-border flex items-center justify-between group hover:bg-accent/40 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center font-bold text-foreground shadow-inner">
                      {item.symbol}
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground truncate max-w-[100px]">{item.name}</h3>
                      <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Rank #{item.rank}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-base font-bold text-foreground">
                      ${parseFloat(item.priceUsd).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className={`flex items-center gap-1 text-xs font-semibold justify-end ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                      {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {Math.abs(parseFloat(item.changePercent24Hr)).toFixed(2)}%
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </motion.div>
  )
}
