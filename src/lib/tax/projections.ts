import { Investment, InvestmentScheduleEntry } from '@/types/investment';
import { calculateProgressiveTax } from '@/lib/tax/calculations';
import { getDefaultWithholdingRate } from './withholding';
import { calculateInvestmentTotalReturn, getAccrualEndDate } from '@/lib/investment/calculations';
import { toDateOnlyString } from '@/lib/dateOnly';

/**
 * De dónde sale lo proyectado de una inversión:
 * - maturity: pago único (bullet) que vence dentro del ejercicio → todos sus intereses ese año.
 * - schedule: cuotas de intereses del calendario de cobros que caen en lo que queda de año.
 * - prorata: periódica sin calendario (o amortizable): rentabilidad anual prorrateada.
 */
export type ProjectionBasis = 'maturity' | 'schedule' | 'prorata';

export interface ProjectedInvestment {
  investmentId: string;
  projectName: string;
  platform: string;
  projectedAmount: number;
  projectedWithholding: number;
  monthsActive: number;
  basis: ProjectionBasis;
  /** Solo en basis 'maturity': fecha de vencimiento (YYYY-MM-DD). */
  maturityDate?: string;
}

export interface TaxProjection {
  projectedIncome: number;
  projectedWithholdings: number;
  totalProjectedGross: number;
  totalProjectedTax: number;
  projectedResult: number;
  byInvestment: ProjectedInvestment[];
}

/**
 * Rentabilidad anual prorrateada a los meses del ejercicio en que la inversión está viva,
 * menos lo ya cobrado este año. Es la estimación de siempre; solo se usa como respaldo
 * para inversiones periódicas sin calendario de cobros y para las amortizables.
 */
function prorataProjection(
  investment: Investment,
  year: number,
  alreadyReceivedAmount: number,
): { projectedAmount: number; monthsActive: number } {
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31);

  const investmentStart = new Date(investment.investmentDate);
  // Hasta cuándo genera intereses (tras un retraso, la fecha prometida).
  const accrualEnd = getAccrualEndDate(investment);
  const investmentEnd = accrualEnd ? new Date(accrualEnd) : yearEnd;

  const effectiveStart = investmentStart > yearStart ? investmentStart : yearStart;
  const effectiveEnd = investmentEnd < yearEnd ? investmentEnd : yearEnd;
  if (effectiveStart > yearEnd || effectiveEnd < yearStart) {
    return { projectedAmount: 0, monthsActive: 0 };
  }

  const msPerMonth = 1000 * 60 * 60 * 24 * 30.44;
  const monthsActive = Math.round((effectiveEnd.getTime() - effectiveStart.getTime()) / msPerMonth);
  const annualReturn = investment.amount * (investment.expectedReturn / 100);
  const expectedForYear = (annualReturn * monthsActive) / 12;

  return { projectedAmount: Math.max(0, expectedForYear - alreadyReceivedAmount), monthsActive };
}

/**
 * Rendimientos que una inversión activa debería cobrar en lo que queda del ejercicio
 * `year`, según cómo paga:
 *
 * - bullet: los intereses se cobran (y tributan) de una vez al vencer. Solo hay
 *   proyección si vence después de hoy y dentro del ejercicio; si vence otro año, 0.
 *   Sin fecha de vencimiento no se puede saber cuándo cobrará: 0.
 * - periodic_fixed con calendario: suma de las cuotas de intereses con fecha posterior
 *   a hoy y dentro del ejercicio. Sin calendario, prorrateo.
 * - amortizing: prorrateo (las cuotas mezclan capital e intereses).
 * - equity y variable_or_unknown: 0, no hay un rendimiento fijo que proyectar.
 *
 * Fuera del ejercicio en curso no hay nada que proyectar.
 */
