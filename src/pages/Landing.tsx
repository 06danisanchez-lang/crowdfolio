import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import crowdfolioLogo from '@/assets/logo_crowdfolio.svg';
import HeroSection from '@/components/landing/HeroSection';
import StatsSection from '@/components/landing/StatsSection';
import ProductShowcase from '@/components/landing/ProductShowcase';
import PlatformMarquee from '@/components/landing/PlatformMarquee';
import FeaturesGrid from '@/components/landing/FeaturesGrid';
import HowItWorks from '@/components/landing/HowItWorks';
import TestimonialCarousel from '@/components/landing/TestimonialCarousel';
import CTASection from '@/components/landing/CTASection';
import Footer from '@/components/landing/Footer';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageToggle } from '@/components/ui/LanguageToggle';

export default function Landing() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <img src={crowdfolioLogo} alt="Crowdfolio" className="h-20 md:h-24" />
          <div className="flex items-center gap-4">
            <LanguageToggle />
            <Button variant="ghost" onClick={() => navigate('/auth')}>
              {t('header.signIn')}
            </Button>
            <Button onClick={() => navigate('/auth')} className="shadow-sm">
              {t('header.getStarted')}
            </Button>
          </div>
        </div>
      </header>

      <HeroSection />
      <StatsSection />
      <ProductShowcase />
      <PlatformMarquee />
      <FeaturesGrid />
      <HowItWorks />
      <TestimonialCarousel />
      <CTASection />
      <Footer />
    </div>
  );
}
