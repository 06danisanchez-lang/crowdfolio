import { format, parseISO } from 'date-fns';
import { TaxSummary } from '@/types/tax';
import type { DefaultLossYearSummary, DefaultLossPendingRow } from '@/lib/tax/defaultLossSummary';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeftRight, TrendingDown, AlertTriangle } from 'lucide-react';

interface TaxBucketsCardProps {
  summary: TaxSummary;
  defaultLossSummary: DefaultLossYearSummary;
}

const fmt = (v: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(v);

const fmtAmount = (v: number) =>
  new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);

const fmtDate = (d: string) => format(parseISO(d), 'dd/MM/yyyy');

const TRIGGER_LABEL_KEYS: Record<string, string> = {
  quita: 'tax.defaultLoss.trigger.quita',
  insolvency_concluded: 'tax.defaultLoss.trigger.insolvencyConcluded',
  enforcement_one_year: 'tax.defaultLoss.trigger.enforcementOneYear',
};

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

function pendingReasonLabel(t: (key: string) => string, row: DefaultLossPendingRow): string {
  if (row.pendingReason === 'pending_deadline') {
    return t('defaultLoss.status.pendingDeadline').replace('{deadline}', row.deadlineDate ? fmtDate(row.deadlineDate) : '');
  }
  if (row.pendingReason === 'pending_insolvency') return t('defaultLoss.status.pendingInsolvency');
  if (row.pendingReason === 'unknown') return t('defaultLoss.status.unknown');
  return t('defaultLoss.status.notYet');
}

export function TaxBucketsCard({ summary, defaultLossSummary }: TaxBucketsCardProps) {
  const { t } = useLanguage();
  const liqCount = summary.liquidacionSinRetencion.length;
  const { year, declarable, recoveryGains, pending, notAssessed, equityExcluded } = defaultLossSummary;
  const hasAnything =
    declarable.rows.length > 0 ||
    recoveryGains.rows.length > 0 ||
    pending.length > 0 ||
    notAssessed.length > 0 ||
    equityExcluded.length > 0;

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
    <h3 className="text-lg font-semibold">{t('tax.buckets.savingsBaseTitle')}</h3>
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

    {/* ── Base imponible general — pérdidas por impago (Fase 5, art. 14.2.k LIRPF) ── */}
    <h3 className="text-lg font-semibold pt-2">{t('tax.defaultLoss.title')}</h3>
    <Card>
      <CardContent className="space-y-5 pt-6">
        {!hasAnything ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            {t('tax.defaultLoss.empty').replace('{year}', String(year))}
          </p>
        ) : (
          <>
            {declarable.rows.length > 0 && (
              <div>
                <div className="flex items-center justify-between gap-4 mb-2">
                  <p className="text-sm font-medium">{t('tax.defaultLoss.declarableTitle').replace('{year}', String(year))}</p>
                  <span className="text-sm font-mono font-semibold text-destructive shrink-0">{fmt(declarable.totalAmount)}</span>
                </div>
                <div className="rounded-md border divide-y text-sm">
                  {declarable.rows.map((r, i) => (
                    <div key={i} className="flex items-start justify-between gap-4 px-3 py-2.5">
                      <div>
                        <p className="font-medium">{r.projectName}</p>
                        <p className="text-xs text-muted-foreground">
                          {r.platform} · {t(TRIGGER_LABEL_KEYS[r.trigger])} · {fmtDate(r.triggerDate)}
                        </p>
                        {r.platformInitiatedEnforcement && r.trigger === 'enforcement_one_year' && (
                          <p className="flex items-start gap-1 text-xs text-amber-700 dark:text-amber-400 mt-1">
                            <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
                            {t('defaultLoss.result.platformEnforcementWarning')}
                          </p>
                        )}
                      </div>
                      <span className="font-mono text-sm text-destructive shrink-0">{fmt(r.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {recoveryGains.rows.length > 0 && (
              <div>
                <div className="flex items-center justify-between gap-4 mb-2">
                  <p className="text-sm font-medium">{t('tax.defaultLoss.recoveryTitle').replace('{year}', String(year))}</p>
                  <span className="text-sm font-mono font-semibold shrink-0">{fmt(recoveryGains.totalAmount)}</span>
                </div>
                <div className="space-y-2">
                  {recoveryGains.rows.map((r, i) => (
                    <p key={i} className="text-sm text-muted-foreground">
                      <span className="text-foreground font-medium">{r.projectName}:</span>{' '}
                      {t('tax.defaultLoss.recoveryGainSentence')
                        .split('{year}').join(String(r.year))
                        .replace('{amount}', fmtAmount(r.amount))
                        .replace('{lossYear}', String(r.lossYear))}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {pending.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">{t('tax.defaultLoss.pendingTitle')}</p>
                <div className="rounded-md border divide-y text-sm">
                  {pending.map((p, i) => (
                    <div key={i} className="flex items-start justify-between gap-4 px-3 py-2.5">
                      <div>
                        <p className="font-medium">{p.projectName}</p>
                        <p className="text-xs text-muted-foreground">{pendingReasonLabel(t, p)}</p>
                      </div>
                      <span className="font-mono text-sm text-muted-foreground shrink-0">{fmt(p.pendingAmount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(notAssessed.length > 0 || equityExcluded.length > 0) && (
              <div className="space-y-1.5">
                {notAssessed.map((n) => (
                  <p key={n.investmentId} className="text-xs text-muted-foreground">
                    <span className="text-foreground font-medium">{n.projectName}</span> — {t('defaultLoss.status.notAssessed')}
                  </p>
                ))}
                {equityExcluded.map((e) => (
                  <p key={e.investmentId} className="text-xs text-muted-foreground">
                    <span className="text-foreground font-medium">{e.projectName}</span> — {t('tax.defaultLoss.equityNote')}
                  </p>
                ))}
              </div>
            )}
          </>
        )}
        <p className="text-xs text-muted-foreground pt-2 border-t">{t('tax.defaultLoss.compensationNote')}</p>
      </CardContent>
    </Card>
    </div>
  );
}
