import { FileText, Wallet, BarChart3, TrendingUp, Bell, Shield } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

export default function FeaturesGrid() {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.1 });
  const { t } = useLanguage();

  const features = [
    { icon: FileText, title: t('features.f1.title'), description: t('features.f1.desc'), highlight: true },
    { icon: Wallet, title: t('features.f2.title'), description: t('features.f2.desc') },
    { icon: BarChart3, title: t('features.f3.title'), description: t('features.f3.desc') },
    { icon: TrendingUp, title: t('features.f4.title'), description: t('features.f4.desc') },
    { icon: Bell, title: t('features.f5.title'), description: t('features.f5.desc') },
    { icon: Shield, title: t('features.f6.title'), description: t('features.f6.desc') },
  ];

  return (
    <section ref={ref} className="py-12 md:py-16">
      <div className="container mx-auto px-4">
        <div 
          className={cn(
            'mb-16 text-center transition-all duration-700',
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          )}
        >
          <span className="mb-4 inline-block rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
            {t('features.sectionBadge')}
          </span>
          <h2 className="text-3xl font-bold md:text-4xl">
            {t('features.sectionTitle')}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            {t('features.sectionDesc')}
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
