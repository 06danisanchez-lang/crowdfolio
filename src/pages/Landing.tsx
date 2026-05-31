import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import crowdfolioLogo from '@/assets/logo_crowdfolio.svg';
import HeroSection from '@/components/landing/HeroSection';
import LandingSections from '@/components/landing/LandingSections';
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
          <img src={crowdfolioLogo} alt="Crowdfolio" className="h-7 md:h-9" />
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
      <LandingSections />
    </div>
  );
}
