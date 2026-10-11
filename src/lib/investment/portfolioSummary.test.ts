import { describe, it, expect } from 'vitest';
import { computePortfolioSummary } from './portfolioSummary';
import {
  calculateAccruedReturn,
  calculateInvestmentTotalReturn,
  calculateSimpleInterestOnOutstanding,
  getOutstandingCapital,
} from './calculations';
import type { Investment, Payment } from '@/types/investment';

// 10 % anual, 1.000 €, del 1/1/2025 al 1/1/2027 (24 meses), a vencimiento
const base: Investment = {
  id: 'a',
  platform: 'urbanitae',
  projectName: 'Activa',
  amount: 1000,
  investmentDate: '2025-01-01',
  expectedEndDate: '2027-01-01',
  expectedReturn: 10,
  incomeModel: 'bullet',
  status: 'active',
  payments: [],
} as Investment;

const principal = (date: string, amount: number): Payment => ({ id: date, date, amount, type: 'principal' }) as Payment;
const today = new Date('2026-01-01T00:00:00Z');

describe('capital pendiente y devoluciones parciales', () => {
  it('sin devoluciones, el interés es el de siempre', () => {
    expect(calculateSimpleInterestOnOutstanding(base, new Date('2026-01-01'))).toBeCloseTo(100, 0);
    expect(getOutstandingCapital(base)).toBe(1000);
  });

  it('una devolución de la mitad a los 6 meses baja la base desde esa fecha', () => {
    const inv = { ...base, payments: [principal('2025-07-02', 500)] };
    expect(getOutstandingCapital(inv)).toBe(500);
    // ~6 meses sobre 1.000 + ~18 meses sobre 500 = 50 + 75
    expect(calculateInvestmentTotalReturn(inv)).toBeCloseTo(125, 0);
    // a 1/1/2026: 6 meses sobre 1.000 + 6 meses sobre 500
    expect(calculateAccruedReturn(inv, [], today)).toBeCloseTo(75, 0);
  });

  it('el capital pendiente nunca es negativo', () => {
    expect(getOutstandingCapital({ ...base, payments: [principal('2025-06-01', 1500)] })).toBe(0);
  });
});

describe('computePortfolioSummary', () => {
  const defaulted = { ...base, id: 'd', projectName: 'Impago', status: 'defaulted', amount: 5000 } as Investment;
  const pending = { ...base, id: 'p', projectName: 'Vencida', status: 'pending', expectedEndDate: '2025-10-01' } as Investment;

  it('un impago no cuenta como capital activo, ni devenga, ni entra en la TAE media', () => {
    const s = computePortfolioSummary([base, defaulted], [base, defaulted], [], {}, today);
    expect(s.activeSummary.capital).toBe(1000);
    expect(s.activeSummary.count).toBe(1);
    expect(s.activeInvestments).toBe(1);
    expect(s.activeSummary.accruedProfit).toBeCloseTo(100, 0);
    expect(s.averageReturn).toBeCloseTo(10, 1);
    // sigue contando como dinero invertido en total
    expect(s.totalInvested).toBe(6000);
  });

  it('el capital activo descuenta las devoluciones parciales, también en vencidas sin confirmar', () => {
    const partial = { ...base, payments: [principal('2025-07-02', 400)] };
    const pendingPartial = { ...pending, payments: [principal('2025-08-01', 300)] };
    const s = computePortfolioSummary([partial, pendingPartial], [partial], [pendingPartial], {}, today);
    expect(s.activeSummary.capital).toBe(600 + 700);
    expect(s.activeSummary.count).toBe(2);
  });
});
