import { 
  FileText, 
  Wallet, 
  BarChart3, 
  TrendingUp, 
  Bell, 
  Shield 
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { cn } from '@/lib/utils';

const features = [
  {
    icon: FileText,
    title: 'Módulo Fiscal España',
    description: 'Exporta tus retenciones e ingresos listos para el IRPF. Clasificamos automáticamente entre capital mobiliario y ganancias patrimoniales.',
    highlight: true,
  },
  {
    icon: Wallet,
    title: 'Importación Inteligente',
    description: 'Copia y pega directamente desde la web de tu plataforma o arrastra tus PDFs. Nuestra tecnología extrae los datos por ti.',
  },
  {
    icon: BarChart3,
    title: 'Dashboard Profesional',
    description: 'Visualiza rendimientos, distribución de cartera y evolución temporal con gráficos interactivos.',
  },
  {
    icon: TrendingUp,
    title: 'Análisis de Rentabilidad',
    description: 'Calcula TIR, rendimiento anualizado y proyecciones de retorno para cada inversión.',
  },
  {
    icon: Bell,
    title: 'Alertas de Vencimientos',
    description: 'Recibe notificaciones sobre vencimientos, nuevas oportunidades y cambios en tus inversiones.',
  },
  {
    icon: Shield,
    title: 'Datos Seguros',
    description: 'Tu información está protegida con cifrado de nivel bancario y backups automáticos.',
  },
];

export default function FeaturesGrid() {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.1 });

  return (
    <section ref={ref} className="py-20 md:py-32">
      <div className="container mx-auto px-4">
        <div 
          className={cn(
            'mb-16 text-center transition-all duration-700',
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          )}
        >
          <span className="mb-4 inline-block rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
            Funcionalidades
          </span>
          <h2 className="text-3xl font-bold md:text-4xl">
            Todo lo que necesitas para gestionar tus inversiones
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            Desde el seguimiento básico hasta informes fiscales avanzados, Crowdfolio tiene todo cubierto.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <Card
              key={feature.title}
              className={cn(
                'group relative overflow-hidden border-0 bg-card/50 backdrop-blur-sm transition-all duration-500 hover:bg-card hover:shadow-xl hover:-translate-y-1',
                feature.highlight && 'md:col-span-2 lg:col-span-1',
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              )}
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
              
              <CardContent className="relative p-6">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-all group-hover:bg-primary group-hover:text-primary-foreground group-hover:shadow-lg group-hover:shadow-primary/25">
                  <feature.icon className="h-7 w-7" />
                </div>
                <h3 className="mb-2 text-xl font-semibold">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
