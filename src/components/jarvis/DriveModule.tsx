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

  // Intercept JARVIS event-based commands
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
    <div className="w-full flex flex-col h-full bg-black/40 border border-cyan-500/20 backdrop-blur-md rounded-lg overflow-hidden glow-border p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-4 border-b border-cyan-500/10 pb-3">
        <div className="flex gap-2 items-center">
          <HardDrive className="w-4 h-4 text-cyan-400 animate-pulse" />
          <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-cyan-400 font-mono">Neural Indexing (Google Drive)</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchFiles}
            disabled={loading}
            className="p-1 border border-cyan-500/30 hover:border-cyan-400 rounded text-cyan-400 transition-all bg-cyan-500/5 hover:bg-cyan-500/10 active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 overflow-hidden min-h-[350px]">
        {/* Left Side: Create Document Card */}
        <div className="flex flex-col bg-cyan-500/5 border border-cyan-500/20 p-4 rounded h-full justify-between">
          <div>
            <div className="flex items-center gap-1.5 mb-3">
              <Plus className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-[9px] uppercase tracking-wider font-mono font-bold text-cyan-300">Document Builder</span>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="text-[8px] uppercase tracking-wider text-cyan-500/70 block mb-1 font-mono">Document Title</label>
                <input
                  type="text"
                  placeholder="e.g., Q3 Analytics Report"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  className="w-full bg-black/60 border border-cyan-500/30 text-cyan-300 text-xs px-2.5 py-1.5 rounded focus:outline-none focus:border-cyan-400 transition-all font-mono"
                />
              </div>

              <div>
                <label className="text-[8px] uppercase tracking-wider text-cyan-500/70 block mb-1 font-mono">Content Body (HTML Supported)</label>
                <textarea
                  rows={6}
                  placeholder="Compose your document details here, Sir..."
                  value={docContent}
                  onChange={(e) => setDocContent(e.target.value)}
                  className="w-full bg-black/60 border border-cyan-500/30 text-cyan-300 text-xs px-2.5 py-1.5 rounded focus:outline-none focus:border-cyan-400 transition-all font-mono resize-none scrollbar-thin scrollbar-thumb-cyan-500/20"
                />
              </div>
            </div>
          </div>

          <button
            onClick={() => handleCreateDoc()}
            disabled={creating}
            className="w-full mt-4 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 hover:border-cyan-400 text-cyan-400 uppercase tracking-widest text-[9px] py-2 rounded transition-all font-mono flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
          >
            {creating ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Indexing Document...</span>
              </>
            ) : (
              <>
                <FileText className="w-3 h-3" />
                <span>Initialize Doc</span>
              </>
            )}
          </button>
        </div>

        {/* Right Side: Drive File Explorer List */}
        <div className="flex flex-col bg-black/40 border border-cyan-500/25 p-3 rounded h-full overflow-hidden">
          <div className="text-[9px] uppercase tracking-wider font-mono font-bold text-cyan-300 mb-2 flex justify-between">
            <span>Neural Nodes (Recent Files)</span>
            <span className="text-[8px] text-cyan-600">CAP: 10 FILES</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 scrollbar-thin scrollbar-thumb-cyan-500/20 pr-1 h-full">
            {loading && files.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
              </div>
            ) : files.length === 0 ? (
              <div className="h-full flex items-center justify-center text-cyan-700 font-mono text-[10px] text-center uppercase tracking-widest mt-12">
                No indexed files found, Sir.
              </div>
            ) : (
              <AnimatePresence>
                {files.map((file) => (
                  <motion.div
                    key={file.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-between items-center bg-cyan-500/5 hover:bg-cyan-500/10 border border-cyan-500/10 hover:border-cyan-500/30 p-2 rounded transition-all group duration-200"
                  >
                    <div className="flex gap-2 items-center overflow-hidden">
                      <div className="p-1 bg-black/40 border border-cyan-500/10 rounded">
                        {getFileIcon(file.mimeType)}
                      </div>
                      <div className="overflow-hidden">
                        <div className="text-[10px] font-mono text-cyan-300 truncate w-[160px] md:w-[190px]">
                          {file.name}
                        </div>
                        <div className="text-[8px] font-mono text-cyan-600 flex gap-2">
                          <span className="uppercase tracking-widest">{getFileBadge(file.mimeType)}</span>
                          <span>•</span>
                          <span>{new Date(file.modifiedTime).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    <a
                      href={file.webViewLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 border border-cyan-500/20 hover:border-cyan-400 rounded text-cyan-500/40 hover:text-cyan-400 bg-black/40 opacity-0 group-hover:opacity-100 transition-all active:scale-90"
                    >
                      <ExternalLink className="w-3 h-3" />
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
