import BackronymHero from "@/components/BackronymHero"
import Footer from "@/components/Footer"
import ThemeToggle from "@/components/ThemeToggle"
import { FloatingParticles, NoiseOverlay, GradientBlobs } from "@/components/brand"

export default function Home() {
  return (
    <div className="relative min-h-screen bg-page">
      {/* Ambient brand layers */}
      <GradientBlobs />
      <FloatingParticles />
      <NoiseOverlay />

      {/* Theme toggle */}
      <div className="fixed top-6 right-6 z-50">
        <ThemeToggle />
      </div>

      <main className="relative z-10">
        <BackronymHero />
      </main>

      <Footer />
    </div>
  )
}
