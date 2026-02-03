import { useState, useEffect, useCallback } from 'react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from '@/components/ui/carousel';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { cn } from '@/lib/utils';

import dashboardImg from '@/assets/screenshots/dashboard.jpg';
import investmentsImg from '@/assets/screenshots/investments.jpg';
import opportunitiesImg from '@/assets/screenshots/opportunities.jpg';
import taxImg from '@/assets/screenshots/tax.jpg';

const screenshots = [
  {
    src: dashboardImg,
    label: 'Dashboard principal',
    description: 'Vista general con KPIs y gráficos de rendimiento',
  },
  {
    src: investmentsImg,
    label: 'Gestión de inversiones',
    description: 'Lista completa de todos tus proyectos',
  },
  {
    src: opportunitiesImg,
    label: 'Oportunidades',
    description: 'Descubre nuevas oportunidades de inversión',
  },
  {
    src: taxImg,
    label: 'Módulo fiscal',
    description: 'Resumen fiscal y proyecciones IRPF',
  },
];

export default function ProductShowcase() {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.1 });

  const onSelect = useCallback(() => {
    if (!api) return;
    setCurrent(api.selectedScrollSnap());
  }, [api]);

  useEffect(() => {
    if (!api) return;
    onSelect();
    api.on('select', onSelect);
    return () => {
      api.off('select', onSelect);
    };
  }, [api, onSelect]);

  return (
    <section ref={ref} className="py-16 md:py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div 
          className={cn(
            'mb-12 text-center transition-all duration-700',
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          )}
        >
          <span className="mb-4 inline-block rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
            Producto
          </span>
          <h2 className="text-3xl font-bold md:text-4xl">
            Descubre la plataforma
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            Todo lo que necesitas en un solo lugar para gestionar tus inversiones en crowdfunding
          </p>
        </div>

        <div 
          className={cn(
            'mx-auto max-w-5xl transition-all duration-1000 delay-200',
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
          )}
        >
          <Carousel
            setApi={setApi}
            opts={{
              loop: true,
              align: 'center',
            }}
            className="w-full"
          >
            <CarouselContent>
              {screenshots.map((screenshot, index) => (
                <CarouselItem key={index}>
                  <div className="p-2">
                    {/* Device mockup frame */}
                    <div className="relative">
                      {/* Glow effect */}
                      <div className="absolute -inset-2 rounded-2xl bg-gradient-to-r from-primary/10 via-blue-500/10 to-violet-500/10 blur-xl opacity-50" />
                      
                      {/* Browser frame */}
                      <div className="relative overflow-hidden rounded-xl border bg-card shadow-2xl">
                        {/* Browser header */}
                        <div className="flex items-center gap-2 border-b bg-muted/50 px-3 py-2">
                          <div className="flex gap-1.5">
                            <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
                            <div className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
                            <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
                          </div>
                          <div className="ml-2 flex-1">
                            <div className="mx-auto max-w-xs rounded bg-background/50 px-3 py-0.5 text-center text-xs text-muted-foreground">
                              app.crowdfolio.es/{screenshot.label.toLowerCase().replace(/\s+/g, '-')}
                            </div>
                          </div>
                        </div>
                        
                        {/* Screenshot */}
                        <img
                          src={screenshot.src}
                          alt={screenshot.label}
                          className="w-full h-auto object-cover"
                          loading="lazy"
                        />
                      </div>
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="left-2 md:-left-12 bg-background/80 backdrop-blur-sm" />
            <CarouselNext className="right-2 md:-right-12 bg-background/80 backdrop-blur-sm" />
          </Carousel>

          {/* Thumbnail navigation */}
          <div className="mt-8 flex items-center justify-center gap-3">
            {screenshots.map((screenshot, index) => (
              <button
                key={index}
                onClick={() => api?.scrollTo(index)}
                className={cn(
                  'relative overflow-hidden rounded-lg border-2 transition-all duration-300',
                  current === index
                    ? 'border-primary shadow-lg shadow-primary/20 scale-105'
                    : 'border-transparent opacity-60 hover:opacity-100'
                )}
              >
                <img
                  src={screenshot.src}
                  alt={screenshot.label}
                  className="h-12 w-20 object-cover md:h-16 md:w-28"
                />
              </button>
            ))}
          </div>

          {/* Current slide label */}
          <div className="mt-6 text-center">
            <p className="font-semibold text-lg">{screenshots[current]?.label}</p>
            <p className="text-sm text-muted-foreground">
              {screenshots[current]?.description}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
