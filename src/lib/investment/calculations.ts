import { Investment, InvestmentScheduleEntry, Payment } from '@/types/investment';

/**
 * Calcula la duración en años de una inversión
 */
export function getInvestmentDurationYears(
  investmentDate: string,
  expectedEndDate?: string
): number {
  const start = new Date(investmentDate);
  const end = expectedEndDate ? new Date(expectedEndDate) : new Date();
  const diffMs = end.getTime() - start.getTime();
  return Math.max(diffMs / (1000 * 60 * 60 * 24 * 365.25), 0);
}

/**
 * Calcula el rendimiento total en € basado en rendimiento anual y duración
 * Usa interés simple por defecto
 */
export function calculateTotalReturnAmount(
  amount: number,
  annualReturnPercent: number,
  durationYears: number,
  useCompound: boolean = false
): number {
  if (useCompound) {
    return amount * (Math.pow(1 + annualReturnPercent / 100, durationYears) - 1);
  }
  return amount * (annualReturnPercent / 100) * durationYears;
}

/**
 * Calcula el rendimiento total esperado en porcentaje
 */
export function calculateTotalReturnPercent(
  annualReturnPercent: number,
  durationYears: number
): number {
  return annualReturnPercent * durationYears;
}

/**
 * Calcula el rendimiento total esperado de una inversión usando interés simple.
 * SOLO VÁLIDO para inversiones tipo 'bullet'.
 * Para periodic_fixed / amortizing, usar calculateExpectedReturnFromSchedule.
 */
export function calculateInvestmentTotalReturn(investment: Investment): number {
  const durationYears = getInvestmentDurationYears(
    investment.investmentDate,
    investment.expectedEndDate
  );
  return calculateTotalReturnAmount(
    investment.amount,
    investment.expectedReturn,
    durationYears
  );
}

/**
 * Calcula el porcentaje total esperado de una inversión usando interés simple.
 * SOLO VÁLIDO para inversiones tipo 'bullet'.
 * Para periodic_fixed / amortizing, usar calculateExpectedReturnFromSchedule.
 */
export function calculateInvestmentTotalReturnPercent(investment: Investment): number {
  const durationYears = getInvestmentDurationYears(
    investment.investmentDate,
    investment.expectedEndDate
  );
  return calculateTotalReturnPercent(investment.expectedReturn, durationYears);
}

/**
 * Calcula el rendimiento esperado total para inversiones periodic_fixed o amortizing,
 * basándose en el schedule real (investment_schedule).
 *
 * - periodic_fixed: suma de expected_amount donde type === 'interest'
 *   (los pagos de principal no son rendimiento, solo devolución del capital)
 *
 * - amortizing: suma total de expected_amount - amount
 *   (cada cuota de amortización francesa incluye principal + interés,
 *    así que el rendimiento total es la suma de todas las cuotas menos el capital invertido)
 */
export function calculateExpectedReturnFromSchedule(
  schedule: InvestmentScheduleEntry[],
  amount: number,
  incomeModel: 'periodic_fixed' | 'amortizing'
): number {
  if (incomeModel === 'periodic_fixed') {
    return schedule
      .filter(e => e.type === 'interest')
      .reduce((sum, e) => sum + e.expectedAmount, 0);
  }

  // amortizing: total payments - principal = net return
  const totalPayments = schedule.reduce((sum, e) => sum + e.expectedAmount, 0);
  return totalPayments - amount;
}

export function calculateAccruedReturn(
  inv: Investment,
  schedule: InvestmentScheduleEntry[],
  today: Date = new Date()
): number {
  if (inv.incomeModel === 'variable_or_unknown') return 0;

  if (inv.incomeModel === 'equity') {
    if (inv.equityType === 'rentas') {
      // Real cobrado: suma de pagos tipo dividend o capital_return
      return (inv.payments ?? [])
        .filter(p => p.type === 'dividend' || p.type === 'capital_return')
        .reduce((sum, p) => sum + p.amount, 0);
    }
    // plusvalia y liquidacion: interés simple proporcional (mismo que bullet)
  }

  const todayStr = today.toISOString().split('T')[0];

  if (inv.incomeModel === 'periodic_fixed' || inv.incomeModel === 'amortizing') {
    return schedule
      .filter(e => e.type === 'interest' && e.expectedDate <= todayStr)
      .reduce((sum, e) => {
        if (e.matchedPaymentId && inv.payments) {
          const real = inv.payments.find(p => p.id === e.matchedPaymentId);
          return sum + (real ? real.amount : e.expectedAmount);
        }
        return sum + e.expectedAmount;
      }, 0);
  }

  // bullet, equity plusvalia/liquidacion: interés simple proporcional
  const start = new Date(inv.investmentDate);
  const end = today < new Date(inv.expectedEndDate ?? today) ? today : new Date(inv.expectedEndDate!);
  const yearsElapsed = Math.max((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365.25), 0);
  return inv.amount * (inv.expectedReturn / 100) * yearsElapsed;
}

