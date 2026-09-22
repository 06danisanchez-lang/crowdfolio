import { TaxSummary } from '@/types/tax';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeftRight, TrendingDown, AlertTriangle } from 'lucide-react';

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
  const { t } = useLanguage();
  const hasDefaultLosses = summary.totalGPPLosses < 0;
  const liqCount = summary.liquidacionSinRetencion.length;

  return (
    <div className="space-y-4">
    {liqCount > 0 && (
      <div className="flex gap-3 rounded-lg border border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30 p-3 text-sm text-amber-900 dark:text-amber-300">
        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
        <span>
          Tienes {liqCount} pago{liqCount > 1 ? 's' : ''} de cuota de liquidación sin retención previa.
          Deberás declararlos manualmente en tu IRPF — consulta con tu asesor fiscal o revisa el certificado fiscal de la plataforma.
        </span>
      </div>
    )}
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
          <Row
            label="Base imponible RCM"
            value={fmt(summary.baseImponibleRCMAjustada)}
            highlight
          />
        </CardContent>
      </Card>

      {/* ── GPP (venta de participaciones — Crowdfolio no lo calcula todavía) ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingDown className="h-4 w-4 text-destructive" />
            Ganancias y Pérdidas Patrimoniales (GPP)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground py-4 text-center">
            {t('tax.buckets.gpp.notCalculated')}
          </p>
        </CardContent>
      </Card>
    </div>

    {/* ── Pérdidas de cartera por impago — bloque propio, NO es GPP ── */}
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingDown className="h-4 w-4 text-destructive" />
          {t('tax.buckets.gpp.defaultLossesLabel')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!hasDefaultLosses ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            {t('tax.buckets.gpp.empty')}
          </p>
        ) : (
          <div className="space-y-2">
            <Row
              label={t('tax.buckets.gpp.defaultLossesLabel')}
              value={fmt(summary.totalGPPLosses)}
            />
            <p className="text-xs text-muted-foreground">
              {t('tax.buckets.gpp.defaultLossesDisclaimer')}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
    </div>
  );
}
