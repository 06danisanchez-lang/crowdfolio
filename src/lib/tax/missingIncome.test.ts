import { describe, it, expect } from 'vitest';
import { findMissingIncome, MissingIncomeInvestment } from './missingIncome';
import { InvestmentScheduleEntry } from '@/types/investment';

const q = (expectedDate: string, type: InvestmentScheduleEntry['type'] = 'interest'): InvestmentScheduleEntry => ({
  investmentId: 'i', expectedDate, expectedAmount: 45, type, status: 'pending',
});
const schedule = [q('2025-04-15'), q('2025-07-15'), q('2025-10-15'), q('2026-01-15'), q('2027-01-15', 'principal')];

const inv = (o: Partial<MissingIncomeInvestment> = {}): MissingIncomeInvestment => ({
  id: 'i', projectName: 'Ruzafa', incomeModel: 'periodic_fixed', status: 'active', assumedPaidUntil: null, payments: [], ...o,
});

const run = (o: Partial<MissingIncomeInvestment> = {}, year = 2025, today = '2026-03-01') =>
  findMissingIncome({ year, today, investments: [inv(o)], schedules: { i: schedule } });

describe('findMissingIncome', () => {
  it('cuotas cobradas sin detalle → informe incompleto', () => {
    const r = run({ assumedPaidUntil: '2026-03-01' });
    expect(r.isIncomplete).toBe(true);
    expect(r.assumed).toEqual([{ investmentId: 'i', projectName: 'Ruzafa', dates: ['2025-04-15', '2025-07-15', '2025-10-15'] }]);
    expect(r.unconfirmed).toEqual([]);
  });

  it('al registrar sus cobros deja de faltar', () => {
    const payments = ['2025-04-15', '2025-07-15', '2025-10-15'].map((date, n) => ({ id: `p${n}`, date, amount: 45, type: 'interest' as const }));
    const r = run({ assumedPaidUntil: '2026-03-01', payments });
    expect(r.isIncomplete).toBe(false);
    expect(r.assumed).toEqual([]);
  });

  it('vencidas sin cobro ni marca: aviso, no incompleto', () => {
    const r = run();
    expect(r.isIncomplete).toBe(false);
    expect(r.unconfirmed[0].dates).toEqual(['2025-04-15', '2025-07-15', '2025-10-15']);
  });

  it('solo el año pedido, y el capital no cuenta', () => {
    const r = run({ assumedPaidUntil: '2027-12-31' }, 2027, '2028-01-01');
    expect(r.assumed).toEqual([]);
  });

  it('impagos y bullet fuera; cerradas no avisan de «sin confirmar»', () => {
    expect(run({ status: 'defaulted', assumedPaidUntil: '2026-03-01' }).assumed).toEqual([]);
    expect(run({ incomeModel: 'bullet', assumedPaidUntil: '2026-03-01' }).assumed).toEqual([]);
    expect(run({ status: 'completed' }).unconfirmed).toEqual([]);
    expect(run({ status: 'completed', assumedPaidUntil: '2026-03-01' }).isIncomplete).toBe(true);
  });
});
