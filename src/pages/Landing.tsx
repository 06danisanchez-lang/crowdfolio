import { useNavigate } from 'react-router-dom';
import { 
  ArrowRight, 
  BarChart3, 
  Shield, 
  Wallet, 
  TrendingUp, 
  Bell, 
  FileText,
  CheckCircle2,
  Star
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import crowdfolioLogo from '@/assets/crowdfolio-logo.png';
import ProductShowcase from '@/components/landing/ProductShowcase';

export default function Landing() {
  const navigate = useNavigate();

  const features = [
    {
      icon: FileText,
      title: 'Módulo Fiscal España',
      description: 'Exporta tus retenciones e ingresos listos para el IRPF. Clasificamos automáticamente entre capital mobiliario y ganancias patrimoniales.',
    },
    {
      icon: Wallet,
      title: 'Importación Inteligente',
      description: 'Copia y pega directamente desde la web de tu plataforma o arrastra tus PDFs. Nuestra tecnología extrae los datos por ti sin errores manuales.',
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

  const platforms = [
    'Urbanitae', 'Housers', 'Estateguru', 'Crowdcube', 
    'Brickstarter', 'WeCity', 'Civislend', 'Recrea'
  ];

  const testimonials = [
    {
      name: 'Carlos M.',
      role: 'Inversor particular',
      content: 'Por fin puedo ver todas mis inversiones en un solo sitio. La parte fiscal me ahorra horas cada año.',
      rating: 5,
    },
    {
      name: 'Laura S.',
      role: 'Inversora desde 2019',
      content: 'Las alertas de vencimiento son geniales. Nunca más olvidaré renovar o retirar fondos.',
      rating: 5,
    },
    {
      name: 'Miguel A.',
      role: 'Portfolio de 15+ proyectos',
      content: 'El dashboard me da una visión clara de mi diversificación. Muy recomendable.',
      rating: 5,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <img src={crowdfolioLogo} alt="Crowdfolio" className="h-20 md:h-24" />
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/auth')}>
              Iniciar Sesión
            </Button>
            <Button onClick={() => navigate('/auth')}>
              Empezar Gratis
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 md:py-32">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-background to-background" />
        <div className="container mx-auto px-4 text-center">
          <img 
            src={crowdfolioLogo} 
            alt="Crowdfolio" 
            className="mx-auto mb-8 h-48 md:h-64 lg:h-80 drop-shadow-lg" 
          />
          <Badge variant="secondary" className="mb-6">
            ✨ Gestión inteligente de inversiones
          </Badge>
          <h1 className="mx-auto max-w-4xl text-4xl font-bold tracking-tight md:text-6xl lg:text-7xl">
            Toda tu cartera de{' '}
            <span className="bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
              Crowdfunding
            </span>
            {' '}bajo control y lista para la Renta
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl">
            Deja atrás el caos de los Excels. Centraliza tus inversiones de Urbanitae, Wecity, Brickstarter y más en un solo cuadro de mando profesional.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button size="lg" className="gap-2 text-lg" onClick={() => navigate('/auth')}>
              Empezar a organizar mi cartera
              <ArrowRight className="h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline" className="text-lg" onClick={() => navigate('/pricing')}>
              Ver planes
            </Button>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Sin tarjeta de crédito · Configura en 2 minutos
          </p>
        </div>
      </section>

      {/* Product Showcase */}
      <ProductShowcase />

      {/* Platforms Marquee */}
      <section className="border-y bg-muted/30 py-8">
        <div className="container mx-auto px-4">
          <p className="mb-6 text-center text-sm font-medium text-muted-foreground">
            Compatible con las principales plataformas de crowdfunding
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 md:gap-8">
            {platforms.map((platform) => (
              <span 
                key={platform} 
                className="rounded-full bg-background px-4 py-2 text-sm font-medium shadow-sm grayscale transition-all duration-300 hover:grayscale-0 hover:text-primary hover:shadow-md cursor-default text-muted-foreground"
              >
                {platform}
              </span>
            ))}
            <span className="rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
              + cualquier otra
            </span>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4">
          <div className="mb-16 text-center">
            <Badge variant="outline" className="mb-4">Funcionalidades</Badge>
            <h2 className="text-3xl font-bold md:text-4xl">
              Todo lo que necesitas para gestionar tus inversiones
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              Desde el seguimiento básico hasta informes fiscales avanzados, Crowdfolio tiene todo cubierto.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <Card key={feature.title} className="group relative overflow-hidden transition-all hover:shadow-lg">
                <CardContent className="p-6">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-y bg-muted/30 py-20 md:py-32">
        <div className="container mx-auto px-4">
          <div className="mb-16 text-center">
            <Badge variant="outline" className="mb-4">Cómo funciona</Badge>
            <h2 className="text-3xl font-bold md:text-4xl">
              Empieza en 3 simples pasos
            </h2>
          </div>
          <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-3">
            {[
              { step: '1', title: 'Crea tu cuenta', desc: 'Regístrate gratis en menos de 1 minuto.' },
              { step: '2', title: 'Añade inversiones', desc: 'Importa o registra manualmente tus proyectos.' },
              { step: '3', title: 'Analiza y optimiza', desc: 'Visualiza rendimientos y toma mejores decisiones.' },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
                  {item.step}
                </div>
                <h3 className="mb-2 text-lg font-semibold">{item.title}</h3>
                <p className="text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4">
          <div className="mb-16 text-center">
            <Badge variant="outline" className="mb-4">Testimonios</Badge>
            <h2 className="text-3xl font-bold md:text-4xl">
              Lo que dicen nuestros usuarios
            </h2>
          </div>
          <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
            {testimonials.map((testimonial) => (
              <Card key={testimonial.name} className="relative">
                <CardContent className="p-6">
                  <div className="mb-4 flex gap-1">
                    {Array.from({ length: testimonial.rating }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                    ))}
                  </div>
                  <p className="mb-4 text-muted-foreground">"{testimonial.content}"</p>
                  <div>
                    <p className="font-semibold">{testimonial.name}</p>
                    <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t bg-gradient-to-b from-primary/5 to-background py-20 md:py-32">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold md:text-4xl">
            ¿Listo para tomar el control de tus inversiones?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
            Únete a cientos de inversores que ya gestionan su cartera con Crowdfolio.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4">
            <Button size="lg" className="gap-2 text-lg" onClick={() => navigate('/auth')}>
              Empezar a organizar mi cartera
              <ArrowRight className="h-5 w-5" />
            </Button>
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Plan gratuito disponible
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Sin tarjeta requerida
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Cancela cuando quieras
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <img src={crowdfolioLogo} alt="Crowdfolio" className="h-16 md:h-20" />
            <div className="flex gap-6 text-sm text-muted-foreground">
              <a href="mailto:soporte@crowdfolio.es" className="hover:text-foreground">
                Contacto
              </a>
              <button onClick={() => navigate('/pricing')} className="hover:text-foreground">
                Precios
              </button>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Crowdfolio. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
