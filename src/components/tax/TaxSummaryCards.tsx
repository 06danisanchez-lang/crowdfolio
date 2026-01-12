import { TaxSummary } from '@/types/tax';
import { Card, CardContent } from '@/components/ui/card';
import { Euro, TrendingUp, TrendingDown, Receipt, Calculator, Percent } from 'lucide-react';

interface TaxSummaryCardsProps {
  summary: TaxSummary;
}

export function TaxSummaryCards({ summary }: TaxSummaryCardsProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const cards = [
    {
      title: 'Rendimientos Brutos',
      value: formatCurrency(summary.grossIncome),
      subtitle: 'Intereses + Dividendos',
      icon: TrendingUp,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-950/30',
    },
    {
      title: 'Retenciones Practicadas',
      value: formatCurrency(summary.withholdingsApplied),
      subtitle: 'Ya retenido por plataformas',
      icon: TrendingDown,
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-50 dark:bg-orange-950/30',
    },
    {
      title: 'Gastos Deducibles',
      value: formatCurrency(summary.deductibleExpenses),
      subtitle: 'Reduce tu base imponible',
      icon: Receipt,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    },
    {
      title: 'Base Imponible',
      value: formatCurrency(summary.taxableBase),
      subtitle: 'Brutos - Gastos',
      icon: Euro,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-950/30',
    },
    {
      title: 'Cuota IRPF Estimada',
      value: formatCurrency(summary.estimatedTax),
      subtitle: 'Según tramos del ahorro',
      icon: Calculator,
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-50 dark:bg-red-950/30',
    },
    {
      title: 'Tipo Efectivo',
      value: `${summary.effectiveRate.toFixed(1)}%`,
      subtitle: 'Sobre base imponible',
      icon: Percent,
      color: 'text-slate-600 dark:text-slate-400',
      bgColor: 'bg-slate-50 dark:bg-slate-950/30',
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {cards.map((card) => (
        <Card key={card.title} className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">{card.title}</p>
                <p className="text-xl font-bold">{card.value}</p>
                <p className="text-xs text-muted-foreground">{card.subtitle}</p>
              </div>
              <div className={`rounded-lg p-2 ${card.bgColor}`}>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
