import { Investment } from '@/types/investment';

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
    // Interés compuesto: amount × (1 + r)^n - amount
    return amount * (Math.pow(1 + annualReturnPercent / 100, durationYears) - 1);
  }
  // Interés simple: amount × r × t
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
 * Calcula el rendimiento total esperado de una inversión considerando su duración
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
 * Calcula el porcentaje total esperado de una inversión considerando su duración
 */
export function calculateInvestmentTotalReturnPercent(investment: Investment): number {
  const durationYears = getInvestmentDurationYears(
    investment.investmentDate,
    investment.expectedEndDate
  );
  return calculateTotalReturnPercent(investment.expectedReturn, durationYears);
}
