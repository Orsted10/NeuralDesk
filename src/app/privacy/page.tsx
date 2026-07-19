import React from 'react'

export default function PrivacyPolicy() {
  return (
    <main className="min-h-screen bg-[#0a0a0f] text-cyan-500/80 p-8 md:p-16 font-mono">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-cyan-400 mb-8 glow-text uppercase">Privacy Policy</h1>
        
        <p>Last updated: June 2026</p>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-cyan-300">1. Information We Collect</h2>
          <p>
            Aetheria requests access to your Google account (Gmail, Calendar, Drive, Docs, YouTube) strictly to provide AI-assisted operations on your behalf. We do not store your private emails, documents, or calendar events on our servers. Data is processed in real-time and passed to secure AI endpoints.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3 text-cyan-400">2. Local Processing (Desktop App)</h2>
          <p>
            If you are using the Aetheria Desktop App, additional context such as your active OS window, typing rhythm, and local file access is processed entirely on your local machine. This data is never sent to our servers.e your data for advertising purposes.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold mb-3 text-cyan-400">3. Third-Party AI Models</h2>
          <p>
            To generate responses and execute commands, your prompts and necessary context are securely transmitted to our AI partners (e.g., Google Gemini, Groq). By using Aetheria, you consent to this data flow.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3 text-cyan-400">4. Revoking Access</h2>
          <p>
            You can revoke Aetheria's access to your Google account at any time via your Google Account Security settings. Since we do not persistently store your private Google data, revoking access immediately ceases all data processing.
          </p>
        </section>

        <div className="pt-8 border-t border-cyan-500/30">
          <a href="/" className="text-cyan-400 hover:text-cyan-300 underline">Return to System</a>
        </div>
      </div>
    </main>
  )
}
