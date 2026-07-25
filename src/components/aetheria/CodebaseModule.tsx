'use client'

import { useState, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Terminal, Play, Download, X, Code2, Folder, File, Plus, FolderPlus, FilePlus, Trash2, Loader2, Share2, ChevronRight, Circle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import Editor from '@monaco-editor/react'

// ── Language config: Judge0 language IDs ─────────────────────────────────────
const LANGUAGES: Record<string, { label: string; ext: string; judge0Id: number; monacoLang: string; starter: string }> = {
  javascript: { label: 'JavaScript (Node)', ext: 'js',   judge0Id: 63,  monacoLang: 'javascript', starter: 'console.log("Hello from Aetheria Cloud IDE!");' },
  typescript: { label: 'TypeScript',        ext: 'ts',   judge0Id: 74,  monacoLang: 'typescript', starter: 'const greet = (name: string): string => `Hello, ${name}!`;\nconsole.log(greet("Aetheria"));' },
  python:     { label: 'Python 3',          ext: 'py',   judge0Id: 71,  monacoLang: 'python',     starter: 'print("Hello from Aetheria Cloud IDE!")' },
  cpp:        { label: 'C++ 17',            ext: 'cpp',  judge0Id: 54,  monacoLang: 'cpp',        starter: '#include <iostream>\nusing namespace std;\nint main() {\n    cout << "Hello from Aetheria!" << endl;\n    return 0;\n}' },
  c:          { label: 'C',                 ext: 'c',    judge0Id: 50,  monacoLang: 'c',          starter: '#include <stdio.h>\nint main() {\n    printf("Hello from Aetheria!\\n");\n    return 0;\n}' },
  java:       { label: 'Java',              ext: 'java', judge0Id: 62,  monacoLang: 'java',       starter: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello from Aetheria!");\n    }\n}' },
  rust:       { label: 'Rust',              ext: 'rs',   judge0Id: 73,  monacoLang: 'rust',       starter: 'fn main() {\n    println!("Hello from Aetheria!");\n}' },
  go:         { label: 'Go',                ext: 'go',   judge0Id: 60,  monacoLang: 'go',         starter: 'package main\nimport "fmt"\nfunc main() {\n    fmt.Println("Hello from Aetheria!")\n}' },
  bash:       { label: 'Bash',              ext: 'sh',   judge0Id: 46,  monacoLang: 'shell',      starter: '#!/bin/bash\necho "Hello from Aetheria!"' },
}

interface FileNode {
  id: string
  name: string
  type: 'file' | 'folder'
  content?: string
  language?: string
  children?: FileNode[]
}

function genId() { return Math.random().toString(36).slice(2) }

const defaultFiles: FileNode[] = [
  {
    id: 'root',
    name: 'workspace',
    type: 'folder',
    children: [
      { id: genId(), name: 'main.py', type: 'file', language: 'python', content: LANGUAGES.python.starter },
    ]
  }
]

export default function CodebaseModule({ onClose }: { onClose?: () => void }) {
  const [files, setFiles] = useState<FileNode[]>(defaultFiles)
  const [activeFileId, setActiveFileId] = useState<string>(defaultFiles[0].children![0].id)
  const [language, setLanguage] = useState('python')
  const [output, setOutput] = useState('System Initialized. Ready for input.\n')
  const [isRunning, setIsRunning] = useState(false)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['root']))
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  // ── Get / update active file ───────────────────────────────────────────────
  const findFile = useCallback((nodes: FileNode[], id: string): FileNode | null => {
    for (const n of nodes) {
      if (n.id === id) return n
      if (n.children) { const f = findFile(n.children, id); if (f) return f }
    }
    return null
  }, [])

  const updateFileContent = (id: string, content: string) => {
    const update = (nodes: FileNode[]): FileNode[] =>
      nodes.map(n => n.id === id ? { ...n, content } : { ...n, children: n.children ? update(n.children) : undefined })
    setFiles(update)
  }

  const activeFile = findFile(files, activeFileId)
  const activeLang = activeFile?.language || language

  // ── Run via Judge0 CE (free, no whitelist) ─────────────────────────────────
  const runCode = async () => {
    if (!activeFile?.content) return
    setIsRunning(true)
    setOutput('⏳ Compiling and executing in cloud sandbox...\n')
    try {
      const langConf = LANGUAGES[activeLang]
      if (!langConf) { setOutput('Language not supported for execution.'); return }

      // Submit to Judge0 CE (free public instance)
      const submitRes = await fetch('https://judge0-ce.p.rapidapi.com/submissions?base64_encoded=false&wait=true', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'X-RapidAPI-Key': process.env.NEXT_PUBLIC_JUDGE0_KEY || 'demo',
          'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com'
        },
        body: JSON.stringify({
          language_id: langConf.judge0Id,
          source_code: activeFile.content,
        })
      })

      if (!submitRes.ok) {
        // Fallback to free Glot.io API
        await runViaGlot(activeFile.content, activeLang)
        return
      }

      const result = await submitRes.json()
      const out = result.stdout || result.stderr || result.compile_output || 'No output.'
      setOutput(out)
      if (result.stderr || result.status?.id > 3) {
        toast.error(`Exit code: ${result.status?.description || 'Error'}`)
      } else {
        toast.success('Execution complete.', { icon: '✨' })
      }
    } catch(e) {
      // Ultimate fallback: Glot.io free API
      await runViaGlot(activeFile?.content || '', activeLang)
    } finally {
      setIsRunning(false)
    }
  }

  // Fallback executor: Glot.io (free, no key required)
  const runViaGlot = async (code: string, lang: string) => {
    const glotLang: Record<string, string> = {
      python: 'python', javascript: 'javascript', typescript: 'typescript',
      cpp: 'cpp', c: 'c', rust: 'rust', go: 'go', java: 'java', bash: 'bash'
    }
    const gLang = glotLang[lang]
    if (!gLang) { setOutput('Language not supported in fallback engine.'); return }
    try {
      const res = await fetch(`https://glot.io/api/run/${gLang}/latest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: [{ name: `main.${LANGUAGES[lang]?.ext || 'txt'}`, content: code }] })
      })
      const data = await res.json()
      const out = data.stdout || data.stderr || data.error || 'No output.'
      setOutput(out)
      if (data.stderr || data.error) toast.error('Runtime error detected.')
      else toast.success('Execution complete.', { icon: '✨' })
    } catch {
      setOutput('❌ Both execution engines offline. Check internet connection.')
      toast.error('Execution failed — all engines unreachable.')
    }
  }

  // ── File operations ────────────────────────────────────────────────────────
  const addFile = (parentId: string) => {
    const newFile: FileNode = { id: genId(), name: 'untitled.py', type: 'file', language: 'python', content: '' }
    const add = (nodes: FileNode[]): FileNode[] =>
      nodes.map(n => n.id === parentId
        ? { ...n, children: [...(n.children || []), newFile] }
        : { ...n, children: n.children ? add(n.children) : undefined })
    setFiles(add)
    setActiveFileId(newFile.id)
    setRenamingId(newFile.id)
    setRenameValue(newFile.name)
  }

  const addFolder = (parentId: string) => {
    const newFolder: FileNode = { id: genId(), name: 'new-folder', type: 'folder', children: [] }
    const add = (nodes: FileNode[]): FileNode[] =>
      nodes.map(n => n.id === parentId
        ? { ...n, children: [...(n.children || []), newFolder] }
        : { ...n, children: n.children ? add(n.children) : undefined })
    setFiles(add)
    setRenamingId(newFolder.id)
    setRenameValue(newFolder.name)
  }

  const deleteNode = (id: string) => {
    const del = (nodes: FileNode[]): FileNode[] =>
      nodes.filter(n => n.id !== id).map(n => ({ ...n, children: n.children ? del(n.children) : undefined }))
    setFiles(del)
    if (activeFileId === id) setActiveFileId(defaultFiles[0].children![0].id)
  }

  const commitRename = (id: string) => {
    if (!renameValue.trim()) { setRenamingId(null); return }
    const ext = renameValue.split('.').pop() || ''
    const extToLang: Record<string, string> = { py: 'python', js: 'javascript', ts: 'typescript', cpp: 'cpp', c: 'c', java: 'java', rs: 'rust', go: 'go', sh: 'bash' }
    const detectedLang = extToLang[ext] || 'python'
    const rename = (nodes: FileNode[]): FileNode[] =>
      nodes.map(n => n.id === id
        ? { ...n, name: renameValue, language: n.type === 'file' ? detectedLang : undefined }
        : { ...n, children: n.children ? rename(n.children) : undefined })
    setFiles(rename)
    setRenamingId(null)
  }

  // ── Export active file ─────────────────────────────────────────────────────
  const handleExport = () => {
    if (!activeFile?.content) return
    const blob = new Blob([activeFile.content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = activeFile.name
    document.body.appendChild(a); a.click()
    document.body.removeChild(a); URL.revokeObjectURL(url)
    toast.success(`Exported ${activeFile.name}`)
  }

  // ── Render file tree ───────────────────────────────────────────────────────
  const renderTree = (nodes: FileNode[], depth = 0): React.ReactNode =>
    nodes.map(node => (
      <div key={node.id}>
        <div
          className={`group flex items-center gap-1.5 px-2 py-1.5 rounded-md cursor-pointer text-xs transition-all select-none ${
            activeFileId === node.id && node.type === 'file'
              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
              : 'text-zinc-400 hover:text-white hover:bg-white/5'
          }`}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
          onClick={() => {
            if (node.type === 'folder') {
              setExpandedFolders(prev => {
                const s = new Set(prev)
                s.has(node.id) ? s.delete(node.id) : s.add(node.id)
                return s
              })
            } else {
              setActiveFileId(node.id)
              if (node.language) setLanguage(node.language)
            }
          }}
          onDoubleClick={() => { setRenamingId(node.id); setRenameValue(node.name) }}
        >
          {node.type === 'folder'
            ? <><ChevronRight className={`w-3 h-3 transition-transform ${expandedFolders.has(node.id) ? 'rotate-90' : ''}`} /><Folder className="w-3.5 h-3.5 text-indigo-400" /></>
            : <><span className="w-3" /><File className="w-3 h-3" /></>
          }
          {renamingId === node.id ? (
            <input
              autoFocus
              value={renameValue}
              onChange={e => setRenameValue(e.target.value)}
              onBlur={() => commitRename(node.id)}
              onKeyDown={e => { if (e.key === 'Enter') commitRename(node.id); if (e.key === 'Escape') setRenamingId(null) }}
              onClick={e => e.stopPropagation()}
              className="flex-1 bg-transparent border-b border-indigo-500 outline-none text-white text-xs"
            />
          ) : (
            <span className="flex-1 truncate">{node.name}</span>
          )}
          {node.type === 'file' && activeFileId === node.id && <Circle className="w-1.5 h-1.5 fill-indigo-400 text-indigo-400 mr-1" />}
          <div className="hidden group-hover:flex items-center gap-0.5 ml-auto">
            {node.type === 'folder' && <>
              <button onClick={e => { e.stopPropagation(); addFile(node.id) }} className="p-0.5 hover:text-emerald-400"><FilePlus className="w-3 h-3" /></button>
              <button onClick={e => { e.stopPropagation(); addFolder(node.id) }} className="p-0.5 hover:text-yellow-400"><FolderPlus className="w-3 h-3" /></button>
            </>}
            {node.id !== 'root' && <button onClick={e => { e.stopPropagation(); deleteNode(node.id) }} className="p-0.5 hover:text-red-400"><Trash2 className="w-3 h-3" /></button>}
          </div>
        </div>
        {node.type === 'folder' && expandedFolders.has(node.id) && node.children && renderTree(node.children, depth + 1)}
      </div>
    ))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-7xl h-[92vh] bg-[#0c0c0c] border border-white/10 rounded-2xl overflow-hidden flex flex-col shadow-2xl"
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="h-12 border-b border-white/10 bg-[#111] flex items-center justify-between px-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
              <Code2 className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-white tracking-widest uppercase">Cloud IDE</h2>
              <p className="text-[9px] text-zinc-600">Aetheria Neural Core · Multi-language · No installation</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={activeLang}
              onChange={e => {
                const l = e.target.value
                setLanguage(l)
                if (activeFile) updateFileContent(activeFileId, LANGUAGES[l]?.starter || '')
              }}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-zinc-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {Object.entries(LANGUAGES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <Button onClick={runCode} disabled={isRunning} className="h-8 bg-emerald-500 hover:bg-emerald-600 text-white text-xs gap-1.5 px-4 rounded-lg shadow-lg shadow-emerald-500/20">
              {isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              {isRunning ? 'Running...' : 'Run'}
            </Button>
            <Button onClick={handleExport} variant="outline" className="h-8 border-white/10 hover:bg-white/5 text-xs gap-1.5 px-3 rounded-lg">
              <Download className="w-3.5 h-3.5" /> Export
            </Button>
            <div className="w-px h-5 bg-white/10" />
            <Button onClick={onClose} variant="ghost" size="icon" className="h-8 w-8 hover:bg-red-500/20 hover:text-red-400 rounded-lg">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* ── Body ───────────────────────────────────────────────────────── */}
        <div className="flex-1 flex min-h-0">
          {/* File Explorer */}
          <div className="w-56 border-r border-white/10 bg-[#0f0f0f] flex flex-col flex-shrink-0">
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Explorer</span>
              <div className="flex items-center gap-1">
                <button onClick={() => addFile('root')} title="New File" className="p-1 text-zinc-500 hover:text-emerald-400 transition-colors"><FilePlus className="w-3.5 h-3.5" /></button>
                <button onClick={() => addFolder('root')} title="New Folder" className="p-1 text-zinc-500 hover:text-yellow-400 transition-colors"><FolderPlus className="w-3.5 h-3.5" /></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-0.5 scrollbar-thin scrollbar-thumb-white/10">
              {renderTree(files)}
            </div>
            <div className="p-3 border-t border-white/5">
              <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                <div className="flex items-center gap-2 text-indigo-400 mb-1">
                  <Share2 className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-semibold">GitHub Sync</span>
                </div>
                <p className="text-[9px] text-zinc-500 leading-relaxed">Push workspace to any repo via GitHub Module.</p>
              </div>
            </div>
          </div>

          {/* Editor + Terminal */}
          <div className="flex-1 flex flex-col min-w-0 bg-[#1e1e1e]">
            {/* Tab bar */}
            {activeFile && (
              <div className="h-9 bg-[#161616] border-b border-white/10 flex items-center px-3 gap-1 flex-shrink-0">
                <div className="flex items-center gap-1.5 bg-[#1e1e1e] px-3 py-1 rounded-t-md text-[11px] text-indigo-300 border-t border-x border-indigo-500/30">
                  <File className="w-3 h-3" />{activeFile.name}
                </div>
              </div>
            )}
            <div className="flex-1 min-h-0">
              <Editor
                height="100%"
                language={LANGUAGES[activeLang]?.monacoLang || 'plaintext'}
                theme="vs-dark"
                value={activeFile?.content || ''}
                onChange={v => updateFileContent(activeFileId, v || '')}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                  padding: { top: 12 },
                  scrollBeyondLastLine: false,
                  smoothScrolling: true,
                  cursorBlinking: 'smooth',
                  cursorSmoothCaretAnimation: 'on',
                  formatOnPaste: true,
                  wordWrap: 'on',
                  lineNumbers: 'on',
                  folding: true,
                  bracketPairColorization: { enabled: true },
                }}
                loading={<div className="flex items-center justify-center h-full text-zinc-500 gap-2"><Loader2 className="w-5 h-5 animate-spin" /><span className="text-sm">Initializing Monaco Engine...</span></div>}
              />
            </div>
            {/* Terminal */}
            <div className="h-52 border-t border-white/10 bg-[#0a0a0a] flex flex-col flex-shrink-0">
              <div className="h-7 border-b border-white/5 flex items-center px-4 gap-4 bg-[#0f0f0f]">
                <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                  <Terminal className="w-3 h-3" /> Output Console
                </div>
                <button onClick={() => setOutput('')} className="ml-auto text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors">Clear</button>
              </div>
              <div className="flex-1 p-4 overflow-auto font-mono text-[12px] text-emerald-300/90 leading-relaxed whitespace-pre-wrap scrollbar-thin scrollbar-thumb-white/10">
                {output || <span className="text-zinc-600">No output yet. Run your code.</span>}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
