import { useNavigate } from 'react-router-dom';
import { ArrowRight, Check, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AnimatedBackground from './AnimatedBackground';
import dashboardImg from '@/assets/screenshots/dashboard.jpg';

import crowdfolioLogo from '@/assets/crowdfolio-logo.png';

export default function HeroSection() {
  const navigate = useNavigate();

  return (
    <section className="relative overflow-hidden py-12 md:py-16 lg:py-20">
      <AnimatedBackground />
      
      <div className="container relative mx-auto px-4">
        <div className="mx-auto max-w-4xl text-center">
          {/* Central Logo */}
          <div className="mb-6">
            <img 
              src={crowdfolioLogo} 
              alt="Crowdfolio" 
              className="mx-auto h-24 md:h-32 lg:h-40"
            />
          </div>

          {/* Badge */}
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-medium text-primary backdrop-blur-sm animate-pulse-soft">
            <Sparkles className="h-4 w-4" />
            <span>Gestión inteligente de inversiones</span>
          </div>

          {/* Main Headline */}
          <h1 className="mb-4 text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl xl:text-7xl">
            Toda tu cartera de{' '}
            <span className="relative">
              <span className="bg-gradient-to-r from-primary via-blue-500 to-violet-500 bg-clip-text text-transparent">
                crowdfunding
              </span>
              <svg
                className="absolute -bottom-2 left-0 w-full"
                viewBox="0 0 300 12"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M2 10C50 4 100 2 150 6C200 10 250 8 298 4"
                  stroke="url(#gradient)"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="hsl(217 91% 60%)" />
                    <stop offset="50%" stopColor="hsl(221 83% 53%)" />
                    <stop offset="100%" stopColor="hsl(250 83% 60%)" />
                  </linearGradient>
                </defs>
              </svg>
            </span>{' '}
            <br className="hidden sm:block" />
            en un solo lugar.
          </h1>

          {/* Subheadline */}
          <p className="mx-auto mb-4 max-w-2xl text-lg text-muted-foreground md:text-xl">
            Centraliza y controla todas tus inversiones desde un único panel.
          </p>

          {/* Value bullets */}
          <ul className="mx-auto mb-6 flex max-w-xl flex-col items-start gap-2 text-left text-muted-foreground">
            <li className="flex items-center gap-2">
              <Check className="h-5 w-5 shrink-0 text-primary" />
              <span>Informe fiscal automático de todas tus inversiones</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-5 w-5 shrink-0 text-primary" />
              <span>Centralización de todas tus plataformas de crowdfunding</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-5 w-5 shrink-0 text-primary" />
              <span>Acceso a nuevas oportunidades de inversión</span>
            </li>
          </ul>

          {/* CTAs */}
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button 
              size="lg" 
              className="group gap-2 text-lg shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30"
              onClick={() => navigate('/auth')}
            >
              Crea una cuenta gratis
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="text-lg backdrop-blur-sm"
              onClick={() => navigate('/pricing')}
            >
              Ver precios
            </Button>
          </div>

          {/* Trust line */}
          <p className="mt-6 text-sm text-muted-foreground">
            Sin tarjeta de crédito · Configura en 2 minutos · Cancela cuando quieras
          </p>
        </div>

        {/* Dashboard Mockup */}
        <div className="relative mx-auto mt-10 max-w-5xl md:mt-12">
          {/* Glow effect behind */}
          <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-primary/20 via-blue-500/20 to-violet-500/20 blur-2xl" />
          
          {/* Browser frame */}
          <div className="relative overflow-hidden rounded-2xl border bg-card shadow-2xl">
            {/* Browser header */}
            <div className="flex items-center gap-2 border-b bg-muted/50 px-4 py-3">
              <div className="flex gap-1.5">
                <div className="h-3 w-3 rounded-full bg-red-400" />
                <div className="h-3 w-3 rounded-full bg-yellow-400" />
                <div className="h-3 w-3 rounded-full bg-green-400" />
              </div>
              <div className="ml-4 flex-1">
                <div className="mx-auto max-w-md rounded-md bg-background/50 px-4 py-1 text-center text-xs text-muted-foreground">
                  app.crowdfolio.es
                </div>
              </div>
            </div>
            
            {/* Screenshot */}
            <img
              src={dashboardImg}
              alt="Crowdfolio Dashboard"
              className="w-full"
              loading="eager"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
