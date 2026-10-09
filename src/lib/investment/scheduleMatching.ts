import { IncomeModel, InvestmentScheduleEntry, Payment } from '@/types/investment';

const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;
/** Margen para dar por devuelto un tramo de capital (redondeos de la plataforma). */
const PRINCIPAL_TOLERANCE_EUR = 1;

/**
 * Empareja el calendario previsto de una inversión con los cobros registrados, en
 * memoria (no escribe en la base de datos). Sin esto, todas las cuotas pasadas
 * seguían «pendientes» aunque se hubieran cobrado, y Cobros las mostraba como
 * atrasadas.
 *
 * Por orden (la primera cuota con el primer cobro, la segunda con el segundo…),
 * no por cercanía de fechas: así un cobro que llega tarde sigue cubriendo la cuota
 * que tocaba, y las que quedan sin cubrir son las que de verdad faltan.
 * - periodic_fixed: cuotas de intereses ↔ cobros de intereses, por orden. El capital
 *   se da por devuelto cuando lo cobrado como capital alcanza lo previsto.
 * - amortizing: cada cuota (capital + intereses) ↔ un día con cobros de intereses o
 *   de capital (la cuota se puede registrar en uno o dos cobros del mismo día).
 * - Resto de modelos: sin cambios (equity rentas se resuelve en pendingPayments.ts).
 *
 * Las cuotas ya emparejadas u omitidas en la base de datos se respetan, y sus cobros
 * no se vuelven a usar.
 */
export function matchScheduleToPayments(
  incomeModel: IncomeModel | null | undefined,
  schedule: InvestmentScheduleEntry[],
  payments: Payment[],
): InvestmentScheduleEntry[] {
  if (incomeModel !== 'periodic_fixed' && incomeModel !== 'amortizing') return schedule;
  if (schedule.length === 0 || payments.length === 0) return schedule;

  const usedIds = new Set(schedule.map(e => e.matchedPaymentId).filter((id): id is string => !!id));
  const free = payments
    .filter(p => !usedIds.has(p.id))
    .sort((a, b) => a.date.localeCompare(b.date));

  const isOpen = (e: InvestmentScheduleEntry) =>
    !e.matchedPaymentId && (e.status ?? 'pending') !== 'skipped' && e.status !== 'matched';
  const byDate = (a: InvestmentScheduleEntry, b: InvestmentScheduleEntry) =>
    a.expectedDate.localeCompare(b.expectedDate);

  const result = schedule.map(e => ({ ...e }));
  const matchIn = (entry: InvestmentScheduleEntry, paymentId: string) => {
    entry.matchedPaymentId = paymentId;
    entry.status = 'matched';
  };

  if (incomeModel === 'periodic_fixed') {
    const interestPayments = free.filter(p => p.type === 'interest');
    const interestEntries = result.filter(e => e.type === 'interest' && isOpen(e)).sort(byDate);
    interestEntries.forEach((entry, i) => {
      if (i < interestPayments.length) matchIn(entry, interestPayments[i].id);
    });

    const principalPayments = free.filter(p => p.type === 'principal');
    let paid = round2(principalPayments.reduce((sum, p) => sum + p.amount, 0));
    const lastPrincipal = principalPayments[principalPayments.length - 1];
    for (const entry of result.filter(e => e.type === 'principal' && isOpen(e)).sort(byDate)) {
      if (!lastPrincipal || paid < entry.expectedAmount - PRINCIPAL_TOLERANCE_EUR) break;
      paid = round2(paid - entry.expectedAmount);
      matchIn(entry, lastPrincipal.id);
    }
    return result;
  }

  // amortizing: un día con cobros = una cuota
  const firstPaymentByDay = new Map<string, Payment>();
  for (const p of free) {
    if ((p.type === 'interest' || p.type === 'principal') && !firstPaymentByDay.has(p.date)) {
      firstPaymentByDay.set(p.date, p);
    }
  }
  const installments = [...firstPaymentByDay.values()];
  result
    .filter(e => isOpen(e))
    .sort(byDate)
    .forEach((entry, i) => {
      if (i < installments.length) matchIn(entry, installments[i].id);
    });
  return result;
}
