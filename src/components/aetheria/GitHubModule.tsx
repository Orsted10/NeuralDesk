'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GitBranch, GitCommit, Search, RefreshCw, CheckCircle2, XCircle, Clock, Check, X, Code2, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { HUDCard } from './HUD'
import { toast } from 'sonner'

export default function GitHubModule({ onClose }: { onClose?: () => void }) {
  const [activeTab, setActiveTab] = useState<'repos' | 'deployments' | 'commits' | 'actions'>('repos')
  const [githubToken, setGithubToken] = useState<string | null>(null)
  const [tokenInput, setTokenInput] = useState('')
  const [repos, setRepos] = useState<any[]>([])
  const [deployments, setDeployments] = useState<any[]>([])
  const [commits, setCommits] = useState<any[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  const [commitMessage, setCommitMessage] = useState('')
  const [isCommitting, setIsCommitting] = useState(false)

  const fetchGithubData = async () => {
    if (!githubToken) return
    setIsRefreshing(true)
    try {
      const headers = { Authorization: `token ${githubToken}` }
      // Fetch Repos
      const repoRes = await fetch('https://api.github.com/user/repos?sort=updated&per_page=10', { headers })
      const repoData = await repoRes.json()
      if (Array.isArray(repoData)) {
        setRepos(repoData)
      } else {
        toast.error('Invalid token or GitHub API rate limit exceeded.')
        setGithubToken(null)
        localStorage.removeItem('aetheria_github_pat')
      }

      // Mock deployments for now, since Vercel API requires Vercel tokens, not GitHub tokens
      setDeployments([
        { id: 1, message: 'fix: resolve syntax error in action protocol', status: 'success', time: 'Just now', branch: 'main' },
        { id: 2, message: 'fix: Prevent AI from hallucinating XML tags', status: 'success', time: '1h ago', branch: 'main' }
      ])
      
      // Fetch Commits from the first repo as a default view
      if (Array.isArray(repoData) && repoData.length > 0) {
        const commitRes = await fetch(`https://api.github.com/repos/${repoData[0].full_name}/commits?per_page=5`, { headers })
        const commitData = await commitRes.json()
        if (Array.isArray(commitData)) {
          setCommits(commitData.map(c => ({
            id: c.sha.substring(0, 7),
            message: c.commit.message,
            author: c.commit.author.name,
            time: new Date(c.commit.author.date).toLocaleDateString()
          })))
        }
      }
    } catch (e) {
      toast.error('Failed to sync GitHub data.')
    } finally {
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    const savedToken = localStorage.getItem('aetheria_github_pat')
    if (savedToken) {
      setGithubToken(savedToken)
    }
  }, [])

  useEffect(() => {
    if (githubToken) {
      fetchGithubData()
    }
  }, [githubToken])

  const handleSaveToken = () => {
    if (tokenInput.startsWith('ghp_') || tokenInput.startsWith('github_pat_')) {
      localStorage.setItem('aetheria_github_pat', tokenInput)
      setGithubToken(tokenInput)
      toast.success('GitHub account linked successfully!')
    } else {
      toast.error('Invalid GitHub Personal Access Token format.')
    }
  }

  const handleNativeCommit = async () => {
    if (!commitMessage) {
      toast.error('Commit message cannot be empty.')
      return
    }
    
    setIsCommitting(true)
    if (typeof window !== 'undefined' && (window as any).aetheriaDesktop) {
      const command = `git add . && git commit -m "${commitMessage.replace(/"/g, '\\"')}" && git push`
      toast.info('Initializing native commit sequence...', { icon: '💻' })
      
      try {
        const res = await (window as any).aetheriaDesktop.executeCommand(command)
        if (res.success) {
          toast.success('Successfully committed and pushed to GitHub!', { icon: '🚀' })
          setCommitMessage('')
          fetchGithubData()
        } else {
          toast.error(`Commit failed: ${res.error}`)
        }
      } catch (e) {
        toast.error('IPC failure during native commit.')
      }
    } else {
      toast.error('Native committing is only available in the Desktop App (Option A). Web Fallback (Option B) coming soon.')
    }
    setIsCommitting(false)
  }

  return (
    <div className="fixed inset-y-0 right-0 w-[400px] border-l border-white/5 bg-black/60 backdrop-blur-3xl p-6 flex flex-col z-50">
      <div className="flex justify-between items-center mb-6 mt-16">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
            <GitBranch className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-wide">GITHUB MATRIX</h2>
            <p className="text-xs text-zinc-400">{githubToken ? 'Connected' : 'Not Connected'}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={fetchGithubData} className="rounded-full w-8 h-8" disabled={isRefreshing}>
            <RefreshCw className={`w-4 h-4 text-zinc-400 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full w-8 h-8 hover:bg-white/10">
            <X className="w-4 h-4 text-zinc-400" />
          </Button>
        </div>
      </div>

      <div className="flex gap-2 mb-6 bg-white/5 p-1 rounded-xl">
        {(['repos', 'deployments', 'commits', 'actions'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 text-[11px] font-semibold py-1.5 rounded-lg transition-all capitalize ${
              activeTab === tab 
                ? 'bg-indigo-500/20 text-indigo-300 shadow-md border border-indigo-500/30' 
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10 space-y-4">
        {!githubToken ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-indigo-500/20 flex items-center justify-center mb-4">
               <GitBranch className="w-8 h-8 text-indigo-400" />
            </div>
            <h3 className="text-lg font-bold text-white">Universal GitHub Access</h3>
            <p className="text-xs text-zinc-400 max-w-xs leading-relaxed">
              Generate a classic Personal Access Token with <code>repo</code> scope to manage all your repositories directly from Aetheria.
            </p>
            <div className="w-full mt-4 space-y-2">
              <Input 
                value={tokenInput} 
                onChange={e => setTokenInput(e.target.value)} 
                type="password" 
                placeholder="ghp_xxxxxxxxxxxx" 
                className="bg-black/40 border-white/10 text-xs" 
              />
              <Button onClick={handleSaveToken} className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold">Link GitHub Account</Button>
            </div>
          </motion.div>
        ) : (
          <AnimatePresence mode="wait">
            {activeTab === 'repos' && (
              <motion.div
                key="repos"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-3"
              >
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Your Repositories</h3>
                  <Button variant="outline" size="sm" className="h-6 text-[10px] border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10">
                    + New Repo
                  </Button>
                </div>
                {repos.map((repo, i) => (
                  <div key={i} className="glass-panel p-4 rounded-2xl">
                    <div className="flex justify-between items-start mb-1">
                      <a href={repo.html_url} target="_blank" rel="noreferrer" className="text-xs font-bold text-indigo-300 hover:underline">{repo.name}</a>
                      <span className="text-[10px] text-zinc-500 flex items-center gap-1"><GitBranch className="w-3 h-3" /> {repo.default_branch}</span>
                    </div>
                    <p className="text-[10px] text-zinc-400 line-clamp-2">{repo.description || 'No description provided.'}</p>
                    <div className="flex items-center gap-3 mt-3">
                      <span className="text-[10px] text-zinc-500 flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-yellow-400" /> {repo.language || 'Unknown'}</span>
                      <span className="text-[10px] text-zinc-500">⭐ {repo.stargazers_count}</span>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          {activeTab === 'deployments' && (
            <motion.div
              key="deployments"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-3"
            >
              <h3 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">Vercel Deployments</h3>
              {deployments.map((dep, i) => (
                <div key={i} className="glass-panel p-4 rounded-2xl flex items-start gap-3">
                  {dep.status === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5" />
                  ) : dep.status === 'pending' ? (
                    <Clock className="w-4 h-4 text-amber-400 mt-0.5" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-400 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-zinc-200 truncate">{dep.message}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-zinc-500">{dep.branch}</span>
                      <span className="text-[10px] text-zinc-600">•</span>
                      <span className="text-[10px] text-zinc-500">{dep.time}</span>
                    </div>
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {activeTab === 'commits' && (
            <motion.div
              key="commits"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-3"
            >
              <h3 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">Recent Commits</h3>
              {commits.map((commit, i) => (
                <div key={i} className="glass-panel p-4 rounded-2xl">
                  <div className="flex items-center gap-2 mb-2">
                    <GitCommit className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="text-[10px] font-mono text-indigo-300 bg-indigo-500/10 px-1.5 py-0.5 rounded">{commit.id}</span>
                    <span className="text-[10px] text-zinc-500 ml-auto">{commit.time}</span>
                  </div>
                  <p className="text-xs text-zinc-300 font-medium line-clamp-2">{commit.message}</p>
                  <p className="text-[10px] text-zinc-500 mt-2">By {commit.author}</p>
                </div>
              ))}
            </motion.div>
          )}

          {activeTab === 'actions' && (
            <motion.div
              key="actions"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <HUDCard title="NATIVE COMMIT">
                <div className="space-y-3">
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Aetheria will use OS-level terminal commands to seamlessly stage, commit, and push your working directory to the remote repository.
                  </p>
                  <Input
                    placeholder="Commit message (e.g., 'feat: integrate Github API')"
                    value={commitMessage}
                    onChange={(e) => setCommitMessage(e.target.value)}
                    className="bg-black/40 border-white/10 text-xs h-9 rounded-xl focus-visible:ring-indigo-500"
                  />
                  <Button 
                    onClick={handleNativeCommit} 
                    disabled={isCommitting || !commitMessage}
                    className="w-full h-9 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-semibold"
                  >
                    {isCommitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Code2 className="w-4 h-4 mr-2" />}
                    {isCommitting ? 'Committing...' : 'Commit & Push Live'}
                  </Button>
                </div>
              </HUDCard>
            </motion.div>
          )}
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}
