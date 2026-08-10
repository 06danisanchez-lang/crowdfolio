import { parseISO, differenceInDays } from 'date-fns';
import { Investment, InvestmentScheduleEntry } from '@/types/investment';

export interface PendingScheduleEntry {
  entry: InvestmentScheduleEntry;
  date: Date;
  daysFromToday: number; // negative = overdue, positive = future, 0 = today
}

/**
 * Resolves which investment_schedule entries are still pending confirmation for a given
 * investment: excludes entries already matched to a payment or explicitly skipped, and —
 * for equity "rentas" investments — excludes interest entries already covered by a
 * capital_return payment dated on/after the entry (rentas amounts are booked as
 * capital_return, not interest, so they never get a matchedPaymentId).
 *
 * Shared by useAlerts (which further buckets results by a day-window for notifications)
 * and usePaymentsOverview (which lists the full backlog with no window limit).
 */
export function getPendingScheduleEntries(
  investment: Pick<Investment, 'incomeModel' | 'equityType' | 'payments'>,
  schedule: InvestmentScheduleEntry[] | undefined,
  today: Date = new Date(),
): PendingScheduleEntry[] {
  if (!schedule || schedule.length === 0) return [];

  const isEquityRentas = investment.incomeModel === 'equity' && investment.equityType === 'rentas';
  const result: PendingScheduleEntry[] = [];

  for (const entry of schedule) {
    if (entry.status === 'matched' || entry.status === 'skipped') continue;

    const entryDate = parseISO(entry.expectedDate);

    if (isEquityRentas && entry.type === 'interest') {
      const hasPaid = (investment.payments ?? []).some(
        p => p.type === 'capital_return' && parseISO(p.date) >= entryDate,
      );
      if (hasPaid) continue;
    }

    result.push({ entry, date: entryDate, daysFromToday: differenceInDays(entryDate, today) });
  }

  return result;
}
