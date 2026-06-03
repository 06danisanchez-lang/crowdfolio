import { TaxSummary } from '@/types/tax';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeftRight, TrendingDown } from 'lucide-react';

interface TaxBucketsCardProps {
  summary: TaxSummary;
}

const fmt = (v: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(v);

function Row({ label, value, sub, highlight, dimmed }: {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
  dimmed?: boolean;
}) {
  return (
    <div className={`flex items-start justify-between gap-4 py-3 border-b last:border-0 ${dimmed ? 'opacity-50' : ''}`}>
      <div>
        <p className={`text-sm ${highlight ? 'font-semibold' : 'text-muted-foreground'}`}>{label}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
      <span className={`text-sm font-mono shrink-0 ${highlight ? 'font-semibold' : ''}`}>{value}</span>
    </div>
  );
}

export function TaxBucketsCard({ summary }: TaxBucketsCardProps) {
  const hasGPP = summary.totalGPPLosses < 0;
  const hasCompensacion = summary.compensacionGPPRCM > 0;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* ── RCM ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <ArrowLeftRight className="h-4 w-4 text-primary" />
            Rendimientos del Capital Mobiliario (RCM)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Row label="Intereses (crowdlending)" value={fmt(summary.interestIncome)} />
          <Row label="Dividendos" value={fmt(summary.dividendIncome)} />
          <Row label="RCM Bruto" value={fmt(summary.grossIncome)} highlight />
          {hasCompensacion && (
            <Row
              label="Compensación GPP aplicada"
              value={`− ${fmt(summary.compensacionGPPRCM)}`}
              sub="Pérdidas por impago compensadas (límite 25% RCM)"
            />
          )}
          <Row
            label={hasCompensacion ? 'Base imponible RCM ajustada' : 'Base imponible RCM'}
            value={fmt(summary.baseImponibleRCMAjustada)}
            highlight
          />
        </CardContent>
      </Card>

      {/* ── GPP ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingDown className="h-4 w-4 text-destructive" />
            Ganancias y Pérdidas Patrimoniales (GPP)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!hasGPP ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Sin pérdidas por impago deducibles en este ejercicio.
            </p>
          ) : (
            <>
              <Row
                label="Pérdidas por impago elegibles"
                value={fmt(summary.totalGPPLosses)}
                sub="Inversiones con ≥ 6 meses desde vencimiento (art. 14.2.k LIRPF)"
              />
              <Row
                label="Compensación aplicada contra RCM"
                value={hasCompensacion ? fmt(-summary.compensacionGPPRCM) : '0,00 €'}
                sub="Máximo: 25% del RCM bruto (Ley 7/2024)"
                highlight={hasCompensacion}
              />
              <Row
                label="Pérdidas pendientes de arrastrar"
                value={fmt(-summary.perdidasGPPPendientes)}
                sub="Aplicables en los 4 ejercicios fiscales siguientes"
                dimmed={summary.perdidasGPPPendientes === 0}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
