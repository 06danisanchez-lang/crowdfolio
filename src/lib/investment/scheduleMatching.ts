import { IncomeModel, InvestmentScheduleEntry, Payment } from '@/types/investment';

/** Una cuota de intereses se da por cobrada con al menos este porcentaje de lo
 * previsto (deja margen para quien apunta el neto tras la retención del 19 %). */
const MIN_COVERAGE = 0.8;
/** Margen para dar por devuelto un tramo de capital (redondeos de la plataforma). */
const PRINCIPAL_TOLERANCE_EUR = 1;

/**
 * Empareja el calendario previsto de una inversión con los cobros registrados, en
 * memoria (no escribe en la base de datos). Sin esto, todas las cuotas pasadas
 * seguían «pendientes» aunque se hubieran cobrado, y Cobros las mostraba como
 * atrasadas.
 *
 * Por importes y en orden: los cobros se van sumando a una «bolsa» y cada cuota,
 * de la más antigua a la más reciente, se da por cobrada cuando la bolsa la cubre.
 * Así:
 * - un cobro que llega tarde cubre la cuota que tocaba, no la siguiente;
 * - un cobro pequeño (intereses de demora, un ajuste) no cubre una cuota entera;
 * - un cobro de dos cuotas juntas cubre las dos.
 * Tipos: periodic_fixed → cuotas de intereses con cobros de intereses, y el capital
 * con cobros de capital; amortizing → cada cuota (capital + intereses) con cobros
 * de intereses y de capital. Resto de modelos: sin cambios (equity rentas se
 * resuelve en pendingPayments.ts).
 *
 * Las cuotas ya emparejadas u omitidas en la base de datos se respetan, y sus cobros
 * no se vuelven a usar. El importe del cobro emparejado no es el de la cuota: no
 * usar matchedPaymentId para sumar importes.
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

  const result = schedule.map(e => ({ ...e }));
  const open = (types: InvestmentScheduleEntry['type'][]) =>
    result
      .filter(e => types.includes(e.type) && !e.matchedPaymentId && e.status !== 'skipped' && e.status !== 'matched')
      .sort((a, b) => a.expectedDate.localeCompare(b.expectedDate));

  if (incomeModel === 'periodic_fixed') {
    matchByBalance(open(['interest']), free.filter(p => p.type === 'interest'), e => e.expectedAmount * MIN_COVERAGE);
    matchByBalance(open(['principal']), free.filter(p => p.type === 'principal'), e => e.expectedAmount - PRINCIPAL_TOLERANCE_EUR);
  } else {
    matchByBalance(
      open(['mixed', 'interest', 'principal']),
      free.filter(p => p.type === 'interest' || p.type === 'principal'),
      e => e.expectedAmount * MIN_COVERAGE,
    );
  }
  return result;
}

function matchByBalance(
  entries: InvestmentScheduleEntry[],
  payments: Payment[],
  needed: (entry: InvestmentScheduleEntry) => number,
): void {
  let balance = 0;
  let next = 0;
  let lastId: string | null = null;
  for (const entry of entries) {
    const target = Math.max(needed(entry), 0.01);
    while (balance + 1e-9 < target && next < payments.length) {
      balance += payments[next].amount;
      lastId = payments[next].id;
      next++;
    }
    if (balance + 1e-9 < target || !lastId) return;
    entry.matchedPaymentId = lastId;
    entry.status = 'matched';
    balance = Math.max(balance - entry.expectedAmount, 0);
  }
}
