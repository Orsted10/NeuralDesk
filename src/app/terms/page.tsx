import React from 'react'

export default function TermsOfService() {
  return (
    <main className="min-h-screen bg-[#0a0a0f] text-cyan-500/80 p-8 md:p-16 font-mono">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-cyan-400 mb-8 glow-text uppercase">Terms of Service</h1>
        
        <p>Last updated: June 2026</p>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-cyan-300">1. Acceptance of Terms</h2>
          <p>
            By accessing and using Aetheria, you accept and agree to be bound by the terms and provision of this agreement.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3 text-cyan-400">2. Service Description</h2>
          <p>
            Aetheria is an advanced AI assistant designed to interface with your Google accounts to automate and streamline digital tasks. The service is provided "as is" without any warranties regarding uptime, accuracy of AI-generated content, or continuous availability.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold mb-3 text-cyan-400">3. User Responsibilities</h2>
          <p>
            You are responsible for any actions taken by Aetheria on your behalf (such as emails sent or files modified). Always verify critical AI-generated actions before execution.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3 text-cyan-400">4. Limitation of Liability</h2>
          <p>
            In no event shall Aetheria or its creators be liable for any indirect, incidental, special, or consequential damages resulting from the use or inability to use the service, or from the alteration of your data by the AI models.
          </p>
        </section>

        <div className="pt-8 border-t border-cyan-500/30">
          <a href="/" className="text-cyan-400 hover:text-cyan-300 underline">Return to System</a>
        </div>
      </div>
    </main>
  )
}
