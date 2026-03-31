import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ArrowDown, ArrowUp, Info, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface CompensationBreakdownProps {
  taxResult: null;
}

export function CompensationBreakdown({ taxResult }: CompensationBreakdownProps) {
  if (!taxResult) return null;

  const { rcm, gpp, compensation } = taxResult;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Calculate the percentage of the 25% limit that was used
  const usedPercentage = compensation.maxCrossBucket > 0 
    ? (compensation.crossBucketAmount / compensation.maxCrossBucket) * 100 
    : 0;

  // No compensation needed/possible
  if (compensation.crossBucketDirection === 'NONE') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            Compensación Cruzada
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-sm">
                  <p>
                    Las pérdidas de un cajón (RCM o GPP) pueden compensar hasta un <strong>25%</strong> 
                    de los beneficios del otro cajón. Este límite está establecido en el IRPF 2025.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg bg-muted/50 p-4 text-center">
            <p className="text-muted-foreground">
              No hay pérdidas pendientes que compensar entre cajones.
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Ambos cajones (RCM y GPP) tienen saldo positivo o cero.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isRcmToGpp = compensation.crossBucketDirection === 'RCM_TO_GPP';
  const sourceBucket = isRcmToGpp ? 'RCM' : 'GPP';
  const targetBucket = isRcmToGpp ? 'GPP' : 'RCM';
  const sourceBalance = isRcmToGpp ? rcm.grossBalance : gpp.grossBalance;
  const targetBalance = isRcmToGpp ? gpp.grossBalance : rcm.grossBalance;
  const sourceNewBalance = isRcmToGpp ? rcm.netBalance : gpp.netBalance;
  const targetNewBalance = isRcmToGpp ? gpp.netBalance : rcm.netBalance;

  // Calculate remaining uncompensated losses
  const remainingLosses = Math.abs(sourceBalance) - compensation.crossBucketAmount;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          Compensación Cruzada de Cajones
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-sm">
                <p>
                  Las pérdidas de un cajón (RCM o GPP) pueden compensar hasta un <strong>25%</strong> 
                  de los beneficios del otro cajón. Este límite está establecido en el IRPF 2025.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Visual Flow */}
        <div className="grid grid-cols-3 gap-2 items-center">
          {/* Source Bucket */}
          <div className={cn(
            "rounded-lg p-3 text-center",
            isRcmToGpp ? "bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900" 
                      : "bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900"
          )}>
            <p className="text-xs text-muted-foreground">{sourceBucket}</p>
            <p className="text-sm font-medium text-red-600 dark:text-red-400">
              {formatCurrency(sourceBalance)}
            </p>
            <ArrowDown className={cn(
              "h-4 w-4 mx-auto mt-1",
              isRcmToGpp ? "text-blue-500" : "text-purple-500"
            )} />
            <p className="text-xs font-medium mt-1">
              {formatCurrency(sourceNewBalance)}
            </p>
          </div>

          {/* Arrow */}
          <div className="flex flex-col items-center justify-center">
            <div className={cn(
              "rounded-full p-2",
              "bg-gradient-to-r",
              isRcmToGpp 
                ? "from-blue-100 to-purple-100 dark:from-blue-900/50 dark:to-purple-900/50" 
                : "from-purple-100 to-blue-100 dark:from-purple-900/50 dark:to-blue-900/50"
            )}>
              <ArrowDown className={cn(
                "h-5 w-5",
                isRcmToGpp ? "rotate-45" : "-rotate-45",
                "text-amber-600"
              )} />
            </div>
            <span className="text-sm font-bold text-amber-600 mt-1">
              {formatCurrency(compensation.crossBucketAmount)}
            </span>
          </div>

          {/* Target Bucket */}
          <div className={cn(
            "rounded-lg p-3 text-center",
            isRcmToGpp ? "bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900" 
                      : "bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900"
          )}>
            <p className="text-xs text-muted-foreground">{targetBucket}</p>
            <p className="text-sm font-medium text-green-600 dark:text-green-400">
              {formatCurrency(targetBalance)}
            </p>
            <ArrowUp className={cn(
              "h-4 w-4 mx-auto mt-1",
              isRcmToGpp ? "text-purple-500" : "text-blue-500"
            )} />
            <p className="text-xs font-medium mt-1">
              {formatCurrency(targetNewBalance)}
            </p>
          </div>
        </div>

        {/* 25% Limit Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Uso del límite del 25%</span>
            <span className="font-medium">{usedPercentage.toFixed(0)}%</span>
          </div>
          <Progress value={usedPercentage} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Compensado: {formatCurrency(compensation.crossBucketAmount)}</span>
            <span>Máximo: {formatCurrency(compensation.maxCrossBucket)}</span>
          </div>
        </div>

        {/* Explanation */}
        <div className="rounded-lg bg-muted/50 p-3 text-sm space-y-1">
          <p>
            <strong>¿Qué ha pasado?</strong>
          </p>
          <p className="text-muted-foreground">
            El cajón <strong>{sourceBucket}</strong> tenía pérdidas de {formatCurrency(Math.abs(sourceBalance))}. 
            El límite del 25% sobre los beneficios de <strong>{targetBucket}</strong> ({formatCurrency(targetBalance)}) 
            es {formatCurrency(compensation.maxCrossBucket)}.
          </p>
          <p className="text-muted-foreground">
            Se han compensado {formatCurrency(compensation.crossBucketAmount)} de las pérdidas.
            {remainingLosses > 0 && (
              <span className="text-amber-600 dark:text-amber-400">
                {' '}Quedan {formatCurrency(remainingLosses)} pendientes para los próximos 4 años.
              </span>
            )}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
