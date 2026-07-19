'use client'

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { HardDrive, FileText, FileSpreadsheet, Presentation, Folder, Plus, Loader2, ExternalLink, RefreshCw } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface DriveFile {
  id: string
  name: string
  mimeType: string
  webViewLink: string
  iconLink?: string
  modifiedTime: string
}

export default function DriveModule() {
  const [files, setFiles] = useState<DriveFile[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  
  // Create state
  const [docTitle, setDocTitle] = useState('')
  const [docContent, setDocContent] = useState('')

  const fetchFiles = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/drive')
      const data = await res.json()
      if (data.files) {
        setFiles(data.files)
      } else if (data.error) {
        console.error(data.error)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFiles()
  }, [])

  const handleCreateDoc = async (forcedTitle?: string, forcedContent?: string, type: 'doc' | 'sheet' | 'slide' = 'doc') => {
    const title = forcedTitle || docTitle
    const content = forcedContent || docContent

    if (!title.trim()) {
      toast.error('Document title is required, Sir.')
      return
    }

    setCreating(true)
    try {
      const res = await fetch('/api/drive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, type })
      })
      const data = await res.json()
      if (data.success) {
        toast.success(`Google Doc "${title}" created successfully!`, { icon: '📝' })
        setDocTitle('')
        setDocContent('')
        fetchFiles() // refresh list
      } else {
        toast.error(data.error || 'Failed to create document.')
      }
    } catch (e) {
      console.error(e)
      toast.error('Document generation failed.')
    } finally {
      setCreating(false)
    }
  }

  // Intercept Aetheria event-based commands
  useEffect(() => {
    // Intercept mount data to avoid module switching race condition
    if (typeof window !== 'undefined' && (window as any).pendingDocData) {
      const { title, content, type } = (window as any).pendingDocData
      ;(window as any).pendingDocData = undefined
      setDocTitle(title)
      setDocContent(content || '')
      handleCreateDoc(title, content || '', type || 'doc')
    }

    const handleCreateEvent = (e: CustomEvent) => {
      const { title, content, type } = e.detail || {}
      if (title) {
        setDocTitle(title)
        setDocContent(content || '')
        handleCreateDoc(title, content || '', type || 'doc')
      }
    }
    window.addEventListener('create-doc' as any, handleCreateEvent)
    return () => window.removeEventListener('create-doc' as any, handleCreateEvent)
  }, [])

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('document')) return <FileText className="w-4 h-4 text-blue-400" />
    if (mimeType.includes('spreadsheet')) return <FileSpreadsheet className="w-4 h-4 text-green-400" />
    if (mimeType.includes('presentation')) return <Presentation className="w-4 h-4 text-yellow-400" />
    if (mimeType.includes('folder')) return <Folder className="w-4 h-4 text-cyan-400" />
    return <FileText className="w-4 h-4 text-gray-400" />
  }

  const getFileBadge = (mimeType: string) => {
    if (mimeType.includes('document')) return 'DOC'
    if (mimeType.includes('spreadsheet')) return 'SHEET'
    if (mimeType.includes('presentation')) return 'SLIDES'
    if (mimeType.includes('folder')) return 'FOLDER'
    return 'FILE'
  }

  return (
    <div className="w-full flex flex-col h-full glass-panel rounded-3xl overflow-hidden shadow-2xl p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
        <div className="flex gap-3 items-center">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
             <HardDrive className="w-5 h-5 text-indigo-400" />
          </div>
          <span className="text-lg font-semibold tracking-tight text-zinc-200">Google Workspace</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchFiles}
            disabled={loading}
            className="p-2 border border-white/10 hover:border-white/20 rounded-xl text-zinc-400 transition-all bg-white/[0.03] hover:bg-white/[0.08] active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 overflow-hidden min-h-[350px]">
        {/* Left Side: Create Document Card */}
        <div className="flex flex-col glass-card border border-white/5 p-5 rounded-2xl h-full justify-between shadow-inner">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Plus className="w-4 h-4 text-indigo-400" />
              <span className="text-sm font-semibold text-zinc-300">Document Builder</span>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold tracking-wide text-zinc-400 block mb-1.5 ml-1">Document Title</label>
                <input
                  type="text"
                  placeholder="e.g., Q3 Analytics Report"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  className="w-full glass-input text-zinc-200 text-sm px-4 py-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all placeholder-zinc-600"
                />
              </div>

              <div>
                <label className="text-xs font-semibold tracking-wide text-zinc-400 block mb-1.5 ml-1">Content Body (HTML Supported)</label>
                <textarea
                  rows={6}
                  placeholder="Compose your document details here..."
                  value={docContent}
                  onChange={(e) => setDocContent(e.target.value)}
                  className="w-full glass-input text-zinc-200 text-sm px-4 py-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all resize-none scrollbar-thin scrollbar-thumb-white/10 placeholder-zinc-600"
                />
              </div>
            </div>
          </div>

          <button
            onClick={() => handleCreateDoc()}
            disabled={creating}
            className="w-full mt-4 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold text-sm py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
          >
            {creating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Creating...</span>
              </>
            ) : (
              <>
                <FileText className="w-4 h-4" />
                <span>Initialize Doc</span>
              </>
            )}
          </button>
        </div>

        {/* Right Side: Drive File Explorer List */}
        <div className="flex flex-col glass-card border border-white/5 p-4 rounded-2xl h-full overflow-hidden shadow-inner">
          <div className="text-sm font-semibold text-zinc-300 mb-3 flex justify-between px-2">
            <span>Recent Files</span>
            <span className="text-xs text-zinc-500 font-medium">10 Files Max</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 scrollbar-thin scrollbar-thumb-white/10 pr-2 h-full">
            {loading && files.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
              </div>
            ) : files.length === 0 ? (
              <div className="h-full flex items-center justify-center text-zinc-500 font-medium text-sm text-center mt-12">
                No files found.
              </div>
            ) : (
              <AnimatePresence>
                {files.map((file) => (
                  <motion.div
                    key={file.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-between items-center glass-input border border-transparent hover:border-white/10 p-3 rounded-xl transition-all group duration-200"
                  >
                    <div className="flex gap-3 items-center overflow-hidden">
                      <div className="p-2 bg-white/5 rounded-lg border border-white/5">
                        {getFileIcon(file.mimeType)}
                      </div>
                      <div className="overflow-hidden">
                        <div className="text-sm font-semibold text-zinc-200 truncate w-[160px] md:w-[190px]">
                          {file.name}
                        </div>
                        <div className="text-xs font-medium text-zinc-500 flex gap-2 mt-0.5">
                          <span className="tracking-wide">{getFileBadge(file.mimeType)}</span>
                          <span>•</span>
                          <span>{new Date(file.modifiedTime).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    <a
                      href={file.webViewLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 border border-white/10 hover:border-white/20 rounded-lg text-zinc-500 hover:text-zinc-200 bg-white/5 opacity-0 group-hover:opacity-100 transition-all active:scale-90"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
