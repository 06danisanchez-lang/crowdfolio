import { useMemo } from 'react';
import { useInvestments } from './useInvestments';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { Investment, InvestmentSummary, InvestmentScheduleEntry } from '@/types/investment';
import { calculateAccruedReturn, calculateRemainingReturn } from '@/lib/investment/calculations';
import { getInvestmentCompletionStatus } from '@/lib/investment/completeness';

const FREE_INVESTMENT_LIMIT = 3;

function computeSummary(
  investments: Investment[],
  activeInvestments: Investment[],
  completedInvestments: Investment[],
  scheduleMap: Record<string, InvestmentScheduleEntry[]>,
  baseSummary: InvestmentSummary,
): InvestmentSummary {
  const today = new Date();

  const forecastReady = activeInvestments.filter(inv => {
    if (inv.incomeModel === 'variable_or_unknown') return false;
    if (inv.incomeModel === 'equity') {
      return inv.equityType === 'plusvalia' || inv.equityType === 'liquidacion';
    }
    const s = getInvestmentCompletionStatus({
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
    });
    return s.isForecastReady;
  });

  const getAccruedReturn = (inv: Investment) => calculateAccruedReturn(inv, scheduleMap[inv.id] ?? [], today);
  const getRemainingReturn = (inv: Investment) => calculateRemainingReturn(inv, scheduleMap[inv.id] ?? [], today);

  const activeCapital = activeInvestments.reduce((s, i) => s + i.amount, 0);
  const accruedProfit = forecastReady.reduce((s, i) => s + getAccruedReturn(i), 0);
  const remainingProfit = forecastReady.reduce((s, i) => s + getRemainingReturn(i), 0);
  const estimatedTotal = forecastReady.reduce((s, i) => s + i.amount, 0) + accruedProfit + remainingProfit;

  const histTotalInvested = completedInvestments.reduce((s, i) => s + i.amount, 0);
  const histTotalCollected = completedInvestments.reduce((s, i) => s + i.payments.reduce((ps, p) => ps + p.amount, 0), 0);
  const histRealizedProfit = completedInvestments.reduce(
    (s, i) => s + i.payments.filter(p => p.type === 'dividend' || p.type === 'interest').reduce((ps, p) => ps + p.amount, 0),
    0,
  );
  const totalCollected = investments.reduce((s, i) => s + i.payments.reduce((ps, p) => ps + p.amount, 0), 0);

  return {
    ...baseSummary,
    totalInvested: investments.reduce((s, i) => s + i.amount, 0),
    totalReturns: totalCollected,
    accruedReturns: accruedProfit,
    activeInvestments: activeInvestments.length,
    completedInvestments: completedInvestments.length,
    activeSummary: {
      capital: activeCapital,
      estimatedTotal,
      accruedProfit,
      remainingProfit,
      count: activeInvestments.length,
      withEndDateCount: forecastReady.length,
    },
    historicalSummary: {
      totalInvested: histTotalInvested,
      totalCollected: histTotalCollected,
      realizedProfit: histRealizedProfit,
      completedCount: completedInvestments.length,
    },
  };
}

export function useActiveInvestments() {
  const investmentsData = useInvestments();
  const { isPro } = useSubscription();

  const {
    investments,
    activeInvestments,
    completedInvestments,
    scheduleMap,
    summary,
  } = investmentsData;

  // Sort all tracked investments oldest-first to determine which 3 are "active" on Free
  const sortedByAge = useMemo(
    () => [...investments].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [investments],
  );

  const isLimited = !isPro && sortedByAge.length > FREE_INVESTMENT_LIMIT;

  const allowedIds = useMemo((): Set<string> | null => {
    if (!isLimited) return null;
    return new Set(sortedByAge.slice(0, FREE_INVESTMENT_LIMIT).map(i => i.id));
  }, [isLimited, sortedByAge]);

  const lockedInvestments = useMemo(
    (): Investment[] => (allowedIds ? sortedByAge.filter(i => !allowedIds.has(i.id)) : []),
    [allowedIds, sortedByAge],
  );

  const filteredActive = useMemo(
    () => (allowedIds ? activeInvestments.filter(i => allowedIds.has(i.id)) : activeInvestments),
    [activeInvestments, allowedIds],
  );

  const filteredCompleted = useMemo(
    () => (allowedIds ? completedInvestments.filter(i => allowedIds.has(i.id)) : completedInvestments),
    [completedInvestments, allowedIds],
  );

  const filteredInvestments = useMemo(
    () => (allowedIds ? [...filteredActive, ...filteredCompleted] : investments),
    [filteredActive, filteredCompleted, investments, allowedIds],
  );

  const filteredSummary = useMemo(
    () =>
      allowedIds
        ? computeSummary(filteredInvestments, filteredActive, filteredCompleted, scheduleMap, summary)
        : summary,
    [allowedIds, filteredInvestments, filteredActive, filteredCompleted, scheduleMap, summary],
  );

  return {
    ...investmentsData,
    investments: filteredInvestments,
    activeInvestments: filteredActive,
    completedInvestments: filteredCompleted,
    allInvestments: investments,
    summary: filteredSummary,
    lockedInvestments,
    isLimited,
    lockedCount: lockedInvestments.length,
  };
}
