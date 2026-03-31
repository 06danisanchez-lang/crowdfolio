import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowRight, TrendingUp, Building2, ArrowLeftRight, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface TaxBucketsCardProps {
  taxResult: null;
}

export function TaxBucketsCard({ taxResult }: TaxBucketsCardProps) {
  if (!taxResult) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">No hay datos fiscales disponibles</p>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const { rcm, gpp, compensation, lossesCarried, taxableBase } = taxResult;

  // Calculate percentages for visual representation
  const totalPositive = Math.max(rcm.grossBalance, 0) + Math.max(gpp.grossBalance, 0);
  const rcmPercent = totalPositive > 0 ? (Math.max(rcm.netBalance, 0) / totalPositive) * 100 : 50;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowLeftRight className="h-5 w-5" />
          Cajones Fiscales IRPF
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-sm">
                <p>
                  El IRPF divide las rentas del ahorro en dos cajones: 
                  <strong> RCM</strong> (intereses y dividendos) y 
                  <strong> GPP</strong> (ganancias y pérdidas por ventas). 
                  Las pérdidas de un cajón pueden compensar hasta el 25% de los beneficios del otro.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* RCM Bucket */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              <div>
                <h4 className="font-semibold">RCM - Rendimientos del Capital Mobiliario</h4>
                <p className="text-xs text-muted-foreground">Intereses y dividendos</p>
              </div>
            </div>
            <Badge variant={rcm.netBalance >= 0 ? 'default' : 'destructive'}>
              {formatCurrency(rcm.netBalance)}
            </Badge>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-muted-foreground">Intereses</p>
              <p className="font-medium text-green-600 dark:text-green-400">
                +{formatCurrency(rcm.interestIncome)}
              </p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-muted-foreground">Dividendos</p>
              <p className="font-medium text-green-600 dark:text-green-400">
                +{formatCurrency(rcm.dividendIncome)}
              </p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-muted-foreground">Gastos deducibles</p>
              <p className="font-medium text-red-600 dark:text-red-400">
                -{formatCurrency(rcm.deductibleExpenses)}
              </p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-muted-foreground">Saldo bruto</p>
              <p className="font-medium">{formatCurrency(rcm.grossBalance)}</p>
            </div>
          </div>
        </div>

        {/* Visual Separator with Arrow */}
        <div className="relative flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-dashed border-muted-foreground/30" />
          </div>
          {compensation.crossBucketAmount > 0 && (
            <div className="relative flex items-center gap-2 bg-background px-3">
              <ArrowRight className={cn(
                "h-4 w-4",
                compensation.crossBucketDirection === 'RCM_TO_GPP' 
                  ? "rotate-90 text-blue-500" 
                  : "-rotate-90 text-purple-500"
              )} />
              <span className="text-xs font-medium text-muted-foreground">
                Compensación: {formatCurrency(compensation.crossBucketAmount)}
              </span>
            </div>
          )}
        </div>

        {/* GPP Bucket */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-purple-500" />
              <div>
                <h4 className="font-semibold">GPP - Ganancias y Pérdidas Patrimoniales</h4>
                <p className="text-xs text-muted-foreground">Ventas de participaciones</p>
              </div>
            </div>
            <Badge variant={gpp.netBalance >= 0 ? 'default' : 'destructive'}>
              {formatCurrency(gpp.netBalance)}
            </Badge>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-muted-foreground">Ganancias</p>
              <p className="font-medium text-green-600 dark:text-green-400">
                +{formatCurrency(gpp.gains)}
              </p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-muted-foreground">Pérdidas</p>
              <p className="font-medium text-red-600 dark:text-red-400">
                -{formatCurrency(Math.abs(gpp.losses))}
              </p>
            </div>
          </div>
        </div>

        {/* Compensation Summary with 25% Progress */}
        {compensation.crossBucketAmount > 0 && (
          <div className="rounded-lg border border-dashed border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h5 className="font-medium flex items-center gap-2">
                <ArrowLeftRight className="h-4 w-4 text-amber-600" />
                Compensación Cruzada Aplicada
              </h5>
              <Badge variant="outline" className="text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700">
                Límite 25%
              </Badge>
            </div>
            
            <p className="text-sm text-muted-foreground">
              {compensation.crossBucketDirection === 'RCM_TO_GPP' 
                ? `Las pérdidas de RCM compensan ${formatCurrency(compensation.crossBucketAmount)} de los beneficios de GPP`
                : `Las pérdidas de GPP compensan ${formatCurrency(compensation.crossBucketAmount)} de los beneficios de RCM`
              }
            </p>

            {/* Progress bar showing 25% limit usage */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Compensación usada</span>
                <span>{((compensation.crossBucketAmount / compensation.maxCrossBucket) * 100).toFixed(0)}% del límite</span>
              </div>
              <Progress 
                value={(compensation.crossBucketAmount / compensation.maxCrossBucket) * 100} 
                className="h-2"
              />
              <div className="flex justify-between text-xs">
                <span className="text-green-600 dark:text-green-400 font-medium">
                  {formatCurrency(compensation.crossBucketAmount)} compensado
                </span>
                <span className="text-muted-foreground">
                  Máximo: {formatCurrency(compensation.maxCrossBucket)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Losses Carried Forward */}
        {(lossesCarried.toNextYears.rcm > 0 || lossesCarried.toNextYears.gpp > 0) && (
          <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 p-4">
            <h5 className="font-medium text-amber-800 dark:text-amber-200 mb-2">
              Pérdidas a Compensar en Próximos Años
            </h5>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {lossesCarried.toNextYears.rcm > 0 && (
                <div>
                  <p className="text-amber-700 dark:text-amber-300">RCM pendiente</p>
                  <p className="font-medium">{formatCurrency(lossesCarried.toNextYears.rcm)}</p>
                </div>
              )}
              {lossesCarried.toNextYears.gpp > 0 && (
                <div>
                  <p className="text-amber-700 dark:text-amber-300">GPP pendiente</p>
                  <p className="font-medium">{formatCurrency(lossesCarried.toNextYears.gpp)}</p>
                </div>
              )}
            </div>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
              Estas pérdidas podrán compensarse en los 4 años siguientes.
            </p>
          </div>
        )}

        {/* Final Taxable Base */}
        <div className="rounded-lg bg-primary/10 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h5 className="font-semibold">Base Imponible del Ahorro</h5>
              <p className="text-xs text-muted-foreground">RCM + GPP (después de compensaciones)</p>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(taxableBase)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
