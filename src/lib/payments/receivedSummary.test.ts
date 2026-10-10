import { describe, it, expect } from 'vitest';
import { sumReceived, groupByMonth } from './receivedSummary';

const rows = [
  { date: '2026-09-15', type: 'interest' as const, amount: 18.75 },
  { date: '2026-09-01', type: 'interest' as const, amount: 85 },
  { date: '2026-08-20', type: 'principal' as const, amount: 1500 },
  { date: '2026-08-20', type: 'interest' as const, amount: 13.13 },
  { date: '2026-04-30', type: 'capital_return' as const, amount: 200 },
  { date: '2026-04-30', type: 'dividend' as const, amount: 61.25 },
];

describe('sumReceived', () => {
  it('separa rendimientos de capital devuelto', () => {
    expect(sumReceived(rows)).toEqual({ income: 178.13, capital: 1700 });
  });
});

describe('groupByMonth', () => {
  it('agrupa por mes en el orden de llegada y suma cada mes por separado', () => {
    const g = groupByMonth(rows);
    expect(g.map(m => m.month)).toEqual(['2026-09', '2026-08', '2026-04']);
    expect(g[0]).toMatchObject({ income: 103.75, capital: 0 });
    expect(g[1]).toMatchObject({ income: 13.13, capital: 1500 });
    expect(g[2].rows).toHaveLength(2);
  });
});
