'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Terminal, Play, Save, Download, X, Code2, Folder, File, Maximize2, Loader2, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import Editor, { useMonaco } from '@monaco-editor/react'

export default function CodebaseModule({ onClose }: { onClose?: () => void }) {
  const [code, setCode] = useState('// Welcome to Aetheria Cloud IDE\n// Write code here and click Run (Powered by Piston API)\n\nconsole.log("Hello, World!");\n')
  const [language, setLanguage] = useState('javascript')
  const [output, setOutput] = useState('System Initialized. Ready for input.\n')
  const [isRunning, setIsRunning] = useState(false)
  
  // Piston API Language mapping
  const languageMap: Record<string, { lang: string, version: string }> = {
    'javascript': { lang: 'javascript', version: '18.15.0' },
    'python': { lang: 'python', version: '3.10.0' },
    'typescript': { lang: 'typescript', version: '5.0.3' },
    'cpp': { lang: 'cpp', version: '10.2.0' },
    'java': { lang: 'java', version: '15.0.2' },
  }

  const runCode = async () => {
    setIsRunning(true)
    setOutput('Compiling and running in cloud environment...\n')
    try {
      const execConf = languageMap[language]
      const res = await fetch('https://emkc.org/api/v2/piston/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          language: execConf.lang,
          version: execConf.version,
          files: [
            {
              name: `main.${language === 'python' ? 'py' : language === 'javascript' ? 'js' : language === 'typescript' ? 'ts' : language === 'cpp' ? 'cpp' : 'java'}`,
              content: code
            }
          ]
        })
      })

      const data = await res.json()
      
      if (data.run && data.run.output) {
        setOutput(data.run.output)
        if (data.run.code !== 0) {
          toast.error(`Process exited with code ${data.run.code}`)
        } else {
          toast.success('Execution completed.', { icon: '✨' })
        }
      } else if (data.message) {
        setOutput(`Error: ${data.message}`)
      }
    } catch (e) {
      setOutput('Failed to connect to execution engine. Ensure you have an active internet connection.')
      toast.error('Execution failed.')
    } finally {
      setIsRunning(false)
    }
  }

  const handleExport = () => {
    const blob = new Blob([code], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `aetheria_script.${language === 'python' ? 'py' : language === 'javascript' ? 'js' : language === 'typescript' ? 'ts' : language === 'cpp' ? 'cpp' : 'java'}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success('File exported successfully.')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-6xl h-[85vh] bg-black/80 border border-white/10 rounded-2xl overflow-hidden flex flex-col shadow-2xl"
      >
        {/* IDE Header */}
        <div className="h-14 border-b border-white/10 bg-white/5 flex items-center justify-between px-4 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
              <Code2 className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">CLOUD IDE</h2>
              <p className="text-[10px] text-zinc-400">Powered by Aetheria Neural Core</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <select 
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="bg-black/50 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-zinc-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="javascript">JavaScript (Node)</option>
              <option value="typescript">TypeScript</option>
              <option value="python">Python 3</option>
              <option value="cpp">C++</option>
              <option value="java">Java</option>
            </select>
            
            <Button onClick={runCode} disabled={isRunning} className="h-8 bg-emerald-500 hover:bg-emerald-600 text-white text-xs gap-2 rounded-lg">
              {isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              {isRunning ? 'Running...' : 'Run'}
            </Button>
            
            <Button onClick={handleExport} variant="outline" className="h-8 border-white/10 hover:bg-white/5 text-xs gap-2 rounded-lg">
              <Download className="w-3.5 h-3.5" />
              Export
            </Button>
            
            <div className="w-px h-6 bg-white/10 mx-2" />
            
            <Button onClick={onClose} variant="ghost" size="icon" className="h-8 w-8 hover:bg-red-500/20 hover:text-red-400 rounded-lg transition-colors">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* IDE Body */}
        <div className="flex-1 flex min-h-0">
          {/* File Explorer Sidebar */}
          <div className="w-64 border-r border-white/10 bg-black/20 p-4 flex flex-col gap-4">
            <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Explorer</div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs text-zinc-300 hover:text-white hover:bg-white/5 px-2 py-1.5 rounded-md cursor-pointer transition-colors">
                <Folder className="w-3.5 h-3.5 text-indigo-400" />
                <span>workspace</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-indigo-300 bg-indigo-500/10 px-2 py-1.5 rounded-md cursor-pointer ml-4 border border-indigo-500/20">
                <File className="w-3 h-3" />
                <span>main.{language === 'python' ? 'py' : language === 'javascript' ? 'js' : language === 'typescript' ? 'ts' : language === 'cpp' ? 'cpp' : 'java'}</span>
              </div>
            </div>
            
            <div className="mt-auto">
              <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-indigo-400">
                  <Share2 className="w-4 h-4" />
                  <span className="text-xs font-semibold">GitHub Sync</span>
                </div>
                <p className="text-[10px] text-zinc-400 leading-relaxed">
                  Export this workspace directly to your GitHub repositories using the Universal GitHub Module.
                </p>
              </div>
            </div>
          </div>

          {/* Editor Area */}
          <div className="flex-1 flex flex-col min-w-0 bg-[#1e1e1e]">
            <div className="flex-1 min-h-0 pt-2">
              <Editor
                height="100%"
                language={language}
                theme="vs-dark"
                value={code}
                onChange={(value) => setCode(value || '')}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                  padding: { top: 16 },
                  scrollBeyondLastLine: false,
                  smoothScrolling: true,
                  cursorBlinking: "smooth",
                  cursorSmoothCaretAnimation: "on",
                  formatOnPaste: true,
                }}
                loading={
                  <div className="flex items-center justify-center h-full text-zinc-500 gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-sm font-medium">Initializing Monaco Engine...</span>
                  </div>
                }
              />
            </div>
            
            {/* Terminal Area */}
            <div className="h-64 border-t border-white/10 bg-[#0d0d0d] flex flex-col">
              <div className="h-8 border-b border-white/5 flex items-center px-4 gap-4 bg-[#111111]">
                <div className="text-[10px] font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                  <Terminal className="w-3 h-3" />
                  Output Console
                </div>
              </div>
              <div className="flex-1 p-4 overflow-auto font-mono text-[13px] text-zinc-300 leading-relaxed whitespace-pre-wrap">
                {output}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
