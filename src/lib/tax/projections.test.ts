import { describe, it, expect } from 'vitest';
import { calculateProjectedIncome, calculateYearlyProjection } from './projections';
import type { Investment, InvestmentScheduleEntry } from '@/types/investment';

const TODAY = new Date('2026-10-10T12:00:00');

function inv(overrides: Partial<Investment>): Investment {
  return {
    id: 'i1',
    platform: 'urbanitae',
    projectName: 'Proyecto',
    amount: 10000,
    investmentDate: '2025-10-10',
    expectedReturn: 10,
    status: 'active',
    incomeModel: 'bullet',
    payments: [],
    ...overrides,
  } as Investment;
}

describe('calculateProjectedIncome — bullet (pago único al vencer)', () => {
  it('no proyecta nada si vence el año que viene', () => {
    const r = calculateProjectedIncome(inv({ expectedEndDate: '2027-04-10' }), 2026, 0, { today: TODAY });
    expect(r.projectedAmount).toBe(0);
  });

  it('proyecta todos sus intereses si vence en lo que queda de año', () => {
    // 10.000 € al 10 % durante ~1 año y 1 mes
    const r = calculateProjectedIncome(
      inv({ investmentDate: '2025-10-10', expectedEndDate: '2026-11-10' }), 2026, 0, { today: TODAY },
    );
    expect(r.basis).toBe('maturity');
    expect(r.maturityDate).toBe('2026-11-10');
    expect(r.projectedAmount).toBeGreaterThan(1080);
    expect(r.projectedAmount).toBeLessThan(1090);
  });

  it('descuenta lo ya cobrado este año de esa inversión', () => {
    const full = calculateProjectedIncome(inv({ expectedEndDate: '2026-11-10' }), 2026, 0, { today: TODAY }).projectedAmount;
    const r = calculateProjectedIncome(inv({ expectedEndDate: '2026-11-10' }), 2026, 100, { today: TODAY });
    expect(r.projectedAmount).toBeCloseTo(full - 100, 2);
  });

  it('no proyecta si ya venció (hoy o antes) o no tiene fecha de vencimiento', () => {
    expect(calculateProjectedIncome(inv({ expectedEndDate: '2026-10-10' }), 2026, 0, { today: TODAY }).projectedAmount).toBe(0);
    expect(calculateProjectedIncome(inv({ expectedEndDate: undefined }), 2026, 0, { today: TODAY }).projectedAmount).toBe(0);
  });

  it('usa la fecha de fin de intereses si el proyecto va con retraso sin intereses extra', () => {
    // Vencimiento movido a 2027, pero los intereses dejan de correr el 15/12/2026
    const r = calculateProjectedIncome(
      inv({ expectedEndDate: '2027-03-01', interestEndDate: '2026-12-15' }), 2026, 0, { today: TODAY },
    );
    expect(r.basis).toBe('maturity');
    expect(r.maturityDate).toBe('2026-12-15');
    expect(r.projectedAmount).toBeGreaterThan(0);
  });
});

describe('calculateProjectedIncome — periódicas', () => {
  const schedule: InvestmentScheduleEntry[] = [
    { investmentId: 'i1', expectedDate: '2026-09-15', expectedAmount: 83.33, type: 'interest' }, // ya pasó
    { investmentId: 'i1', expectedDate: '2026-10-15', expectedAmount: 83.33, type: 'interest' },
    { investmentId: 'i1', expectedDate: '2026-11-15', expectedAmount: 83.33, type: 'interest' },
    { investmentId: 'i1', expectedDate: '2026-12-15', expectedAmount: 83.33, type: 'interest' },
    { investmentId: 'i1', expectedDate: '2026-12-15', expectedAmount: 10000, type: 'principal' }, // capital: no es renta
    { investmentId: 'i1', expectedDate: '2027-01-15', expectedAmount: 83.33, type: 'interest' }, // otro ejercicio
  ];

  it('suma solo las cuotas de intereses futuras de este ejercicio', () => {
    const r = calculateProjectedIncome(
      inv({ incomeModel: 'periodic_fixed', paymentFrequency: 'monthly', expectedEndDate: '2027-06-15' }),
      2026, 500, { today: TODAY, schedule },
    );
    expect(r.basis).toBe('schedule');
    expect(r.projectedAmount).toBeCloseTo(249.99, 2);
  });

  it('sin calendario cargado, prorratea como antes', () => {
    const r = calculateProjectedIncome(
      inv({ incomeModel: 'periodic_fixed', paymentFrequency: 'monthly', investmentDate: '2026-01-01', expectedEndDate: '2027-06-15' }),
      2026, 0, { today: TODAY },
    );
    expect(r.basis).toBe('prorata');
    expect(r.projectedAmount).toBeGreaterThan(0);
  });
});

describe('calculateProjectedIncome — sin rendimiento fijo', () => {
  it('equity y variable no proyectan nada', () => {
    expect(calculateProjectedIncome(inv({ incomeModel: 'equity', expectedEndDate: '2030-01-01' }), 2026, 0, { today: TODAY }).projectedAmount).toBe(0);
    expect(calculateProjectedIncome(inv({ incomeModel: 'variable_or_unknown', expectedEndDate: '2027-01-01' }), 2026, 0, { today: TODAY }).projectedAmount).toBe(0);
  });

  it('fuera del ejercicio en curso no hay proyección', () => {
    expect(calculateProjectedIncome(inv({ expectedEndDate: '2025-11-10' }), 2025, 0, { today: TODAY }).projectedAmount).toBe(0);
  });
});

describe('calculateYearlyProjection', () => {
  it('suma por modelo y aplica la retención por defecto de cada plataforma', () => {
    const investments = [
      inv({ id: 'a', expectedEndDate: '2026-11-10' }), // bullet que vence este año, española
      inv({ id: 'b', expectedEndDate: '2028-01-01' }), // bullet de otro año: 0
      inv({ id: 'c', incomeModel: 'equity', expectedEndDate: '2030-01-01' }), // 0
      inv({ id: 'd', platform: 'estateguru', incomeModel: 'periodic_fixed', paymentFrequency: 'monthly', expectedEndDate: '2027-06-15' }),
    ];
    const scheduleByInvestment = {
      d: [{ investmentId: 'd', expectedDate: '2026-11-20', expectedAmount: 50, type: 'interest' as const }],
    };
    const p = calculateYearlyProjection(investments, new Map(), 0, 0, 0, 2026, { today: TODAY, scheduleByInvestment });
    expect(p.byInvestment.map((b) => b.investmentId).sort()).toEqual(['a', 'd']);
    const d = p.byInvestment.find((b) => b.investmentId === 'd')!;
    expect(d.projectedAmount).toBe(50);
    expect(d.projectedWithholding).toBe(0); // plataforma extranjera: sin retención española
    const a = p.byInvestment.find((b) => b.investmentId === 'a')!;
    expect(a.projectedWithholding).toBeCloseTo(a.projectedAmount * 0.19, 1);
  });
});
