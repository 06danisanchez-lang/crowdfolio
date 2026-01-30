import { useState, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from '@/components/ui/carousel';

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
    <section className="py-16 md:py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="mb-12 text-center">
          <Badge variant="outline" className="mb-4">
            Producto
          </Badge>
          <h2 className="text-3xl font-bold md:text-4xl">
            Descubre la plataforma
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            Todo lo que necesitas en un solo lugar para gestionar tus inversiones en crowdfunding
          </p>
        </div>

        <div className="mx-auto max-w-5xl">
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
                    <div className="overflow-hidden rounded-xl border bg-background shadow-2xl">
                      <img
                        src={screenshot.src}
                        alt={screenshot.label}
                        className="w-full h-auto object-cover"
                        loading="lazy"
                      />
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="left-2 md:-left-12" />
            <CarouselNext className="right-2 md:-right-12" />
          </Carousel>

          {/* Dots indicator */}
          <div className="mt-6 flex items-center justify-center gap-2">
            {screenshots.map((_, index) => (
              <button
                key={index}
                onClick={() => api?.scrollTo(index)}
                className={`h-2 w-2 rounded-full transition-all ${
                  current === index
                    ? 'bg-primary w-6'
                    : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                }`}
                aria-label={`Ir a slide ${index + 1}`}
              />
            ))}
          </div>

          {/* Current slide label */}
          <div className="mt-4 text-center">
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
