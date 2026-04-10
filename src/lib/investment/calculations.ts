import { Investment, InvestmentScheduleEntry } from '@/types/investment';

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
