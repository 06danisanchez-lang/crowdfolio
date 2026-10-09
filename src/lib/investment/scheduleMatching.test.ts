import { describe, it, expect } from 'vitest';
import { matchScheduleToPayments } from './scheduleMatching';
import type { InvestmentScheduleEntry, Payment } from '@/types/investment';

const entry = (expectedDate: string, type: InvestmentScheduleEntry['type'], expectedAmount = 10): InvestmentScheduleEntry => ({
  id: `${type}-${expectedDate}`,
  investmentId: 'inv',
  expectedDate,
  expectedAmount,
  type,
  status: 'pending',
  matchedPaymentId: null,
});
const pay = (date: string, type: Payment['type'], amount = 10): Payment => ({ id: `${type}-${date}`, date, type, amount });

const open = (entries: InvestmentScheduleEntry[]) => entries.filter(e => !e.matchedPaymentId).map(e => `${e.type}@${e.expectedDate}`);

describe('matchScheduleToPayments', () => {
  const schedule = [
    entry('2026-01-01', 'interest'),
    entry('2026-02-01', 'interest'),
    entry('2026-03-01', 'interest'),
    entry('2026-03-01', 'principal', 1000),
  ];

  it('cuotas cobradas dejan de estar pendientes', () => {
    const result = matchScheduleToPayments('periodic_fixed', schedule, [pay('2026-01-02', 'interest'), pay('2026-02-01', 'interest')]);
    expect(open(result)).toEqual(['interest@2026-03-01', 'principal@2026-03-01']);
    expect(result[0].status).toBe('matched');
  });

  it('un cobro que llega tarde cubre la cuota que tocaba, no la siguiente', () => {
    // la de enero se cobra en febrero: queda pendiente la de febrero, no la de enero
    const result = matchScheduleToPayments('periodic_fixed', schedule, [pay('2026-02-15', 'interest')]);
    expect(open(result)).toEqual(['interest@2026-02-01', 'interest@2026-03-01', 'principal@2026-03-01']);
  });

  it('el capital solo se da por devuelto cuando llega entero', () => {
    const partial = matchScheduleToPayments('periodic_fixed', schedule, [pay('2026-03-01', 'principal', 500)]);
    expect(open(partial)).toContain('principal@2026-03-01');
    const full = matchScheduleToPayments('periodic_fixed', schedule, [pay('2026-02-01', 'principal', 500), pay('2026-03-01', 'principal', 500)]);
    expect(open(full)).not.toContain('principal@2026-03-01');
  });

  it('amortizable: intereses y capital del mismo día son una sola cuota', () => {
    const amort = [entry('2026-01-01', 'mixed', 100), entry('2026-02-01', 'mixed', 100)];
    const result = matchScheduleToPayments('amortizing', amort, [pay('2026-01-01', 'interest', 10), pay('2026-01-01', 'principal', 90)]);
    expect(open(result)).toEqual(['mixed@2026-02-01']);
  });

  it('respeta lo ya emparejado u omitido en la base de datos', () => {
    const withDb = [
      { ...entry('2026-01-01', 'interest'), status: 'matched' as const, matchedPaymentId: 'interest-2026-01-01' },
      { ...entry('2026-02-01', 'interest'), status: 'skipped' as const },
      entry('2026-03-01', 'interest'),
    ];
    const result = matchScheduleToPayments('periodic_fixed', withDb, [pay('2026-01-01', 'interest'), pay('2026-03-02', 'interest')]);
    expect(result[1].status).toBe('skipped');
    expect(result[2].matchedPaymentId).toBe('interest-2026-03-02');
  });

  it('otros modelos no se tocan', () => {
    const equity = [entry('2026-01-01', 'interest')];
    expect(matchScheduleToPayments('equity', equity, [pay('2026-01-01', 'interest')])).toBe(equity);
  });
});

describe('matchScheduleToPayments: importes', () => {
  const monthly = [entry('2026-01-01', 'interest'), entry('2026-02-01', 'interest'), entry('2026-03-01', 'interest')];

  it('unos intereses de demora pequeños no cubren la cuota siguiente', () => {
    const result = matchScheduleToPayments('periodic_fixed', monthly, [pay('2026-01-01', 'interest', 10), pay('2026-01-15', 'interest', 2)]);
    expect(open(result)).toEqual(['interest@2026-02-01', 'interest@2026-03-01']);
  });

  it('un cobro de dos cuotas juntas cubre las dos', () => {
    const result = matchScheduleToPayments('periodic_fixed', monthly, [pay('2026-02-01', 'interest', 20)]);
    expect(open(result)).toEqual(['interest@2026-03-01']);
  });

  it('quien apunta el neto tras la retención también cuadra', () => {
    const result = matchScheduleToPayments('periodic_fixed', monthly, [pay('2026-01-01', 'interest', 8.1), pay('2026-02-01', 'interest', 8.1)]);
    expect(open(result)).toEqual(['interest@2026-03-01']);
  });

  it('amortizable: una cuota apuntada en días distintos cuenta una vez', () => {
    const amort = [entry('2026-01-01', 'mixed', 100), entry('2026-02-01', 'mixed', 100)];
    const result = matchScheduleToPayments('amortizing', amort, [pay('2026-01-01', 'interest', 10), pay('2026-01-03', 'principal', 90)]);
    expect(open(result)).toEqual(['mixed@2026-02-01']);
  });
});
