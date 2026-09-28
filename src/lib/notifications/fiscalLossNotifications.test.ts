import { describe, it, expect } from 'vitest';
import { computeFiscalLossNotifications } from './fiscalLossNotifications';
import { mapRawInvestmentRow, draftToInvestment, type RawInvestmentRow } from '@/lib/investment/mapInvestmentRow';
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

  it('el plazo de 1 año se cumple DESPUÉS de rellenar el cuestionario → fiscal_loss_ready', () => {
    const inv = makeInvestment({
      id: 'inv-1',
      lossAssessedAt: '2026-06-01T00:00:00.000Z', // el cuestionario se rellenó cuando aún faltaba
      lossInsolvencyStatus: 'none',
      lossEnforcementStarted: true,
      lossEnforcementDate: '2025-08-01', // el año se cumple el 2026-08-01, POSTERIOR a loss_assessed_at
      lossEnforcementInitiator: 'user',
    });
    const drafts = computeFiscalLossNotifications([inv], [], TODAY);
    expect(drafts).toHaveLength(1);
    expect(drafts[0].type).toBe('fiscal_loss_ready');
  });

  it('el plazo de 1 año YA se había cumplido al rellenar el cuestionario → no avisa (no hay nada nuevo que declarar)', () => {
    const inv = makeInvestment({
      id: 'inv-1',
      lossAssessedAt: '2027-01-15T00:00:00.000Z', // se rellenó hoy mismo (TODAY)
      lossInsolvencyStatus: 'none',
      lossEnforcementStarted: true,
      lossEnforcementDate: '2025-01-10', // el año se cumplió el 2026-01-10, muy anterior a loss_assessed_at
      lossEnforcementInitiator: 'user',
    });
    expect(computeFiscalLossNotifications([inv], [], TODAY)).toEqual([]);
  });

  it('el plazo se cumple el MISMO día que loss_assessed_at (no estrictamente posterior) → no avisa', () => {
    const inv = makeInvestment({
      id: 'inv-1',
      lossAssessedAt: '2026-08-01T09:00:00.000Z',
      lossInsolvencyStatus: 'none',
      lossEnforcementStarted: true,
      lossEnforcementDate: '2025-08-01', // el año se cumple exactamente el mismo día
      lossEnforcementInitiator: 'user',
    });
    expect(computeFiscalLossNotifications([inv], [], TODAY)).toEqual([]);
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
      lossAssessedAt: '2026-06-01T00:00:00.000Z',
      lossInsolvencyStatus: 'none',
      lossEnforcementStarted: true,
      lossEnforcementDate: '2025-08-01', // el año se cumple el 2026-08-01, POSTERIOR a loss_assessed_at
      lossEnforcementInitiator: 'platform',
    });
    const drafts = computeFiscalLossNotifications([invA, invB], [], TODAY);
    expect(drafts.map((d) => d.data.investmentId).sort()).toEqual(['inv-a', 'inv-b']);
  });
});

// Fila cruda tal cual la devuelve `supabase.from('investments').select('*')`
// (el hotfix #15 corrigió que las columnas loss_* se perdían al mapear el
// resultado de la BD a Investment). Usada aquí para confirmar que las
// notificaciones fiscales funcionan de punta a punta con datos leídos de la
// BD por el mapeo REAL de la app, no con un Investment construido a mano.
function makeRawRow(overrides: Partial<RawInvestmentRow> = {}): RawInvestmentRow {
  return {
    id: 'inv-prueba',
    platform: 'urbanitae',
    custom_platform_name: null,
    project_name: 'prueba',
    amount: 10000,
    investment_date: '2024-01-01',
    expected_end_date: '2025-01-01',
    expected_return: 8,
    income_model: 'bullet',
    payment_frequency: null,
    principal_return_type: null,
    status: 'defaulted',
    notes: null,
    source_url: null,
    defaulted_at: '2026-01-01T00:00:00.000Z',
    amount_recovered: null,
    equity_type: null,
    actual_end_date: null,
    close_reason: null,
    was_extended: false,
    loss_insolvency_status: 'none',
    loss_insolvency_concluded_date: null,
    loss_quita_amount: null,
    loss_quita_date: null,
    loss_enforcement_started: true,
    loss_enforcement_date: '2025-08-01', // el año se cumple el 2026-08-01
    loss_enforcement_initiator: 'user',
    loss_assessed_at: '2026-06-01T00:00:00.000Z', // rellenado antes de que se cumpliera el año
    loss_rules_version: 1,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2026-06-01T00:00:00.000Z',
    user_id: 'user-1',
    ...overrides,
  };
}

describe('computeFiscalLossNotifications — con datos leídos de la BD (mapeo real)', () => {
  it('fiscal_loss_ready a partir de una fila real (mapRawInvestmentRow → draftToInvestment)', () => {
    const draft = mapRawInvestmentRow(makeRawRow(), []);
    const investment = draftToInvestment(draft);

    const drafts = computeFiscalLossNotifications([investment], [], TODAY);
    expect(drafts).toHaveLength(1);
    expect(drafts[0].type).toBe('fiscal_loss_ready');
    expect(drafts[0].data.investmentId).toBe('inv-prueba');
  });

  it('fiscal_loss_incomplete a partir de una fila real sin loss_assessed_at', () => {
    const draft = mapRawInvestmentRow(makeRawRow({ loss_assessed_at: null, loss_insolvency_status: null }), []);
    const investment = draftToInvestment(draft);

    const drafts = computeFiscalLossNotifications([investment], [], TODAY);
    expect(drafts).toHaveLength(1);
    expect(drafts[0].type).toBe('fiscal_loss_incomplete');
  });

  it('sin ninguna columna loss_* que avisar (concurso abierto reciente) → ninguna notificación', () => {
    const draft = mapRawInvestmentRow(
      makeRawRow({
        loss_insolvency_status: 'open',
        loss_enforcement_started: false,
        loss_enforcement_date: null,
        loss_enforcement_initiator: null,
        loss_assessed_at: '2027-01-10T00:00:00.000Z', // hace pocos días respecto a TODAY — sin revisión aún
      }),
      [],
    );
    const investment = draftToInvestment(draft);

    expect(computeFiscalLossNotifications([investment], [], TODAY)).toEqual([]);
  });
});
