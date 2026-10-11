import { Investment, InvestmentScheduleEntry, InvestmentStatus, InvestmentSummary, Platform } from '@/types/investment';
import {
  calculateAccruedReturn,
  calculateRemainingReturn,
  getEffectiveTAE,
  getOutstandingCapital,
} from './calculations';
import { getInvestmentCompletionStatus } from './completeness';
import { splitFinished } from './portfolioBuckets';

/**
 * Resumen de cartera del panel. Única implementación: la usan useInvestments (cartera
 * completa) y useActiveInvestments (las 3 visibles en el plan gratuito).
 *
 * - `activeInvestments` llega de useInvestments con las activas Y las de impago
 *   (todo lo que no es completed/pending/borrador). Las de impago NO cuentan como
 *   cartera viva: ni capital activo, ni devengo, ni total estimado, ni TAE media.
 * - Capital activo = capital pendiente (invertido − devoluciones de capital) de las
 *   activas y de las vencidas sin confirmar.
 */
export function computePortfolioSummary(
  investments: Investment[],
  activeInvestments: Investment[],
  completedInvestments: Investment[],
  scheduleMap: Record<string, InvestmentScheduleEntry[]>,
  today: Date = new Date(),
): InvestmentSummary {
  const running = activeInvestments.filter(inv => inv.status !== 'defaulted');

  // Con previsión de rentabilidad calculable: nunca variable_or_unknown ni equity
  // rentas (importes variables); sí equity plusvalía/liquidación (interés simple).
  const forecastReady = running.filter(inv => {
    if (inv.incomeModel === 'variable_or_unknown') return false;
    if (inv.incomeModel === 'equity') {
      return inv.equityType === 'plusvalia' || inv.equityType === 'liquidacion';
    }
    return getInvestmentCompletionStatus({
      platform: inv.platform,
      projectName: inv.projectName,
      amount: inv.amount,
      investmentDate: inv.investmentDate,
      expectedReturn: inv.expectedReturn,
      expectedEndDate: inv.expectedEndDate,
      incomeModel: inv.incomeModel,
      paymentFrequency: inv.paymentFrequency,
      hasSchedule: (scheduleMap[inv.id]?.length || 0) > 0,
      status: inv.status,
    }).isForecastReady;
  });

  const schedule = (inv: Investment) => scheduleMap[inv.id] ?? [];
  const sumPaid = (inv: Investment) => inv.payments.reduce((s, p) => s + p.amount, 0);
  const sumIncome = (inv: Investment) =>
    inv.payments.filter(p => p.type === 'dividend' || p.type === 'interest').reduce((s, p) => s + p.amount, 0);

  // Vencidas sin confirmar (pending): siguen en cartera, no en el histórico.
  const { pending: pendingInvestments, closed: closedInvestments } = splitFinished(completedInvestments);

  const activeCapital = [...running, ...pendingInvestments].reduce((s, i) => s + getOutstandingCapital(i), 0);
  const accruedProfit = forecastReady.reduce((s, i) => s + calculateAccruedReturn(i, schedule(i), today), 0);
  const remainingProfit = forecastReady.reduce((s, i) => s + calculateRemainingReturn(i, schedule(i), today), 0);
  const estimatedTotal = forecastReady.reduce((s, i) => s + i.amount, 0) + accruedProfit + remainingProfit;

  const forecastCapital = forecastReady.reduce((s, i) => s + i.amount, 0);
  const averageReturn = forecastCapital > 0
    ? forecastReady.reduce((s, i) => s + getEffectiveTAE(i, i.payments, today) * i.amount, 0) / forecastCapital
    : 0;

  return {
    totalInvested: investments.reduce((s, i) => s + i.amount, 0),
    totalReturns: investments.reduce((s, i) => s + sumPaid(i), 0),
    accruedReturns: accruedProfit,
    activeInvestments: running.length,
    completedInvestments: completedInvestments.length,
    averageReturn,
    byPlatform: investments.reduce((acc, inv) => {
      if (!acc[inv.platform]) acc[inv.platform] = { invested: 0, returns: 0, count: 0 };
      acc[inv.platform].invested += inv.amount;
      acc[inv.platform].returns += sumPaid(inv);
      acc[inv.platform].count += 1;
      return acc;
    }, {} as Record<Platform, { invested: number; returns: number; count: number }>),
    byStatus: investments.reduce((acc, inv) => {
      acc[inv.status] = (acc[inv.status] || 0) + 1;
      return acc;
    }, {} as Record<InvestmentStatus, number>),
    activeSummary: {
      capital: activeCapital,
      estimatedTotal,
      accruedProfit,
      remainingProfit,
      count: running.length + pendingInvestments.length,
      withEndDateCount: forecastReady.length,
    },
    historicalSummary: {
      totalInvested: closedInvestments.reduce((s, i) => s + i.amount, 0),
      totalCollected: closedInvestments.reduce((s, i) => s + sumPaid(i), 0),
      realizedProfit: closedInvestments.reduce((s, i) => s + sumIncome(i), 0),
      completedCount: closedInvestments.length,
    },
  };
}
