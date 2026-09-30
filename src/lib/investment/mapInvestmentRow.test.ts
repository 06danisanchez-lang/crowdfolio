import { describe, it, expect } from 'vitest';
import { mapRawInvestmentRow, draftToInvestment, type RawInvestmentRow } from './mapInvestmentRow';
import { investmentToDefaultLossInput } from '@/lib/tax/investmentToDefaultLossInput';
import { assessDefaultLoss } from '@/lib/tax/defaultLoss';

// Fila real reportada en producción ("prueba"): income_model 'bullet', status
// 'defaulted', loss_assessed_at y loss_insolvency_status 'open' ya guardados
// (concurso abierto), pero DefaultLossStatusCard mostraba "not_assessed" en
// vez de "pending_insolvency". Bug: el segundo paso de mapeo (DraftInvestment
// → Investment en useInvestments.ts) omitía las 9 columnas loss_* — como son
// opcionales en el tipo Investment, tsc nunca lo marcó como error.
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
    first_payment_date: null,
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
    loss_insolvency_status: 'open',
    loss_insolvency_concluded_date: null,
    loss_quita_amount: null,
    loss_quita_date: null,
    loss_enforcement_started: false,
    loss_enforcement_date: null,
    loss_enforcement_initiator: null,
    loss_assessed_at: '2026-09-27T19:23:00.000Z',
    loss_rules_version: 1,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2026-09-27T19:23:00.000Z',
    user_id: 'user-1',
    ...overrides,
  };
}

describe('mapRawInvestmentRow → draftToInvestment (mapeo real de useInvestments.ts)', () => {
  it('conserva loss_assessed_at y loss_insolvency_status a través de las dos fases del mapeo', () => {
    const draft = mapRawInvestmentRow(makeRawRow(), []);
    expect(draft.lossAssessedAt).toBe('2026-09-27T19:23:00.000Z');
    expect(draft.lossInsolvencyStatus).toBe('open');

    const investment = draftToInvestment(draft);
    expect(investment.lossAssessedAt).toBe('2026-09-27T19:23:00.000Z');
    expect(investment.lossInsolvencyStatus).toBe('open');
  });

  it('conserva sourceUrl, defaultedAt y amountRecovered a través de las dos fases del mapeo', () => {
    const draft = mapRawInvestmentRow(
      makeRawRow({ source_url: 'https://example.com', amount_recovered: 2500 }),
      [],
    );
    const investment = draftToInvestment(draft);
    expect(investment.sourceUrl).toBe('https://example.com');
    expect(investment.defaultedAt).toBe('2026-01-01T00:00:00.000Z');
    expect(investment.amountRecovered).toBe(2500);
  });

  it('una fila real con concurso abierto produce el estado fiscal correcto en la ficha (pending_insolvency, no not_assessed)', () => {
    const draft = mapRawInvestmentRow(makeRawRow(), []);
    const investment = draftToInvestment(draft);

    const result = assessDefaultLoss(investmentToDefaultLossInput(investment), new Date('2026-09-27T12:00:00.000Z'));

    expect(result.status).toBe('pending_insolvency');
    expect(result.status).not.toBe('not_assessed');
  });

  it('sin el fix (loss_assessed_at perdido en el mapeo) el resultado sería not_assessed — control del propio test', () => {
    const draft = mapRawInvestmentRow(makeRawRow(), []);
    // Simula el bug: reconstruye el Investment tal y como lo hacía el código
    // roto, sin las columnas loss_*.
    const investmentSinLossFields = { ...draftToInvestment(draft), lossAssessedAt: undefined, lossInsolvencyStatus: undefined };

    const result = assessDefaultLoss(investmentToDefaultLossInput(investmentSinLossFields), new Date('2026-09-27T12:00:00.000Z'));

    expect(result.status).toBe('not_assessed');
  });
});
