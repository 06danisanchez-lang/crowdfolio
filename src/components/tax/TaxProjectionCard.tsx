import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Calculator, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { TaxProjection } from '@/lib/tax/projections';
import { TaxSummary } from '@/types/tax';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { PLATFORMS } from '@/types/investment';

interface TaxProjectionCardProps {
  summary: TaxSummary;
  projection: TaxProjection;
  year: number;
}

export function TaxProjectionCard({ summary, projection, year }: TaxProjectionCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const currentYear = new Date().getFullYear();
  const isCurrentYear = year === currentYear;

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
    }).format(value);

  const isRefund = projection.projectedResult < 0;
  const resultAmount = Math.abs(projection.projectedResult);

  const getPlatformLabel = (platform: string) => {
    return PLATFORMS.find(p => p.value === platform)?.label || platform;
  };

  if (!isCurrentYear) {
    return (
      <Card className="border-muted">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calculator className="h-5 w-5 text-muted-foreground" />
            Proyección de Fin de Ejercicio
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Las proyecciones solo están disponibles para el año en curso ({currentYear}).
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-background to-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calculator className="h-5 w-5 text-primary" />
            Proyección de Fin de Ejercicio {year}
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            Estimación
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Comparison Grid */}
        <div className="grid grid-cols-2 gap-6">
          {/* Current/Real */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Hasta ahora (real)</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Rendimientos</span>
                <span className="font-medium">{formatCurrency(summary.grossIncome)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Retenciones</span>
                <span className="font-medium text-orange-600">
                  -{formatCurrency(summary.withholdingsApplied)}
                </span>
              </div>
            </div>
          </div>

          {/* Projected */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Pendiente (proyectado)</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Rendimientos</span>
                <span className="font-medium text-primary">
                  +{formatCurrency(projection.projectedIncome)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Retenciones</span>
                <span className="font-medium text-orange-600">
                  -{formatCurrency(projection.projectedWithholdings)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-dashed" />

        {/* Final Result */}
        <div className="rounded-lg bg-muted/50 p-4 space-y-3">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            📈 Resultado Estimado a 31/12/{year}
          </h4>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Base imponible total</span>
              <span className="font-medium">
                {formatCurrency(projection.totalProjectedGross - summary.deductibleExpenses)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Cuota íntegra</span>
              <span className="font-medium">{formatCurrency(projection.totalProjectedTax)}</span>
            </div>
            <div className="flex justify-between">
              <span>Retenciones totales</span>
              <span className="font-medium text-orange-600">
                -{formatCurrency(summary.withholdingsApplied + projection.projectedWithholdings)}
              </span>
            </div>
          </div>

          <div className="border-t pt-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold">
                {isRefund ? 'A DEVOLVER' : 'A PAGAR'}
              </span>
              <div className="flex items-center gap-2">
                {isRefund ? (
                  <TrendingDown className="h-5 w-5 text-green-600" />
                ) : (
                  <TrendingUp className="h-5 w-5 text-red-600" />
                )}
                <span
                  className={`text-xl font-bold ${
                    isRefund ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {formatCurrency(resultAmount)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Investment Details Collapsible */}
        {projection.byInvestment.length > 0 && (
          <Collapsible open={showDetails} onOpenChange={setShowDetails}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between">
                <span className="text-sm">
                  Desglose por inversión ({projection.byInvestment.length})
                </span>
                {showDetails ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 pt-2">
              {projection.byInvestment.map((inv) => (
                <div
                  key={inv.investmentId}
                  className="flex items-center justify-between rounded-md bg-background p-3 text-sm"
                >
                  <div>
                    <p className="font-medium">{inv.projectName}</p>
                    <p className="text-xs text-muted-foreground">
                      {getPlatformLabel(inv.platform)} · {inv.monthsActive} meses
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-primary">
                      +{formatCurrency(inv.projectedAmount)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Ret: {formatCurrency(inv.projectedWithholding)}
                    </p>
                  </div>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Disclaimer */}
        <div className="flex items-start gap-2 rounded-md bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <p>
            Estimación basada en las rentabilidades esperadas de tus inversiones activas. 
            Los resultados reales pueden variar.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
