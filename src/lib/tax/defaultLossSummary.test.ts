import { describe, it, expect } from 'vitest';
import { computeDefaultLossSummary } from './defaultLossSummary';
import type { Investment } from '@/types/investment';

function makeInvestment(overrides: Partial<Investment> & { id: string }): Investment {
  return {
    platform: 'urbanitae',
    projectName: 'Proyecto de prueba',
    amount: 1000,
    investmentDate: '2024-01-01',
    expectedReturn: 8,
    incomeModel: 'bullet',
    status: 'defaulted',
    payments: [],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    lossAssessedAt: '2025-01-01T00:00:00.000Z',
    lossInsolvencyStatus: 'none',
    ...overrides,
  };
}

const TODAY = new Date('2027-06-01T12:00:00.000Z');

describe('computeDefaultLossSummary', () => {
  it('ejercicio sin nada (sin inversiones) → todo vacío', () => {
    const s = computeDefaultLossSummary([], 2025, TODAY);
    expect(s).toEqual({
      year: 2025,
      declarable: { totalAmount: 0, rows: [] },
      recoveryGains: { totalAmount: 0, rows: [] },
      pending: [],
      notAssessed: [],
      equityExcluded: [],
    });
  });

  it('varias inversiones y ejercicios: cada una aparece solo en el año de su hecho', () => {
    const invA = makeInvestment({
      id: 'inv-a',
      amount: 1000,
      lossInsolvencyStatus: 'concluded_unpaid',
      lossInsolvencyConcludedDate: '2025-06-10',
    });
    const invB = makeInvestment({
      id: 'inv-b',
      amount: 2000,
      lossInsolvencyStatus: 'concluded_unpaid',
      lossInsolvencyConcludedDate: '2026-03-01',
    });

    const s2025 = computeDefaultLossSummary([invA, invB], 2025, TODAY);
    expect(s2025.declarable.rows.map((r) => r.investmentId)).toEqual(['inv-a']);
    expect(s2025.declarable.totalAmount).toBe(1000);

    const s2026 = computeDefaultLossSummary([invA, invB], 2026, TODAY);
    expect(s2026.declarable.rows.map((r) => r.investmentId)).toEqual(['inv-b']);
    expect(s2026.declarable.totalAmount).toBe(2000);
  });

  it('quita en 2025 y concurso concluido en 2027: cada parte va a su ejercicio', () => {
    const inv = makeInvestment({
      id: 'inv-1',
      amount: 1000,
      lossQuitaAmount: 300,
      lossQuitaDate: '2025-05-01',
      lossInsolvencyStatus: 'concluded_unpaid',
      lossInsolvencyConcludedDate: '2027-02-01',
    });

    const s2025 = computeDefaultLossSummary([inv], 2025, TODAY);
    expect(s2025.declarable.rows).toHaveLength(1);
    expect(s2025.declarable.rows[0]).toMatchObject({
      investmentId: 'inv-1', trigger: 'quita', amount: 300, year: 2025, loss: 1000, status: 'deductible',
    });
    expect(s2025.declarable.totalAmount).toBe(300);

    const s2027 = computeDefaultLossSummary([inv], 2027, TODAY);
    expect(s2027.declarable.rows).toHaveLength(1);
    expect(s2027.declarable.rows[0]).toMatchObject({
      investmentId: 'inv-1', trigger: 'insolvency_concluded', amount: 700, year: 2027, loss: 1000,
    });
    expect(s2027.declarable.totalAmount).toBe(700);

    // Un año sin ningún hecho de esta inversión → no aparece.
    const s2026 = computeDefaultLossSummary([inv], 2026, TODAY);
    expect(s2026.declarable.rows).toEqual([]);
  });

  it('recuperación posterior a la imputación → ganancia en el año del cobro, con el año de la pérdida original', () => {
    const inv = makeInvestment({
      id: 'inv-1',
      amount: 1000,
      lossInsolvencyStatus: 'concluded_unpaid',
      lossInsolvencyConcludedDate: '2025-06-01',
      payments: [{ id: 'p1', date: '2026-03-01', amount: 150, type: 'principal' }],
    });

    const s = computeDefaultLossSummary([inv], 2026, TODAY);
    expect(s.recoveryGains.rows).toHaveLength(1);
    expect(s.recoveryGains.rows[0]).toMatchObject({
      investmentId: 'inv-1', year: 2026, lossYear: 2025, amount: 150,
    });
    expect(s.recoveryGains.totalAmount).toBe(150);
    // La imputación original queda en su propio año (2025), no en 2026.
    expect(s.declarable.rows).toEqual([]);
  });

  it('equity en impago → excluida aparte, no computa en nada', () => {
    const inv = makeInvestment({
      id: 'inv-eq',
      incomeModel: 'equity',
      lossAssessedAt: '2026-01-01T00:00:00.000Z',
    });
    const s = computeDefaultLossSummary([inv], 2026, TODAY);
    expect(s.equityExcluded).toEqual([{ investmentId: 'inv-eq', projectName: 'Proyecto de prueba' }]);
    expect(s.declarable.rows).toEqual([]);
    expect(s.pending).toEqual([]);
  });

  it('not_assessed → excluida aparte, no computa en nada', () => {
    const inv = makeInvestment({ id: 'inv-na', lossAssessedAt: null });
    const s = computeDefaultLossSummary([inv], 2026, TODAY);
    expect(s.notAssessed).toEqual([{ investmentId: 'inv-na', projectName: 'Proyecto de prueba' }]);
    expect(s.declarable.rows).toEqual([]);
    expect(s.pending).toEqual([]);
  });

  it('pendientes (not_yet / pending_insolvency) no computan en declarable, y aparecen en pending independientemente del año', () => {
    const inv = makeInvestment({
      id: 'inv-p',
      amount: 1000,
      lossInsolvencyStatus: 'open',
    });
    const s = computeDefaultLossSummary([inv], 2025, TODAY);
    expect(s.declarable.rows).toEqual([]);
    expect(s.declarable.totalAmount).toBe(0);
    expect(s.pending).toEqual([{
      investmentId: 'inv-p', projectName: 'Proyecto de prueba', platform: 'Urbanitae',
      pendingAmount: 1000, pendingReason: 'pending_insolvency', deadlineDate: null,
    }]);

    // pending no está acotado por año: aparece igual para cualquier ejercicio.
    const sOtherYear = computeDefaultLossSummary([inv], 2019, TODAY);
    expect(sOtherYear.pending).toEqual(s.pending);
  });

  it('investment activa (no defaulted) → no se procesa en absoluto', () => {
    const inv = makeInvestment({ id: 'inv-active', status: 'active' });
    const s = computeDefaultLossSummary([inv], 2025, TODAY);
    expect(s).toEqual({
      year: 2025,
      declarable: { totalAmount: 0, rows: [] },
      recoveryGains: { totalAmount: 0, rows: [] },
      pending: [],
      notAssessed: [],
      equityExcluded: [],
    });
  });
});
