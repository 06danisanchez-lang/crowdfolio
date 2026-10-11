import { Investment, PLATFORMS } from '@/types/investment';
import { toDateOnlyString } from '@/lib/dateOnly';
import { daysBetweenDates, getDelayDays, getEffectiveTAE, getOriginalEndDate, getOutstandingCapital } from './calculations';

/**
 * Inversiones con problemas («Retrasos e impagos»):
 * - defaulted: marcada como impago. En riesgo = invertido − capital recuperado.
 * - overdue: vencida sin cobrar (pendiente de confirmar, o activa con la fecha ya pasada).
 * - delayed: sigue abierta pero la fecha se ha movido respecto a la prometida
 *   (prórroga o retraso). En riesgo = capital pendiente.
 */
export type RiskKind = 'defaulted' | 'overdue' | 'delayed';

export interface RiskItem {
  investment: Investment;
  kind: RiskKind;
  /** Capital pendiente de cobrar (en impago: invertido − recuperado). */
  atRisk: number;
  /** Retraso sobre el vencimiento prometido, igual que en la ficha (getDelayDays): en
   * una fecha movida cuenta todo el retraso anunciado. En impago, días desde la fecha
   * prometida hasta hoy. */
  delayDays: number;
  promisedEndDate?: string;
  /** TAE prometida y la real o ajustada por el retraso (no en impago). */
  promisedTAE: number;
  effectiveTAE: number | null;
}

export interface RiskSummary {
  items: RiskItem[];
  total: number;
  byKind: Record<RiskKind, { amount: number; count: number }>;
  byPlatform: { key: string; label: string; amount: number; count: number }[];
}

export const RISK_KIND_LABEL: Record<RiskKind, string> = {
  defaulted: 'Impago',
  overdue: 'Vencida sin cobrar',
  delayed: 'Retrasada',
};

export function platformLabel(inv: Pick<Investment, 'platform' | 'customPlatformName'>): string {
  if (inv.platform === 'other' && inv.customPlatformName) return inv.customPlatformName;
  return PLATFORMS.find(p => p.value === inv.platform)?.label ?? inv.platform;
}

export function classifyRisk(inv: Investment, today: Date = new Date()): RiskKind | null {
  const todayStr = toDateOnlyString(today);
  if (inv.status === 'defaulted') return 'defaulted';
  if (inv.status === 'pending') return 'overdue';
  if (inv.status !== 'active') return null;
  if (inv.expectedEndDate && inv.expectedEndDate < todayStr) return 'overdue';
  return getDelayDays(inv, today) > 0 ? 'delayed' : null;
}

export function buildRiskSummary(investments: Investment[], today: Date = new Date()): RiskSummary {
  const todayStr = toDateOnlyString(today);
  const items: RiskItem[] = [];

  for (const inv of investments) {
    const kind = classifyRisk(inv, today);
    if (!kind) continue;
    const promised = getOriginalEndDate(inv);
    const delayDays = kind === 'defaulted'
      ? (promised && promised < todayStr ? daysBetweenDates(promised, todayStr) : 0)
      : Math.max(getDelayDays(inv, today), 0);
    items.push({
      investment: inv,
      kind,
      atRisk: getOutstandingCapital(inv),
      delayDays,
      promisedEndDate: promised,
      promisedTAE: inv.expectedReturn,
      effectiveTAE: kind === 'defaulted' || !(inv.expectedReturn > 0) ? null : getEffectiveTAE(inv, inv.payments ?? [], today),
    });
  }

  items.sort((a, b) => b.delayDays - a.delayDays || b.atRisk - a.atRisk);

  const byKind: RiskSummary['byKind'] = {
    defaulted: { amount: 0, count: 0 },
    overdue: { amount: 0, count: 0 },
    delayed: { amount: 0, count: 0 },
  };
  const platforms = new Map<string, { key: string; label: string; amount: number; count: number }>();
  for (const it of items) {
    byKind[it.kind].amount += it.atRisk;
    byKind[it.kind].count += 1;
    const label = platformLabel(it.investment);
    const key = it.investment.platform === 'other' ? `other:${label}` : it.investment.platform;
    const p = platforms.get(key) ?? { key, label, amount: 0, count: 0 };
    p.amount += it.atRisk;
    p.count += 1;
    platforms.set(key, p);
  }

  return {
    items,
    total: items.reduce((s, i) => s + i.atRisk, 0),
    byKind,
    byPlatform: [...platforms.values()].sort((a, b) => b.amount - a.amount),
  };
}

/** «12 días» hasta 60 días; después, «7 meses». */
export function formatDelay(days: number): string {
  if (days < 60) return `${days} ${days === 1 ? 'día' : 'días'}`;
  const months = Math.round(days / 30.44);
  return `${months} ${months === 1 ? 'mes' : 'meses'}`;
}