export function calculateProjectedIncome(
  investment: Investment,
  year: number,
  alreadyReceivedAmount: number,
  options: { today?: Date; schedule?: InvestmentScheduleEntry[] } = {},
): { projectedAmount: number; monthsActive: number; basis: ProjectionBasis; maturityDate?: string } {
  const today = options.today ?? new Date();
  const todayStr = toDateOnlyString(today);
  const yearEndStr = `${year}-12-31`;
  const none = (basis: ProjectionBasis) => ({ projectedAmount: 0, monthsActive: 0, basis });

  if (today.getFullYear() !== year) return none('prorata');

  switch (investment.incomeModel) {
    case 'bullet': {
      const maturity = getAccrualEndDate(investment);
      if (!maturity || maturity <= todayStr || maturity > yearEndStr) return none('maturity');
      const totalInterest = calculateInvestmentTotalReturn(investment);
      const months = Math.max(0, Math.round(
        (new Date(maturity).getTime() - new Date(investment.investmentDate).getTime()) / (1000 * 60 * 60 * 24 * 30.44),
      ));
      return {
        projectedAmount: Math.max(0, totalInterest - alreadyReceivedAmount),
        monthsActive: months,
        basis: 'maturity',
        maturityDate: maturity,
      };
    }
    case 'periodic_fixed': {
      const schedule = options.schedule ?? [];
      if (schedule.length === 0) return { ...prorataProjection(investment, year, alreadyReceivedAmount), basis: 'prorata' };
      const upcoming = schedule.filter(
        (e) => e.type === 'interest' && e.expectedDate > todayStr && e.expectedDate <= yearEndStr,
      );
      return {
        projectedAmount: upcoming.reduce((sum, e) => sum + e.expectedAmount, 0),
        monthsActive: upcoming.length,
        basis: 'schedule',
      };
    }
    case 'amortizing':
      return { ...prorataProjection(investment, year, alreadyReceivedAmount), basis: 'prorata' };
    default:
      // equity, variable_or_unknown
      return none('prorata');
  }
}

/**
 * Calculate the full year projection for all investments
 */
export function calculateYearlyProjection(
  investments: Investment[],
  paymentsByInvestment: Map<string, number>,
  currentGrossIncome: number,
  currentWithholdings: number,
  deductibleExpenses: number,
  year: number,
  options: { today?: Date; scheduleByInvestment?: Record<string, InvestmentScheduleEntry[]> } = {},
): TaxProjection {
  const today = options.today ?? new Date();
  const isCurrentYear = year === today.getFullYear();

  // Only active investments can generate future income
  const activeInvestments = investments.filter(inv => inv.status === 'active');

  const projectionsByInvestment: ProjectedInvestment[] = [];

  for (const investment of activeInvestments) {
    const alreadyReceived = paymentsByInvestment.get(investment.id) || 0;
    const { projectedAmount, monthsActive, basis, maturityDate } = calculateProjectedIncome(
      investment,
      year,
      alreadyReceived,
      { today, schedule: options.scheduleByInvestment?.[investment.id] },
    );

    if (projectedAmount > 0 && isCurrentYear) {
      projectionsByInvestment.push({
        investmentId: investment.id,
        projectName: investment.projectName,
        platform: investment.platform,
        projectedAmount: Math.round(projectedAmount * 100) / 100,
        // Misma regla que al registrar un cobro: 19 % solo en plataformas españolas.
        projectedWithholding: Math.round(projectedAmount * getDefaultWithholdingRate(investment.platform) * 100) / 100,
        monthsActive,
        basis,
        maturityDate,
      });
    }
  }

  const projectedIncome = projectionsByInvestment.reduce(
    (sum, p) => sum + p.projectedAmount,
    0
  );
  const projectedWithholdings = projectionsByInvestment.reduce(
    (sum, p) => sum + p.projectedWithholding,
    0
  );

  // Total projected gross = current + projected
  const totalProjectedGross = currentGrossIncome + projectedIncome;

  // Calculate tax on total projected taxable base
  const projectedTaxableBase = Math.max(0, totalProjectedGross - deductibleExpenses);
  const totalProjectedTax = calculateProgressiveTax(projectedTaxableBase);

  // Total withholdings = current + projected
  const totalWithholdings = currentWithholdings + projectedWithholdings;

  // Result = tax - withholdings (positive = to pay, negative = refund)
  const projectedResult = Math.round((totalProjectedTax - totalWithholdings) * 100) / 100;

  return {
    projectedIncome: Math.round(projectedIncome * 100) / 100,
    projectedWithholdings: Math.round(projectedWithholdings * 100) / 100,
    totalProjectedGross: Math.round(totalProjectedGross * 100) / 100,
    totalProjectedTax: Math.round(totalProjectedTax * 100) / 100,
    projectedResult,
    byInvestment: projectionsByInvestment,
  };
}

