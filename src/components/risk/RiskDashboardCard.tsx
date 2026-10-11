import { useMemo } from 'react';
import { AlertTriangle, CheckCircle2, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Investment } from '@/types/investment';
import { buildRiskSummary } from '@/lib/investment/riskSummary';

const eur = (value: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);

/** Tarjeta del panel: dinero en retraso o impago, enlaza al apartado. */
export function RiskDashboardCard({ investments, onOpen }: { investments: Investment[]; onOpen: () => void }) {
  const s = useMemo(() => buildRiskSummary(investments), [investments]);
  const ok = s.items.length === 0;
  const parts = [
    s.byKind.delayed.count && `${s.byKind.delayed.count} retrasada${s.byKind.delayed.count === 1 ? '' : 's'}`,
    s.byKind.overdue.count && `${s.byKind.overdue.count} vencida${s.byKind.overdue.count === 1 ? '' : 's'} sin cobrar`,
    s.byKind.defaulted.count && `${s.byKind.defaulted.count} en impago`,
  ].filter(Boolean);

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        'mb-6 flex w-full items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left shadow-sm transition-colors',
        ok ? 'bg-card hover:bg-muted/40' : 'border-red-200 bg-red-50/60 hover:bg-red-50 dark:bg-red-950/20',
      )}
    >
      <div className="flex items-center gap-3">
        {ok ? <CheckCircle2 className="h-5 w-5 shrink-0 text-status-active" /> : <AlertTriangle className="h-5 w-5 shrink-0 text-red-600" />}
        <div>
          <p className="text-sm font-semibold">
            {ok ? 'Retrasos e impagos: todo en plazo' : `${eur(s.total)} en riesgo por retrasos e impagos`}
          </p>
          {!ok && <p className="text-xs text-muted-foreground">{parts.join(' · ')}</p>}
        </div>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  );
}
