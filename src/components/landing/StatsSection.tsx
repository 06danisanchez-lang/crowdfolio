import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { cn } from '@/lib/utils';
import { Users, Euro, Building2, Star } from 'lucide-react';

const stats = [
  {
    icon: Users,
    value: '500+',
    label: 'Inversores activos',
    description: 'Confían en nosotros',
  },
  {
    icon: Euro,
    value: '€2M+',
    label: 'Inversiones gestionadas',
    description: 'En seguimiento',
  },
  {
    icon: Building2,
    value: '15+',
    label: 'Plataformas',
    description: 'Compatibles',
  },
  {
    icon: Star,
    value: '4.9/5',
    label: 'Valoración media',
    description: 'De usuarios',
  },
];

export default function StatsSection() {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.2 });

  return (
    <section ref={ref} className="py-10 md:py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4 md:gap-8">
          {stats.map((stat, index) => (
            <div
              key={stat.label}
              className={cn(
                'group relative overflow-hidden rounded-2xl bg-card p-6 text-center shadow-lg transition-all duration-500 hover:shadow-xl hover:-translate-y-1',
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              )}
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              {/* Gradient background on hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
              
              <div className="relative">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <stat.icon className="h-6 w-6" />
                </div>
                <p className="text-3xl font-bold tracking-tight md:text-4xl">{stat.value}</p>
                <p className="mt-1 font-medium text-foreground">{stat.label}</p>
                <p className="text-sm text-muted-foreground">{stat.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
