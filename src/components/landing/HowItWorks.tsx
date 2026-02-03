import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { cn } from '@/lib/utils';

const steps = [
  {
    step: '1',
    title: 'Crea tu cuenta',
    description: 'Regístrate gratis en menos de 1 minuto.',
  },
  {
    step: '2',
    title: 'Añade inversiones',
    description: 'Importa o registra manualmente tus proyectos.',
  },
  {
    step: '3',
    title: 'Analiza y optimiza',
    description: 'Visualiza rendimientos y toma mejores decisiones.',
  },
];

export default function HowItWorks() {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.2 });

  return (
    <section ref={ref} className="border-y bg-muted/30 py-20 md:py-32">
      <div className="container mx-auto px-4">
        <div 
          className={cn(
            'mb-16 text-center transition-all duration-700',
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          )}
        >
          <span className="mb-4 inline-block rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
            Cómo funciona
          </span>
          <h2 className="text-3xl font-bold md:text-4xl">
            Empieza en 3 simples pasos
          </h2>
        </div>

        <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-3">
          {steps.map((item, index) => (
            <div
              key={item.step}
              className={cn(
                'group relative text-center transition-all duration-700',
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              )}
              style={{ transitionDelay: `${index * 150}ms` }}
            >
              {/* Connector line - only on desktop */}
              {index < steps.length - 1 && (
                <div className="absolute left-[calc(50%+32px)] top-7 hidden h-0.5 w-[calc(100%-64px)] bg-gradient-to-r from-primary/50 to-primary/20 md:block" />
              )}
              
              <div className="relative mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-2xl font-bold text-primary-foreground shadow-lg shadow-primary/25 transition-transform group-hover:scale-110">
                {item.step}
              </div>
              <h3 className="mb-2 text-xl font-semibold">{item.title}</h3>
              <p className="text-muted-foreground">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
