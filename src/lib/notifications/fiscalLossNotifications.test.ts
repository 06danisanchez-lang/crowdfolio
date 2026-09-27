import { describe, it, expect } from 'vitest';
import { computeFiscalLossNotifications } from './fiscalLossNotifications';
import type { Investment } from '@/types/investment';

function makeInvestment(overrides: Partial<Investment> & { id: string }): Investment {
  return {
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

const TODAY = new Date('2027-01-15T12:00:00.000Z');

describe('computeFiscalLossNotifications', () => {
  it('inversión no defaulted → ninguna notificación', () => {
    const inv = makeInvestment({ id: 'inv-1', status: 'active' });
    expect(computeFiscalLossNotifications([inv], [], TODAY)).toEqual([]);
  });

  it('equity defaulted → ninguna notificación (not_applicable_equity, nunca not_assessed)', () => {
    const inv = makeInvestment({ id: 'inv-1', incomeModel: 'equity', lossAssessedAt: '2026-01-01T00:00:00.000Z' });
    expect(computeFiscalLossNotifications([inv], [], TODAY)).toEqual([]);
  });

  it('not_assessed → fiscal_loss_incomplete', () => {
    const inv = makeInvestment({ id: 'inv-1' }); // sin lossAssessedAt
    const drafts = computeFiscalLossNotifications([inv], [], TODAY);
    expect(drafts).toHaveLength(1);
    expect(drafts[0].type).toBe('fiscal_loss_incomplete');
    expect(drafts[0].data.investmentId).toBe('inv-1');
  });

  it('not_assessed con notificación fiscal_loss_incomplete ya existente → no se duplica', () => {
    const inv = makeInvestment({ id: 'inv-1' });
    const existing = [{ type: 'fiscal_loss_incomplete', data: { investmentId: 'inv-1' } }];
    expect(computeFiscalLossNotifications([inv], existing, TODAY)).toEqual([]);
  });

  it('pending_deadline con el plazo ya cumplido → fiscal_loss_ready', () => {
    const inv = makeInvestment({
      id: 'inv-1',
      lossAssessedAt: '2027-01-15T00:00:00.000Z',
      lossInsolvencyStatus: 'none',
      lossEnforcementStarted: true,
      lossEnforcementDate: '2025-01-10', // hace más de 1 año respecto a TODAY
      lossEnforcementInitiator: 'user',
    });
    const drafts = computeFiscalLossNotifications([inv], [], TODAY);
    expect(drafts).toHaveLength(1);
    expect(drafts[0].type).toBe('fiscal_loss_ready');
  });

  it('pending_deadline con el plazo aún sin cumplir → ninguna notificación', () => {
    const inv = makeInvestment({
      id: 'inv-1',
      lossAssessedAt: '2027-01-15T00:00:00.000Z',
      lossInsolvencyStatus: 'none',
      lossEnforcementStarted: true,
      lossEnforcementDate: '2026-08-01', // menos de 1 año respecto a TODAY
      lossEnforcementInitiator: 'user',
    });
    expect(computeFiscalLossNotifications([inv], [], TODAY)).toEqual([]);
  });

  it('not_yet con nextReviewDate cumplida → fiscal_loss_review', () => {
    const inv = makeInvestment({
      id: 'inv-1',
      lossAssessedAt: '2026-10-01T00:00:00.000Z', // hace más de 3 meses respecto a TODAY
      lossInsolvencyStatus: 'none',
      lossEnforcementStarted: false,
    });
    const drafts = computeFiscalLossNotifications([inv], [], TODAY);
    expect(drafts).toHaveLength(1);
    expect(drafts[0].type).toBe('fiscal_loss_review');
    expect(drafts[0].data.reviewDate).toBeTruthy();
  });

  it('not_yet con fiscal_loss_review ya existente para la MISMA reviewDate → no se duplica', () => {
    const inv = makeInvestment({
      id: 'inv-1',
      lossAssessedAt: '2026-10-01T00:00:00.000Z',
      lossInsolvencyStatus: 'none',
      lossEnforcementStarted: false,
    });
    const first = computeFiscalLossNotifications([inv], [], TODAY);
    const existing = [{ type: 'fiscal_loss_review', data: { investmentId: 'inv-1', reviewDate: first[0].data.reviewDate } }];
    expect(computeFiscalLossNotifications([inv], existing, TODAY)).toEqual([]);
  });

  it('not_yet con fiscal_loss_review existente pero de una reviewDate ANTERIOR → se genera una nueva (nuevo trimestre)', () => {
    const inv = makeInvestment({
      id: 'inv-1',
      lossAssessedAt: '2026-10-01T00:00:00.000Z',
      lossInsolvencyStatus: 'none',
      lossEnforcementStarted: false,
    });
    const existing = [{ type: 'fiscal_loss_review', data: { investmentId: 'inv-1', reviewDate: '2026-11-01' } }];
    const drafts = computeFiscalLossNotifications([inv], existing, TODAY);
    expect(drafts).toHaveLength(1);
    expect(drafts[0].type).toBe('fiscal_loss_review');
  });

  it('deductible (ya imputada del todo) → ninguna notificación', () => {
    const inv = makeInvestment({
      id: 'inv-1',
      lossAssessedAt: '2027-01-15T00:00:00.000Z',
      lossInsolvencyStatus: 'concluded_unpaid',
      lossInsolvencyConcludedDate: '2026-01-01',
    });
    expect(computeFiscalLossNotifications([inv], [], TODAY)).toEqual([]);
  });

  it('varias inversiones: cada una genera su propia notificación de forma independiente', () => {
    const invA = makeInvestment({ id: 'inv-a' }); // not_assessed
    const invB = makeInvestment({
      id: 'inv-b',
      lossAssessedAt: '2027-01-15T00:00:00.000Z',
      lossInsolvencyStatus: 'none',
      lossEnforcementStarted: true,
      lossEnforcementDate: '2025-01-10',
      lossEnforcementInitiator: 'platform',
    });
    const drafts = computeFiscalLossNotifications([invA, invB], [], TODAY);
    expect(drafts.map((d) => d.data.investmentId).sort()).toEqual(['inv-a', 'inv-b']);
  });
});
