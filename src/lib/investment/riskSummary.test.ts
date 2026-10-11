import { describe, it, expect } from 'vitest';
import { buildRiskSummary, classifyRisk, formatDelay } from './riskSummary';
import type { Investment, Payment } from '@/types/investment';

const today = new Date('2026-10-11T12:00:00');
const base = {
  id: 'ok', platform: 'urbanitae', projectName: 'En plazo', amount: 1000,
  investmentDate: '2025-01-01', expectedEndDate: '2027-01-01', expectedReturn: 10,
  incomeModel: 'bullet', status: 'active', payments: [],
} as unknown as Investment;
const principal = (amount: number): Payment => ({ id: 'p', date: '2026-01-01', amount, type: 'principal' }) as Payment;

const overdue = { ...base, id: 'v', projectName: 'Vencida', status: 'pending', expectedEndDate: '2026-04-11' } as Investment;
const delayed = { ...base, id: 'r', projectName: 'Retrasada', platform: 'wecity', expectedEndDate: '2027-03-01', originalEndDate: '2026-06-01', interestEndDate: '2026-06-01' } as Investment;
const defaulted = { ...base, id: 'd', projectName: 'Impago', status: 'defaulted', amount: 5000, expectedEndDate: '2025-10-01', payments: [principal(500)] } as Investment;
const completed = { ...base, id: 'c', status: 'completed' } as Investment;

describe('classifyRisk', () => {
  it('clasifica cada caso', () => {
    expect(classifyRisk(base, today)).toBeNull();
    expect(classifyRisk(overdue, today)).toBe('overdue');
    expect(classifyRisk(delayed, today)).toBe('delayed');
    expect(classifyRisk(defaulted, today)).toBe('defaulted');
    expect(classifyRisk(completed, today)).toBeNull();
    // activa con la fecha ya pasada (antes de pasar a «Por confirmar»)
    expect(classifyRisk({ ...base, expectedEndDate: '2026-10-01' } as Investment, today)).toBe('overdue');
  });
});

describe('buildRiskSummary', () => {
  const s = buildRiskSummary([base, overdue, delayed, defaulted, completed], today);

  it('suma el capital en riesgo: pendiente en abiertas, invertido − recuperado en impagos', () => {
    expect(s.total).toBe(1000 + 1000 + 4500);
    expect(s.byKind.defaulted).toEqual({ amount: 4500, count: 1 });
    expect(s.byKind.overdue).toEqual({ amount: 1000, count: 1 });
    expect(s.byKind.delayed).toEqual({ amount: 1000, count: 1 });
  });

  it('agrupa por plataforma', () => {
    expect(s.byPlatform).toEqual([
      { key: 'urbanitae', label: 'Urbanitae', amount: 5500, count: 2 },
      { key: 'wecity', label: 'Wecity', amount: 1000, count: 1 },
    ]);
  });

  it('ordena de más a menos retraso, contado desde la fecha prometida', () => {
    expect(s.items.map(i => i.investment.id)).toEqual(['d', 'r', 'v']);
    expect(s.items.find(i => i.investment.id === 'v')!.delayDays).toBe(183);
  });

  it('la retrasada compara TAE prometida con la ajustada', () => {
    const r = s.items.find(i => i.investment.id === 'r')!;
    expect(r.promisedTAE).toBe(10);
    expect(r.effectiveTAE!).toBeLessThan(10);
    expect(s.items.find(i => i.investment.id === 'd')!.effectiveTAE).toBeNull();
  });
});

describe('formatDelay', () => {
  it('días hasta 60, luego meses', () => {
    expect(formatDelay(1)).toBe('1 día');
    expect(formatDelay(45)).toBe('45 días');
    expect(formatDelay(183)).toBe('6 meses');
  });
});
