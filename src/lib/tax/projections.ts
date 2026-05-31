import { Investment } from '@/types/investment';
import { calculateProgressiveTax } from '@/lib/tax/calculations';

export interface ProjectedInvestment {
  investmentId: string;
  projectName: string;
  platform: string;
  projectedAmount: number;
  projectedWithholding: number;
  monthsActive: number;
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
 * Calculate the projected income for an investment in a given year
 */
export function calculateProjectedIncome(
  investment: Investment,
  year: number,
  alreadyReceivedAmount: number
): { projectedAmount: number; monthsActive: number } {
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31);
  const today = new Date();

  const investmentStart = new Date(investment.investmentDate);
  const investmentEnd = investment.expectedEndDate 
    ? new Date(investment.expectedEndDate) 
    : yearEnd;

  // Calculate effective period within the year
  const effectiveStart = investmentStart > yearStart ? investmentStart : yearStart;
  const effectiveEnd = investmentEnd < yearEnd ? investmentEnd : yearEnd;

  // If investment doesn't overlap with the year, no projection
  if (effectiveStart > yearEnd || effectiveEnd < yearStart) {
    return { projectedAmount: 0, monthsActive: 0 };
  }

  // Calculate months active in the year
  const msPerMonth = 1000 * 60 * 60 * 24 * 30.44;
  const monthsActive = Math.round((effectiveEnd.getTime() - effectiveStart.getTime()) / msPerMonth);

  // Calculate expected annual return
  const annualReturn = investment.amount * (investment.expectedReturn / 100);
  
  // Prorate based on months active
  const expectedForYear = (annualReturn * monthsActive) / 12;

  // Only project what's pending (after today)
  if (today >= yearEnd) {
    // Year has ended, no projection needed
    return { projectedAmount: 0, monthsActive };
  }

  // Calculate what should have been received by now
  const currentMonth = today.getMonth();
  const monthsPassed = Math.max(0, currentMonth - startMonth + 1);
  const expectedByNow = (annualReturn * monthsPassed) / 12;

  // Projected = total expected for year - what's already received
  const projectedAmount = Math.max(0, expectedForYear - alreadyReceivedAmount);

  return { projectedAmount, monthsActive };
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
  year: number
): TaxProjection {
  const currentYear = new Date().getFullYear();
  const isCurrentYear = year === currentYear;

  // Only active investments can generate future income
  const activeInvestments = investments.filter(inv => inv.status === 'active');

  const projectionsByInvestment: ProjectedInvestment[] = [];

  for (const investment of activeInvestments) {
    const alreadyReceived = paymentsByInvestment.get(investment.id) || 0;
    const { projectedAmount, monthsActive } = calculateProjectedIncome(
      investment,
      year,
      alreadyReceived
    );

    if (projectedAmount > 0 && isCurrentYear) {
      projectionsByInvestment.push({
        investmentId: investment.id,
        projectName: investment.projectName,
        platform: investment.platform,
        projectedAmount: Math.round(projectedAmount * 100) / 100,
        projectedWithholding: Math.round(projectedAmount * 0.19 * 100) / 100,
        monthsActive,
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

