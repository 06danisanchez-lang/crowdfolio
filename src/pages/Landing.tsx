import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import crowdfolioLogo from '@/assets/crowdfolio-logo.png';
import HeroSection from '@/components/landing/HeroSection';
import StatsSection from '@/components/landing/StatsSection';
import ProductShowcase from '@/components/landing/ProductShowcase';
import PlatformMarquee from '@/components/landing/PlatformMarquee';
import FeaturesGrid from '@/components/landing/FeaturesGrid';
import HowItWorks from '@/components/landing/HowItWorks';
import TestimonialCarousel from '@/components/landing/TestimonialCarousel';
import CTASection from '@/components/landing/CTASection';
import Footer from '@/components/landing/Footer';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <img src={crowdfolioLogo} alt="Crowdfolio" className="h-20 md:h-24" />
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/auth')}>
              Iniciar Sesión
            </Button>
            <Button onClick={() => navigate('/auth')} className="shadow-sm">
              Empezar Gratis
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <HeroSection />

      {/* Stats Section */}
      <StatsSection />

      {/* Product Showcase */}
      <ProductShowcase />

      {/* Platforms Marquee */}
      <PlatformMarquee />

      {/* Features Section */}
      <FeaturesGrid />

      {/* How it works */}
      <HowItWorks />

      {/* Testimonials */}
      <TestimonialCarousel />

      {/* CTA Section */}
      <CTASection />

      {/* Footer */}
      <Footer />
    </div>
  );
}
