import { useMemo } from 'react';
import { useActiveInvestments } from './useActiveInvestments';
import { getPendingScheduleEntries } from '@/lib/investment/pendingPayments';
import { Payment, Platform, InvestmentScheduleEntry, PLATFORMS } from '@/types/investment';

export interface ReceivedPaymentRow {
  id: string;
  date: string; // ISO
  investmentId: string;
  investmentName: string;
  platform: Platform;
  customPlatformName?: string;
  type: Payment['type'];
  amount: number;
}

export interface ExpectedPaymentRow {
  id: string;
  date: string; // ISO (expected)
  investmentId: string;
  investmentName: string;
  platform: Platform;
  customPlatformName?: string;
  type: InvestmentScheduleEntry['type'];
  amount: number;
  isOverdue: boolean;
  daysFromToday: number;
}

export interface PlatformOption {
  value: Platform;
  label: string;
}

/**
 * Unified "Cobros" view: flattens confirmed payments (Recibidos) and still-pending
 * schedule entries (Esperados) across all investments visible to the user.
 *
 * Built on useActiveInvestments so the Free-plan investment cap (3 oldest) is
 * inherited automatically — locked investments' payments/schedule never surface here.
 */
export function usePaymentsOverview() {
  const { investments, scheduleMap, isLoading, error, isLimited, lockedCount } = useActiveInvestments();

  const received = useMemo<ReceivedPaymentRow[]>(() => {
    const rows: ReceivedPaymentRow[] = [];
    for (const inv of investments) {
      for (const p of inv.payments) {
        rows.push({
          id: p.id,
          date: p.date,
          investmentId: inv.id,
          investmentName: inv.projectName,
          platform: inv.platform,
          customPlatformName: inv.customPlatformName,
          type: p.type,
          amount: p.amount,
        });
      }
    }
    return rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [investments]);

  const receivedTotal = useMemo(
    () => received.filter(r => r.type !== 'capital_return').reduce((sum, r) => sum + r.amount, 0),
    [received],
  );

  const expected = useMemo<ExpectedPaymentRow[]>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const rows: ExpectedPaymentRow[] = [];

    for (const inv of investments) {
      // Only active/pending investments can still owe a payment: completed and
      // defaulted are done — any partial recovery already booked lives in "Recibidos".
      if (inv.status === 'completed' || inv.status === 'defaulted') continue;

      const pending = getPendingScheduleEntries(inv, scheduleMap[inv.id], today);
      for (const { entry, date, daysFromToday } of pending) {
        rows.push({
          id: entry.id ?? `${inv.id}-${entry.expectedDate}`,
          date: entry.expectedDate,
          investmentId: inv.id,
          investmentName: inv.projectName,
          platform: inv.platform,
          customPlatformName: inv.customPlatformName,
          type: entry.type,
          amount: entry.expectedAmount,
          isOverdue: daysFromToday < 0,
          daysFromToday,
        });
      }
    }
    return rows.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [investments, scheduleMap]);

  const expectedTotal = useMemo(() => expected.reduce((sum, r) => sum + r.amount, 0), [expected]);

  // Platform filter options derived from the user's visible investments (not user_platforms,
  // which isn't populated/used anywhere else in the app today).
  const platformOptions = useMemo<PlatformOption[]>(() => {
    const seen = new Map<Platform, string>();
    for (const inv of investments) {
      if (!seen.has(inv.platform)) {
        const label = inv.platform === 'other' && inv.customPlatformName
          ? inv.customPlatformName
          : PLATFORMS.find(p => p.value === inv.platform)?.label ?? inv.platform;
        seen.set(inv.platform, label);
      }
    }
    return Array.from(seen.entries()).map(([value, label]) => ({ value, label }));
  }, [investments]);

  const investmentOptions = useMemo(
    () => investments.map(inv => ({ id: inv.id, name: inv.projectName })),
    [investments],
  );

  return {
    received,
    receivedTotal,
    expected,
    expectedTotal,
    platformOptions,
    investmentOptions,
    isLoading,
    error,
    isLimited,
    lockedCount,
  };
}
