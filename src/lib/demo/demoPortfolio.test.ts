import { describe, it, expect } from 'vitest';
import { buildDemoPortfolio } from './demoPortfolio';
import { buildRiskSummary } from '@/lib/investment/riskSummary';
import type { Investment, Payment } from '@/types/investment';

function toInvestments(today: Date): Investment[] {
  return buildDemoPortfolio(today).investments.map((d, i) => ({
    id: d.key,
    platform: d.platform,
    projectName: d.projectName,
    amount: d.amount,
    investmentDate: d.investmentDate,
    expectedEndDate: d.expectedEndDate,
    originalEndDate: d.originalEndDate ?? undefined,
    interestEndDate: d.interestEndDate ?? undefined,
    wasExtended: d.wasExtended,
    expectedReturn: d.expectedReturn,
    status: d.status,
    incomeModel: d.incomeModel,
    paymentFrequency: d.paymentFrequency ?? undefined,
    principalReturnType: d.principalReturnType,
    actualEndDate: d.actualEndDate ?? undefined,
    defaultedAt: d.defaultedAt ?? undefined,
    createdAt: '', updatedAt: '',
    payments: d.payments.map((p, j): Payment => ({
      id: `${i}-${j}`, investmentId: d.key, date: p.date, amount: p.amount, type: p.type,
      withholdingApplied: p.withholding,
    } as Payment)),
  } as Investment));
}

// Varias fechas, incluidos cambios de año y fin de mes.
const DAYS = ['2026-11-07', '2027-01-02', '2027-03-31', '2027-12-30'].map(d => new Date(`${d}T12:00:00`));

describe('cartera de la demo', () => {
  it.each(DAYS)('enseña todos los casos el %s', (today) => {
    const p = buildDemoPortfolio(today);
    const invs = toInvestments(today);
    const platforms = new Set(p.investments.map(i => i.platform));
    expect(platforms.size).toBe(3);
    expect(p.investments.length + p.future.length).toBeGreaterThanOrEqual(8);

    const risk = buildRiskSummary(invs, today);
    expect(risk.byKind.defaulted.count).toBe(1);
    expect(risk.byKind.overdue.count).toBe(1);
    expect(risk.byKind.delayed.count).toBe(2);

    // El retraso sin intereses extra baja la TAE; la prórroga no.
    const delta = risk.items.find(r => r.investment.id === 'delta')!;
    expect(delta.effectiveTAE).not.toBeNull();
    expect(delta.effectiveTAE!).toBeLessThan(delta.promisedTAE);

    // Cobros: intereses con retención del 19 % y al menos una devolución de capital.
    const pays = p.investments.flatMap(i => i.payments);
    expect(pays.some(x => x.type === 'principal')).toBe(true);
    for (const x of pays) {
      expect(x.amount).toBeGreaterThan(0);
      if (x.type === 'interest') expect(x.withholding).toBeCloseTo(x.amount * 0.19, 1);
      else expect(x.withholding).toBe(0);
    }

    // Informe fiscal con datos del año en curso y del anterior.
    const year = today.getFullYear();
    const years = new Set(pays.filter(x => x.type === 'interest').map(x => Number(x.date.slice(0, 4))));
    expect(years.has(year)).toBe(true);
    expect(years.has(year - 1)).toBe(true);

    // Nada cobrado en el futuro, y la planificada es futura.
    const todayStr = today.toISOString().slice(0, 10);
    expect(pays.every(x => x.date <= todayStr)).toBe(true);
    expect(p.future[0].estimatedOpenDate > todayStr).toBe(true);

    // Las cerradas devuelven todo el capital; la vencida sin confirmar no tiene cobros.
    for (const i of p.investments.filter(x => x.status === 'completed')) {
      const back = i.payments.filter(x => x.type === 'principal').reduce((s, x) => s + x.amount, 0);
      expect(back).toBe(i.amount);
    }
    expect(p.investments.find(i => i.status === 'pending')!.payments).toHaveLength(0);
  });

  it('usa nombres de proyecto inventados', () => {
    for (const i of buildDemoPortfolio().investments) {
      expect(i.projectName).toMatch(/(Alfa|Beta|Gamma|Delta|Épsilon|Zeta|Eta|Theta|Iota) \(/);
    }
  });
});