export function calculateRemainingReturn(
  inv: Investment,
  schedule: InvestmentScheduleEntry[],
  today: Date = new Date()
): number {
  if (inv.incomeModel === 'variable_or_unknown') return 0;
  // rentas equity: importes variables, sin proyección futura
  if (inv.incomeModel === 'equity' && inv.equityType === 'rentas') return 0;

  const total = inv.incomeModel === 'periodic_fixed' || inv.incomeModel === 'amortizing'
    ? calculateExpectedReturnFromSchedule(schedule, inv.amount, inv.incomeModel)
    : calculateInvestmentTotalReturn(inv); // bullet y equity plusvalia/liquidacion
  const accrued = calculateAccruedReturn(inv, schedule, today);
  return Math.max(total - accrued, 0);
}

/**
 * Días de retraso de una inversión respecto a su fecha de vencimiento prevista.
 * - Completada con actualEndDate: actualEndDate - expectedEndDate
 * - Activa/pendiente: hoy - expectedEndDate
 * Positivo = retraso, negativo o cero = a tiempo / anticipado.
 */
export function getDelayDays(investment: Investment, today: Date = new Date()): number {
  if (!investment.expectedEndDate) return 0;
  const expected = new Date(investment.expectedEndDate);

  if (investment.status === 'completed' && investment.actualEndDate) {
    const actual = new Date(investment.actualEndDate);
    return Math.round((actual.getTime() - expected.getTime()) / (1000 * 60 * 60 * 24));
  }

  if (investment.status === 'active' || investment.status === 'pending') {
    return Math.round((today.getTime() - expected.getTime()) / (1000 * 60 * 60 * 24));
  }

  return 0;
}

/**
 * TAE real de una inversión completada, basada en la duración real
 * (investmentDate -> actualEndDate) y el beneficio neto realmente cobrado
 * (total de payments menos el capital invertido). Interés simple anualizado,
 * mismo criterio que calculateTotalReturnPercent.
 */
export function calculateRealTAE(investment: Investment, payments: Payment[]): number {
  if (!investment.actualEndDate || investment.amount <= 0) return investment.expectedReturn;

  const start = new Date(investment.investmentDate);
  const end = new Date(investment.actualEndDate);
  const years = Math.max((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365.25), 0);
  if (years <= 0) return investment.expectedReturn;

  const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0);
  const profit = totalCollected - investment.amount;

  return (profit / investment.amount / years) * 100;
}

/**
 * TAE estimada "a hoy" para inversiones activas/pendientes que ya van con retraso
 * (hoy > expectedEndDate). Se basa exclusivamente en pagos reales cobrados hasta hoy
 * (dividend, interest, capital_return — excluye principal, que es devolución de capital,
 * no rendimiento) sobre la duración real transcurrida. Es una estimación provisional,
 * no una proyección con expectedReturn.
 */
export function calculateEstimatedTAEToday(
  investment: Investment,
  payments: Payment[],
  today: Date = new Date()
): number {
  if (investment.amount <= 0) return investment.expectedReturn;

  const start = new Date(investment.investmentDate);
  const years = Math.max((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365.25), 0);
  if (years <= 0) return investment.expectedReturn;

  const todayStr = today.toISOString().split('T')[0];
  const yieldCollected = payments
    .filter(p => p.date <= todayStr && (p.type === 'dividend' || p.type === 'interest' || p.type === 'capital_return'))
    .reduce((sum, p) => sum + p.amount, 0);

  return (yieldCollected / investment.amount / years) * 100;
}

/**
 * TAE más rigurosa disponible para una inversión:
 * - Completada con actualEndDate -> TAE real (duración y cobros reales)
 * - Activa/pendiente con retraso (hoy > expectedEndDate) -> TAE estimada a hoy
 * - Sin retraso -> expectedReturn original, sin cambios
 */
export function getEffectiveTAE(investment: Investment, payments: Payment[], today: Date = new Date()): number {
  if (investment.status === 'completed' && investment.actualEndDate) {
    return calculateRealTAE(investment, payments);
  }

  if (
    (investment.status === 'active' || investment.status === 'pending') &&
    investment.expectedEndDate &&
    today > new Date(investment.expectedEndDate)
  ) {
    return calculateEstimatedTAEToday(investment, payments, today);
  }

  return investment.expectedReturn;
}
