import { TaxSummary, DefaultedInvestmentLoss } from '@/types/tax';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Scale } from 'lucide-react';

interface CompensationBreakdownProps {
  summary: TaxSummary;
  defaultedInvestmentsWithLoss: DefaultedInvestmentLoss[];
}

const fmt = (v: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(v);

export function CompensationBreakdown({ summary, defaultedInvestmentsWithLoss }: CompensationBreakdownProps) {
  if (summary.compensacionGPPRCM <= 0) return null;

  const limit25 = summary.grossIncome * 0.25;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Scale className="h-4 w-4 text-primary" />
          Detalle de la Compensación GPP ↔ RCM
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Inversiones elegibles */}
        <div>
          <p className="text-sm font-medium mb-2">Inversiones con pérdida deducible este ejercicio</p>
          <div className="rounded-md border divide-y text-sm">
            {defaultedInvestmentsWithLoss.map(inv => (
              <div key={inv.investmentId} className="flex items-start justify-between gap-4 px-3 py-2.5">
                <div>
                  <p className="font-medium">{inv.projectName}</p>
                  <p className="text-xs text-muted-foreground capitalize">{inv.platform}</p>
                  <div className="flex gap-2 mt-1 flex-wrap">
                    <Badge variant="outline" className="text-xs">
                      Invertido: {fmt(inv.amountInvested)}
                    </Badge>
                    {inv.amountRecovered > 0 && (
                      <Badge variant="outline" className="text-xs">
                        Recuperado: {fmt(inv.amountRecovered)}
                      </Badge>
                    )}
                    {inv.expectedEndDate && (
                      <Badge variant="secondary" className="text-xs">
                        Vencía: {new Date(inv.expectedEndDate).toLocaleDateString('es-ES')}
                      </Badge>
                    )}
                  </div>
                </div>
                <span className="font-mono text-sm text-destructive shrink-0">
                  {fmt(inv.loss)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Cálculo paso a paso */}
        <div>
          <p className="text-sm font-medium mb-2">Cálculo de la compensación</p>
          <div className="rounded-md border divide-y text-sm">
            <div className="flex justify-between px-3 py-2.5 text-muted-foreground">
              <span>Pérdida GPP total elegible</span>
              <span className="font-mono">{fmt(summary.totalGPPLosses)}</span>
            </div>
            <div className="flex justify-between px-3 py-2.5 text-muted-foreground">
              <span>Límite compensable (25% × {fmt(summary.grossIncome)} RCM bruto)</span>
              <span className="font-mono">{fmt(limit25)}</span>
            </div>
            <div className="flex justify-between px-3 py-2.5 font-semibold text-primary">
              <span>Compensación aplicada este ejercicio</span>
              <span className="font-mono">− {fmt(summary.compensacionGPPRCM)}</span>
            </div>
            {summary.perdidasGPPPendientes > 0 && (
              <div className="flex justify-between px-3 py-2.5 text-muted-foreground">
                <span>Pendiente de arrastrar (4 ejercicios siguientes)</span>
                <span className="font-mono">{fmt(-summary.perdidasGPPPendientes)}</span>
              </div>
            )}
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Compensación cruzada GPP ↔ RCM según art. 49 LIRPF y Ley 7/2024. Consulta con tu asesor fiscal antes de aplicarla en tu declaración.
        </p>
      </CardContent>
    </Card>
  );
}
