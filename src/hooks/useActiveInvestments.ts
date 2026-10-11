import { useMemo } from 'react';
import { useInvestments } from './useInvestments';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { Investment } from '@/types/investment';
import { computePortfolioSummary } from '@/lib/investment/portfolioSummary';

const FREE_INVESTMENT_LIMIT = 3;

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
        ? computePortfolioSummary(filteredInvestments, filteredActive, filteredCompleted, scheduleMap)
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
