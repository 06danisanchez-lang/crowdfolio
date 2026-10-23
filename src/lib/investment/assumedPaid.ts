import { addMonths } from 'date-fns';
import { InvestmentScheduleEntry, PaymentFrequency } from '@/types/investment';
import { fromDateOnlyString, toDateOnlyString } from '@/lib/dateOnly';

/**
 * Cuotas «cobradas, falta el detalle».
 *
 * Quien registra una inversión que ya ha tenido cobros puede decir que todo lo
 * previsto hasta hoy le ha llegado, sin meter cada cobro (investments.
 * assumed_paid_until). Esas cuotas:
 *  - dejan de salir como pendientes o atrasadas (no hay falsa alarma);
 *  - NO son cobros: no suman a lo cobrado ni al informe fiscal, donde cuentan
 *    como datos que faltan hasta que se registre su cobro (importándolo o a mano).
 *
 * Una cuota con su cobro registrado ('matched') manda sobre esto.
 */

export function applyAssumedPaid(
  schedule: InvestmentScheduleEntry[],
  assumedPaidUntil: string | null | undefined,
): InvestmentScheduleEntry[] {
  if (!assumedPaidUntil) return schedule;
  return schedule.map(e =>
    e.status !== 'matched' && e.status !== 'skipped' && !e.matchedPaymentId && e.expectedDate <= assumedPaidUntil
      ? { ...e, status: 'assumed' as const }
      : e,
  );
}

const MONTHS: Record<PaymentFrequency, number> = { monthly: 1, quarterly: 3, semiannual: 6, annual: 12 };

/**
 * ¿Tendrá esta inversión cuotas previstas antes de hoy? Para preguntar al
 * registrarla si ya se han cobrado. Primera cuota: la fecha que diga el
 * usuario o, si no, la de inversión más un periodo (como el calendario).
 */
export function hasPastInstallments(input: {
  investmentDate?: string | null;
  firstPaymentDate?: string | null;
  paymentFrequency?: PaymentFrequency | null;
  today?: string;
}): boolean {
  const today = input.today ?? toDateOnlyString(new Date());
  if (input.firstPaymentDate) return input.firstPaymentDate < today;
  if (!input.investmentDate || !input.paymentFrequency) return false;
  const first = toDateOnlyString(addMonths(fromDateOnlyString(input.investmentDate), MONTHS[input.paymentFrequency]));
  return first < today;
}
