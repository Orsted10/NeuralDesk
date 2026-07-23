import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AuthRedirect from '@/components/aetheria/AuthRedirect'
import { HeroSection, FeaturesBentoGrid, PricingSection, FooterSection } from '@/components/aetheria/LandingComponents'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  }

  return (
    <main className="min-h-screen relative overflow-hidden font-sans bg-background text-foreground">
      <AuthRedirect />
      
      {/* Top Navbar */}
      <nav className="absolute top-0 w-full p-6 flex justify-between items-center z-50">
        <div className="font-bold text-xl tracking-tight">Aetheria</div>
        <a href="/login" className="text-sm font-medium hover:text-primary transition-colors">Sign In</a>
      </nav>

      {/* Landing Page Content */}
      <HeroSection />
      <FeaturesBentoGrid />
      <PricingSection />
      <FooterSection />
      
    </main>
  )
}
