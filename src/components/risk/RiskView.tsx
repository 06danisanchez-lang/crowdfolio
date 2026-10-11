import { useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { AlertTriangle, CheckCircle2, Clock, Hourglass, Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatPercent } from '@/lib/formatPercent';
import { Investment } from '@/types/investment';
import { buildRiskSummary, formatDelay, platformLabel, RISK_KIND_LABEL, RiskItem, RiskKind } from '@/lib/investment/riskSummary';

const eur = (value: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
const day = (d: string) => format(parseISO(d), 'dd/MM/yyyy', { locale: es });

const KIND_STYLE: Record<RiskKind, { badge: string; icon: typeof Clock }> = {
  defaulted: { badge: 'bg-red-100 text-red-800 border-red-200', icon: AlertTriangle },
  overdue: { badge: 'bg-orange-100 text-orange-800 border-orange-200', icon: Clock },
  delayed: { badge: 'bg-amber-100 text-amber-800 border-amber-200', icon: Hourglass },
};

const KIND_ORDER: RiskKind[] = ['delayed', 'overdue', 'defaulted'];

interface Props {
  /** Inversiones visibles (en el plan gratuito, solo las 3 permitidas). */
  investments: Investment[];
  /** Inversiones bloqueadas del plan gratuito: solo se avisa de cuántas tienen problemas. */
  lockedInvestments: Investment[];
  onOpenInvestment: (id: string) => void;
}

export function RiskView({ investments, lockedInvestments, onOpenInvestment }: Props) {
  const summary = useMemo(() => buildRiskSummary(investments), [investments]);
  const hidden = useMemo(() => buildRiskSummary(lockedInvestments), [lockedInvestments]);
  const maxPlatform = Math.max(...summary.byPlatform.map(p => p.amount), 1);

  return (
    <div className="space-y-6">
      {/* Resumen */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 lg:grid-cols-4">
        <div className={cn('col-span-3 lg:col-span-1 rounded-lg border p-4 sm:p-5 shadow-sm', summary.total > 0 ? 'border-red-200 bg-red-50/60 dark:bg-red-950/20' : 'bg-card')}>
          <p className="text-sm font-medium text-muted-foreground">Dinero en riesgo</p>
          <p className="text-2xl font-bold tracking-tight">{eur(summary.total)}</p>
          <p className="text-xs text-muted-foreground">
            {summary.items.length === 0 ? 'Todo en plazo' : `${summary.items.length} inversi${summary.items.length === 1 ? 'ón' : 'ones'} con problemas`}
          </p>
        </div>
        {KIND_ORDER.map(kind => {
          const Icon = KIND_STYLE[kind].icon;
          const k = summary.byKind[kind];
          return (
            <div key={kind} className="rounded-lg border bg-card p-3 sm:p-5 shadow-sm">
              <div className="flex items-start gap-1.5 text-xs sm:text-sm font-medium text-muted-foreground">
                <Icon className="mt-0.5 h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                {RISK_KIND_LABEL[kind]}
              </div>
              <p className="text-base sm:text-xl font-bold tracking-tight">{eur(k.amount)}</p>
              <p className="text-xs text-muted-foreground">{k.count} inversi{k.count === 1 ? 'ón' : 'ones'}</p>
            </div>
          );
        })}
      </div>

      {hidden.items.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <span>
            Tienes <strong>{hidden.items.length} inversi{hidden.items.length === 1 ? 'ón' : 'ones'} más</strong> con retraso o impago
            ({eur(hidden.total)}) que no se ven en el plan gratuito. Los pagos aún no están disponibles: escríbenos a{' '}
            <a href="mailto:soporte@crowdfolio.es" className="font-medium underline underline-offset-2">soporte@crowdfolio.es</a>{' '}
            y te ampliamos el Pro para verlas.
          </span>
        </div>
      )}

      {summary.items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border bg-card px-6 py-10 text-center">
          <CheckCircle2 className="h-8 w-8 text-status-active" />
          <p className="font-semibold">Todo en plazo</p>
          <p className="max-w-md text-sm text-muted-foreground">
            Ninguna inversión lleva retraso, está vencida sin cobrar o en impago. Si una plataforma te mueve una fecha,
            apúntalo en la inversión (Editar o Prorrogar) y aparecerá aquí.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Lista */}
          <div className="space-y-3 lg:col-span-2">
            <h2 className="text-lg font-semibold">Inversiones con problemas</h2>
            {summary.items.map(item => (
              <RiskRow key={item.investment.id} item={item} onOpen={() => onOpenInvestment(item.investment.id)} />
            ))}
          </div>

          {/* Por plataforma */}
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Por plataforma</h2>
            <div className="space-y-3 rounded-lg border bg-card p-4">
              {summary.byPlatform.map(p => (
                <div key={p.key} className="space-y-1">
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="font-medium">{p.label}</span>
                    <span className="tabular-nums">{eur(p.amount)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div className="h-2 rounded-full bg-red-400" style={{ width: `${(p.amount / maxPlatform) * 100}%` }} />
                  </div>
                  <p className="text-xs text-muted-foreground">{p.count} inversi{p.count === 1 ? 'ón' : 'ones'}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RiskRow({ item, onOpen }: { item: RiskItem; onOpen: () => void }) {
  const { investment: inv, kind } = item;
  const moved = !!item.promisedEndDate && !!inv.expectedEndDate && item.promisedEndDate !== inv.expectedEndDate;
  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold leading-tight">{inv.projectName}</p>
            <Badge variant="outline" className="text-xs">{platformLabel(inv)}</Badge>
            <Badge className={cn('text-xs border', KIND_STYLE[kind].badge)}>{RISK_KIND_LABEL[kind]}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {item.delayDays > 0 ? (
              <>Lleva <strong className="text-foreground">{formatDelay(item.delayDays)}</strong> de retraso</>
            ) : (
              'Sin retraso todavía'
            )}
            {item.promisedEndDate && (
              <> · prometida {day(item.promisedEndDate)}{moved && inv.expectedEndDate ? `, ahora ${day(inv.expectedEndDate)}` : ''}</>
            )}
          </p>
        </div>
        <div className="sm:text-right">
          <p className="text-lg font-bold tabular-nums">{eur(item.atRisk)}</p>
          <p className="text-xs text-muted-foreground">{kind === 'defaulted' ? 'sin recuperar' : 'pendiente de cobrar'}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-3">
        <p className="text-sm text-muted-foreground">
          {item.effectiveTAE !== null ? (
            <>
              TAE prometida <span className="font-medium text-foreground">{formatPercent(item.promisedTAE)}</span>
              {' → '}
              {inv.status === 'completed' ? 'real' : 'ajustada por el retraso'}{' '}
              <span className={cn('font-medium', item.effectiveTAE < item.promisedTAE ? 'text-destructive' : 'text-foreground')}>
                {formatPercent(item.effectiveTAE)}
              </span>
            </>
          ) : kind === 'defaulted' ? (
            `Invertido ${eur(inv.amount)} · recuperado ${eur(inv.amount - item.atRisk)}`
          ) : (
            'Rentabilidad sin previsión'
          )}
        </p>
        <Button size="sm" variant="outline" onClick={onOpen}>
          {kind === 'overdue' ? 'Confirmar qué ha pasado' : 'Gestionar'}
        </Button>
      </div>
    </div>
  );
}
