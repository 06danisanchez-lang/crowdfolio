import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Star, Quote } from 'lucide-react';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { cn } from '@/lib/utils';

const testimonials = [
  {
    name: 'Carlos M.',
    role: 'Inversor particular',
    avatar: 'CM',
    content: 'Por fin puedo ver todas mis inversiones en un solo sitio. La parte fiscal me ahorra horas cada año.',
    rating: 5,
  },
  {
    name: 'Laura S.',
    role: 'Inversora desde 2019',
    avatar: 'LS',
    content: 'Las alertas de vencimiento son geniales. Nunca más olvidaré renovar o retirar fondos.',
    rating: 5,
  },
  {
    name: 'Miguel A.',
    role: 'Portfolio de 15+ proyectos',
    avatar: 'MA',
    content: 'El dashboard me da una visión clara de mi diversificación. Muy recomendable.',
    rating: 5,
  },
];

export default function TestimonialCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.2 });

  const goToPrev = () => {
    setActiveIndex((prev) => (prev === 0 ? testimonials.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setActiveIndex((prev) => (prev === testimonials.length - 1 ? 0 : prev + 1));
  };

  return (
    <section ref={ref} className="py-12 md:py-16">
      <div className="container mx-auto px-4">
        <div 
          className={cn(
            'mb-12 text-center transition-all duration-700',
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          )}
        >
          <span className="mb-4 inline-block rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
            Testimonios
          </span>
          <h2 className="text-3xl font-bold md:text-4xl">
            Lo que dicen nuestros usuarios
          </h2>
        </div>

        {/* Mobile Carousel */}
        <div className="relative md:hidden">
          <div className="overflow-hidden">
            <div 
              className="flex transition-transform duration-500 ease-out"
              style={{ transform: `translateX(-${activeIndex * 100}%)` }}
            >
              {testimonials.map((testimonial) => (
                <div key={testimonial.name} className="w-full flex-shrink-0 px-2">
                  <TestimonialCard testimonial={testimonial} />
                </div>
              ))}
            </div>
          </div>
          
          {/* Navigation */}
          <div className="mt-6 flex items-center justify-center gap-4">
            <Button variant="outline" size="icon" onClick={goToPrev} className="rounded-full">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex gap-2">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setActiveIndex(index)}
                  className={cn(
                    'h-2 w-2 rounded-full transition-all',
                    index === activeIndex ? 'w-6 bg-primary' : 'bg-muted-foreground/30'
                  )}
                />
              ))}
            </div>
            <Button variant="outline" size="icon" onClick={goToNext} className="rounded-full">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Desktop Grid */}
        <div className="hidden md:grid md:grid-cols-3 md:gap-6">
          {testimonials.map((testimonial, index) => (
            <div
              key={testimonial.name}
              className={cn(
                'transition-all duration-700',
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              )}
              style={{ transitionDelay: `${index * 150}ms` }}
            >
              <TestimonialCard testimonial={testimonial} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TestimonialCard({ testimonial }: { testimonial: typeof testimonials[0] }) {
  return (
    <Card className="group relative h-full overflow-hidden border-0 bg-card/50 backdrop-blur-sm transition-all hover:bg-card hover:shadow-xl">
      <CardContent className="p-6">
        <Quote className="mb-4 h-8 w-8 text-primary/20" />
        
        <div className="mb-4 flex gap-1">
          {Array.from({ length: testimonial.rating }).map((_, i) => (
            <Star key={i} className="h-4 w-4 fill-primary text-primary" />
          ))}
        </div>
        
        <p className="mb-6 text-lg leading-relaxed text-muted-foreground">
          "{testimonial.content}"
        </p>
        
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
            {testimonial.avatar}
          </div>
          <div>
            <p className="font-semibold">{testimonial.name}</p>
            <p className="text-sm text-muted-foreground">{testimonial.role}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
