/**
 * Schedule generator for investment cashflows.
 *
 * Phase 1 — frontend generation. To be migrated to edge function in Phase 2
 * for data consistency guarantees.
 */

import { IncomeModel, PaymentFrequency, PrincipalReturnType, EquityType, InvestmentScheduleEntry } from '@/types/investment';
import { toDateOnlyString } from '@/lib/dateOnly';

interface ScheduleInput {
  id: string;
  amount: number;
  expectedReturn: number; // annual percentage
  incomeModel: IncomeModel;
  paymentFrequency?: PaymentFrequency | null;
  principalReturnType?: PrincipalReturnType | null;
  equityType?: EquityType | null;
  investmentDate: string;
  expectedEndDate: string;
}

function getPeriodsPerYear(freq: PaymentFrequency): number {
  switch (freq) {
    case 'monthly': return 12;
    case 'quarterly': return 4;
    case 'semiannual': return 2;
    case 'annual': return 1;
  }
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  const targetMonth = d.getMonth() + months;
  d.setDate(1); // anchor to 1st to avoid month overflow during setMonth
  d.setMonth(targetMonth);
  // Clamp day to the last day of the target month
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(date.getDate(), lastDay));
  return d;
}

function getMonthsPerPeriod(freq: PaymentFrequency): number {
  switch (freq) {
    case 'monthly': return 1;
    case 'quarterly': return 3;
    case 'semiannual': return 6;
    case 'annual': return 12;
  }
}

function toDateStr(d: Date): string {
  return toDateOnlyString(d);
}

export function generateSchedule(input: ScheduleInput): InvestmentScheduleEntry[] {
  const { incomeModel, paymentFrequency, principalReturnType, equityType, amount, expectedReturn, investmentDate, expectedEndDate, id } = input;

  // bullet and variable_or_unknown: no schedule entries
  if (incomeModel === 'bullet' || incomeModel === 'variable_or_unknown') {
    return [];
  }

  // equity: only 'rentas' generates a schedule (quarterly interest stubs + final principal)
  if (incomeModel === 'equity') {
    if (equityType !== 'rentas' || !expectedEndDate) return [];
    const start = new Date(investmentDate);
    const end = new Date(expectedEndDate);
    const entries: InvestmentScheduleEntry[] = [];
    let current = addMonths(start, 3);
    // Comparar por string de fecha, no por el Date crudo: addMonths() arrastra
    // la hora local de origen (artefacto de parsear investmentDate como
    // medianoche UTC) y, al cruzar un cambio de hora, esa hora puede quedar
    // por delante de `end` aunque sea el mismo día calendario — se perdería
    // la última cuota. Ver auditoría de fechas / scheduleGenerator.test.ts.
    while (toDateStr(current) < toDateStr(end)) {
      entries.push({
        investmentId: id,
        expectedDate: toDateStr(current),
        expectedAmount: 0,
        type: 'interest',
        status: 'pending',
      });
      current = addMonths(current, 3);
    }
    entries.push({
      investmentId: id,
      expectedDate: toDateStr(end),
      expectedAmount: 0,
      type: 'principal',
      status: 'pending',
    });
    return entries;
  }

  if (!paymentFrequency || !expectedEndDate) {
    return [];
  }

  const start = new Date(investmentDate);
  const end = new Date(expectedEndDate);
  const periodsPerYear = getPeriodsPerYear(paymentFrequency);
  const monthsPerPeriod = getMonthsPerPeriod(paymentFrequency);
  const ratePerPeriod = (expectedReturn / 100) / periodsPerYear;

  // Generate period dates
  const dates: Date[] = [];
  let current = addMonths(start, monthsPerPeriod);
  // Mismo motivo que arriba: comparar por string de fecha, no por el Date
  // crudo, para no perder la última cuota cerca de un cambio de hora.
  while (toDateStr(current) <= toDateStr(end)) {
    dates.push(new Date(current));
    current = addMonths(current, monthsPerPeriod);
  }

  if (dates.length === 0) return [];

  const entries: InvestmentScheduleEntry[] = [];

  if (incomeModel === 'periodic_fixed') {
    // Fixed interest payments + principal at maturity (or amortizing)
    const interestPerPeriod = Math.round((amount * ratePerPeriod) * 100) / 100;

    for (const date of dates) {
      entries.push({
        investmentId: id,
        expectedDate: toDateStr(date),
        expectedAmount: interestPerPeriod,
        type: 'interest',
        status: 'pending',
      });
    }

    // Principal return
    const prt = principalReturnType || 'at_maturity';
    if (prt === 'at_maturity' || prt === 'unknown') {
      entries.push({
        investmentId: id,
        expectedDate: toDateStr(end),
        expectedAmount: amount,
        type: 'principal',
        status: 'pending',
      });
    }
    // If amortizing principal_return_type, we'd need more complex logic — Phase 2
  } else if (incomeModel === 'amortizing') {
    // Simplified French amortization: constant payment
    const n = dates.length;
    if (ratePerPeriod === 0) {
      // No interest — just divide principal
      const payment = Math.round((amount / n) * 100) / 100;
      for (const date of dates) {
        entries.push({
          investmentId: id,
          expectedDate: toDateStr(date),
          expectedAmount: payment,
          type: 'mixed',
          status: 'pending',
        });
      }
    } else {
      const annuity = amount * (ratePerPeriod * Math.pow(1 + ratePerPeriod, n)) / (Math.pow(1 + ratePerPeriod, n) - 1);
      const roundedAnnuity = Math.round(annuity * 100) / 100;
      for (const date of dates) {
        entries.push({
          investmentId: id,
          expectedDate: toDateStr(date),
          expectedAmount: roundedAnnuity,
          type: 'mixed',
          status: 'pending',
        });
      }
    }
  }

  return entries;
}
