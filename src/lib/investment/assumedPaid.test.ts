import { describe, it, expect } from 'vitest';
import { applyAssumedPaid, hasPastInstallments } from './assumedPaid';
import { getPendingScheduleEntries } from './pendingPayments';
import { InvestmentScheduleEntry } from '@/types/investment';

const entry = (expectedDate: string, o: Partial<InvestmentScheduleEntry> = {}): InvestmentScheduleEntry => ({
  investmentId: 'i', expectedDate, expectedAmount: 45, type: 'interest', status: 'pending', ...o,
});

describe('applyAssumedPaid', () => {
  const schedule = [
    entry('2025-04-15', { status: 'matched', matchedPaymentId: 'p1' }),
    entry('2025-07-15'),
    entry('2025-10-15'),
    entry('2026-01-15'),
  ];

  it('marca como «cobrada, falta el detalle» las cuotas hasta la fecha, sin tocar las cobradas', () => {
    const r = applyAssumedPaid(schedule, '2025-10-15');
    expect(r.map(e => e.status)).toEqual(['matched', 'assumed', 'assumed', 'pending']);
  });

  it('sin fecha no cambia nada', () => {
    expect(applyAssumedPaid(schedule, null)).toBe(schedule);
  });

  it('dejan de salir como pendientes o atrasadas', () => {
    const pending = getPendingScheduleEntries(
      { incomeModel: 'periodic_fixed', payments: [] },
      applyAssumedPaid(schedule, '2025-10-15'),
      new Date('2026-03-01'),
    );
    expect(pending.map(p => p.entry.expectedDate)).toEqual(['2026-01-15']);
  });
});

describe('hasPastInstallments', () => {
  it('por la primera cuota (dicha o estimada)', () => {
    expect(hasPastInstallments({ investmentDate: '2025-01-15', paymentFrequency: 'quarterly', today: '2025-03-01' })).toBe(false);
    expect(hasPastInstallments({ investmentDate: '2025-01-15', paymentFrequency: 'quarterly', today: '2025-05-01' })).toBe(true);
    expect(hasPastInstallments({ investmentDate: '2025-01-15', firstPaymentDate: '2025-02-01', today: '2025-03-01' })).toBe(true);
    expect(hasPastInstallments({ investmentDate: '2025-01-15', today: '2026-01-01' })).toBe(false);
  });
});
