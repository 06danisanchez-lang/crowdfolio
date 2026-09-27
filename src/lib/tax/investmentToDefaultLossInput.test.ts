import { describe, it, expect } from 'vitest';
import { investmentToDefaultLossInput, investmentToDefaultLossAnswers } from './investmentToDefaultLossInput';
import type { Investment } from '@/types/investment';

function makeInvestment(overrides: Partial<Investment> = {}): Investment {
  return {
    id: 'inv-1',
    platform: 'urbanitae',
    projectName: 'Proyecto de prueba',
    amount: 10000,
    investmentDate: '2024-01-01',
    expectedReturn: 8,
    incomeModel: 'bullet',
    status: 'defaulted',
    payments: [],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('investmentToDefaultLossInput', () => {
  it('mapea las columnas loss_* guardadas al shape de DefaultLossInput', () => {
    const inv = makeInvestment({
      lossAssessedAt: '2026-01-01T00:00:00.000Z',
      lossInsolvencyStatus: 'concluded_unpaid',
      lossInsolvencyConcludedDate: '2025-06-01',
      lossQuitaAmount: 2000,
      lossQuitaDate: '2025-01-01',
      lossEnforcementStarted: false,
      payments: [{ id: 'p1', date: '2024-06-01', amount: 1000, type: 'principal' }],
    });
    const input = investmentToDefaultLossInput(inv);
    expect(input.incomeModel).toBe('bullet');
    expect(input.amountInvested).toBe(10000);
    expect(input.payments).toEqual([{ type: 'principal', amount: 1000, date: '2024-06-01' }]);
    expect(input.lossAssessedAt).toBe('2026-01-01T00:00:00.000Z');
    expect(input.insolvencyStatus).toBe('concluded_unpaid');
    expect(input.insolvencyConcludedDate).toBe('2025-06-01');
    expect(input.quitaAmount).toBe(2000);
    expect(input.quitaDate).toBe('2025-01-01');
    expect(input.enforcementStarted).toBe(false);
  });

  it('inversión sin evaluar (sin loss_* guardadas) → todos los hechos a null, lossAssessedAt null', () => {
    const input = investmentToDefaultLossInput(makeInvestment());
    expect(input.lossAssessedAt).toBeNull();
    expect(input.insolvencyStatus).toBeNull();
    expect(input.quitaAmount).toBeNull();
    expect(input.enforcementStarted).toBeNull();
  });
});

describe('investmentToDefaultLossAnswers', () => {
  it('equity → siempre null, aunque tenga loss_* guardadas', () => {
    const inv = makeInvestment({
      incomeModel: 'equity',
      lossAssessedAt: '2026-01-01T00:00:00.000Z',
    });
    expect(investmentToDefaultLossAnswers(inv)).toBeNull();
  });

  it('sin evaluar (lossAssessedAt null) → null', () => {
    expect(investmentToDefaultLossAnswers(makeInvestment())).toBeNull();
  });

  it('evaluada, con ejecución iniciada → reconstruye las respuestas del cuestionario', () => {
    const inv = makeInvestment({
      lossAssessedAt: '2026-01-01T00:00:00.000Z',
      lossInsolvencyStatus: 'none',
      lossQuitaAmount: null,
      lossQuitaDate: null,
      lossEnforcementStarted: true,
      lossEnforcementDate: '2025-01-15',
      lossEnforcementInitiator: 'platform',
    });
    const answers = investmentToDefaultLossAnswers(inv);
    expect(answers).toEqual({
      insolvencyStatus: 'none',
      insolvencyConcludedDate: null,
      quitaAmount: null,
      quitaDate: null,
      enforcementStarted: true,
      enforcementDate: '2025-01-15',
      enforcementInitiator: 'platform',
    });
  });

  it('evaluada, sin ejecución iniciada → enforcementDate/enforcementInitiator quedan null aunque hubiera datos sueltos', () => {
    const inv = makeInvestment({
      lossAssessedAt: '2026-01-01T00:00:00.000Z',
      lossInsolvencyStatus: 'open',
      lossEnforcementStarted: false,
      lossEnforcementDate: '2025-01-15',
      lossEnforcementInitiator: 'user',
    });
    const answers = investmentToDefaultLossAnswers(inv);
    expect(answers?.enforcementStarted).toBe(false);
    expect(answers?.enforcementDate).toBeNull();
    expect(answers?.enforcementInitiator).toBeNull();
  });
});
