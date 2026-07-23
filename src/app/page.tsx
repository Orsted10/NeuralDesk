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
      <nav className="absolute top-0 w-full p-6 flex justify-between items-center z-50">
        <div className="font-bold text-xl tracking-tight">Aetheria</div>
        <a href="/login" className="text-sm font-medium hover:text-primary transition-colors">Sign In</a>
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
