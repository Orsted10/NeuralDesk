import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-[#0a0a0f] text-cyan-500/80 p-8 md:p-16 flex flex-col items-center justify-center font-mono relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-cyan-900/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-4xl mx-auto z-10 flex flex-col items-center text-center space-y-8">
        <div className="border border-cyan-500/30 p-8 bg-black/40 backdrop-blur-md rounded-lg shadow-[0_0_30px_rgba(0,242,255,0.1)]">
          <h1 className="text-4xl md:text-6xl font-bold text-cyan-400 mb-4 tracking-tighter uppercase">
            JARVIS
          </h1>
          <h2 className="text-xl md:text-2xl text-cyan-300 mb-8 tracking-widest uppercase">
            Intelligent Task Automation Ecosystem
          </h2>
          
          <div className="text-left space-y-6 text-cyan-500/90 text-lg leading-relaxed max-w-2xl mx-auto">
            <p>
              JARVIS is an advanced personal AI assistant designed to securely interface with your digital workspace. Its primary purpose is to automate repetitive tasks and provide intelligent insights across your Google accounts.
            </p>
            
            <div>
              <h3 className="font-bold text-cyan-300 mb-2 uppercase tracking-wide">Core Capabilities:</h3>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong className="text-cyan-400">Email Management:</strong> Read, summarize, and draft responses to your Gmail.</li>
                <li><strong className="text-cyan-400">Calendar Organization:</strong> View your schedule and seamlessly add new events.</li>
                <li><strong className="text-cyan-400">Drive & Documents:</strong> Search through your Google Drive and analyze Google Docs/Sheets.</li>
                <li><strong className="text-cyan-400">YouTube Integration:</strong> Manage and interact with your YouTube account.</li>
              </ul>
            </div>

            <p className="text-sm text-cyan-500/60 pt-4">
              * Note: Access to these services requires explicit authorization via Google OAuth. Data is processed securely and is never sold or used for advertising.
            </p>
          </div>

          <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-6">
            <Link 
              href="/login" 
              className="px-8 py-4 bg-cyan-500/10 border border-cyan-500 hover:bg-cyan-500/20 text-cyan-400 font-bold tracking-widest uppercase transition-all duration-300 shadow-[0_0_15px_rgba(0,242,255,0.2)] hover:shadow-[0_0_25px_rgba(0,242,255,0.4)]"
            >
              System Login
            </Link>
            <div className="flex gap-4 text-sm">
              <Link href="/privacy" className="text-cyan-500/60 hover:text-cyan-400 underline">Privacy Policy</Link>
              <Link href="/terms" className="text-cyan-500/60 hover:text-cyan-400 underline">Terms of Service</Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
