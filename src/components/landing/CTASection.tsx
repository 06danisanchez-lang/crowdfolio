import { useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { cn } from '@/lib/utils';

const benefits = [
  'Plan gratuito disponible',
  'Sin tarjeta requerida',
  'Cancela cuando quieras',
];

export default function CTASection() {
  const navigate = useNavigate();
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.2 });

  return (
    <section 
      ref={ref} 
      className="relative overflow-hidden border-t py-12 md:py-16"
    >
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-blue-500/5 to-violet-500/10" />
      
      {/* Floating orbs */}
      <div className="absolute left-10 top-20 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
      <div className="absolute bottom-10 right-10 h-48 w-48 rounded-full bg-violet-500/20 blur-3xl" />
      
      <div className="container relative mx-auto px-4 text-center">
        <div
          className={cn(
            'transition-all duration-700',
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          )}
        >
          <h2 className="text-3xl font-bold md:text-4xl lg:text-5xl">
            ¿Listo para tomar el control de tus inversiones?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
            Únete a cientos de inversores que ya gestionan su cartera con Crowdfolio.
          </p>
          
          <div className="mt-10 flex flex-col items-center gap-4">
            <Button 
              size="lg" 
              className="group gap-2 px-8 text-lg shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30"
              onClick={() => navigate('/auth')}
            >
              Empezar a organizar mi cartera
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Button>
            
            <div className="mt-4 flex flex-wrap items-center justify-center gap-6">
              {benefits.map((benefit, index) => (
                <span 
                  key={benefit}
                  className={cn(
                    'flex items-center gap-2 text-sm text-muted-foreground transition-all duration-500',
                    isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                  )}
                  style={{ transitionDelay: `${300 + index * 100}ms` }}
                >
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  {benefit}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
