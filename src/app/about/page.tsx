import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function AboutPage() {
  return (
    <main className="min-h-screen relative p-8 md:p-24 flex flex-col items-center">
      <div className="w-full max-w-4xl space-y-12">
        <Link href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>

        <h1 className="text-4xl md:text-6xl font-bold tracking-tight">The Vision of Ambient Compute</h1>
        
        <div className="prose prose-invert prose-lg max-w-none text-muted-foreground">
          <p className="mb-6">
            The current paradigm of interacting with computers is highly manual. We open apps, we click buttons, and recently, we type complex prompts into chat boxes. 
            Aetheria is an attempt to move past the "Screen Era" and into the "Ambient Era."
          </p>
          <p className="mb-6">
            By securely connecting to your primary data streams—Slack, Notion, Gmail, WhatsApp—Aetheria creates a living vector map of your digital life. 
            This allows it to act proactively, rather than reactively. It doesn't wait for your prompt; it anticipates your needs based on the context of your current work.
          </p>
          <h3 className="text-2xl font-bold text-foreground mt-12 mb-4">Privacy Architecture</h3>
          <p>
            With such deep integration comes the absolute necessity for privacy. Aetheria's core engine runs on strict access-control layers, 
            ensuring your data is never used to train third-party models and is always sandboxed within your secure node.
          </p>
        </div>
      </div>
    </main>
  )
}
