import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AuthRedirect from '@/components/aetheria/AuthRedirect'
import { HeroSection, FeaturesBentoGrid, MotivesSection, TeamSection, PricingSection, FooterSection } from '@/components/aetheria/LandingComponents'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  }

  return (
    <main className="min-h-screen relative font-sans bg-background text-foreground">
      <AuthRedirect />

      {/* Ambient Global Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[20%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-primary/10 rounded-full blur-[150px] opacity-70" />
        <div className="absolute top-[0%] right-[0%] w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[120px] transform translate-x-1/3 -translate-y-1/3" />
        <div className="absolute bottom-[0%] left-[0%] w-[800px] h-[800px] bg-purple-500/10 rounded-full blur-[150px] transform -translate-x-1/3 translate-y-1/3" />
      </div>
      
      {/* Top Navbar */}
      <nav className="absolute top-0 w-full p-6 flex justify-between items-center z-50 max-w-7xl mx-auto left-1/2 -translate-x-1/2">
        <div className="flex items-center gap-2">
          <img src="/AetheriaAPP.png" alt="Aetheria Logo" className="h-8 w-auto object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.4)] brightness-[1.5]" />
          <span className="font-bold text-xl tracking-tight ml-2">Aetheria</span>
        </div>
        <div className="hidden md:flex gap-8 text-sm font-medium text-muted-foreground">
          <a href="/about" className="hover:text-foreground transition-colors">About</a>
          <a href="#architecture" className="hover:text-foreground transition-colors">Features</a>
          <a href="/#team" className="hover:text-foreground transition-colors">Team</a>
        </div>
        <a href="/login" className="text-sm font-medium hover:text-primary transition-colors bg-secondary/50 px-4 py-2 rounded-full backdrop-blur-md border border-border/50">Sign In</a>
      </nav>

      {/* Landing Page Content */}
      <div className="relative z-10">
        <HeroSection />
        <FeaturesBentoGrid />
        <MotivesSection />
        <TeamSection />
        <PricingSection />
        <FooterSection />
      </div>
      
    </main>
  )
}
