import { describe, it, expect } from 'vitest';
import { getInvestmentCompletionStatus } from './completeness';

function baseInput(overrides: Partial<Parameters<typeof getInvestmentCompletionStatus>[0]> = {}) {
  return {
    platform: 'urbanitae',
    projectName: 'Proyecto de prueba',
    amount: 1000,
    investmentDate: '2026-09-23',
    expectedReturn: 10,
    expectedEndDate: '2026-09-25',
    incomeModel: 'amortizing',
    paymentFrequency: 'monthly',
    status: 'active',
    ...overrides,
  };
}

// Fase 7 — regresión de "Enforced schedule requirement" (2026-04-11): hasSchedule
// bloqueaba isTrackingReady para periodic_fixed/amortizing, aunque sea un valor
// DERIVADO (no un campo del formulario) que puede salir false legítimamente
// cuando el plazo es más corto que un periodo — eso dejaba la inversión
// atascada en borrador sin ningún campo que el usuario pudiera rellenar.
describe('getInvestmentCompletionStatus — hasSchedule no bloquea isTrackingReady', () => {
  it('amortizing con hasSchedule=false (plazo corto) → SIGUE siendo tracking-ready, pero no forecast-ready', () => {
    const status = getInvestmentCompletionStatus(baseInput({ incomeModel: 'amortizing', hasSchedule: false }));
    expect(status.isTrackingReady).toBe(true);
    expect(status.missingFields).toEqual([]);
    expect(status.isForecastReady).toBe(false);
  });

  it('periodic_fixed con hasSchedule=false (plazo corto) → SIGUE siendo tracking-ready, pero no forecast-ready', () => {
    const status = getInvestmentCompletionStatus(baseInput({ incomeModel: 'periodic_fixed', hasSchedule: false }));
    expect(status.isTrackingReady).toBe(true);
    expect(status.isForecastReady).toBe(false);
  });

  it('amortizing con hasSchedule=true → tracking-ready Y forecast-ready', () => {
    const status = getInvestmentCompletionStatus(baseInput({ incomeModel: 'amortizing', hasSchedule: true }));
    expect(status.isTrackingReady).toBe(true);
    expect(status.isForecastReady).toBe(true);
  });

  it('amortizing sin paymentFrequency → SIGUE bloqueando (es un dato real, no derivado)', () => {
    const status = getInvestmentCompletionStatus(baseInput({ incomeModel: 'amortizing', paymentFrequency: null, hasSchedule: true }));
    expect(status.isTrackingReady).toBe(false);
    expect(status.missingFields).toContain('investments.field.paymentFrequency');
    expect(status.missingFields).not.toContain('investments.field.schedule');
  });

  it('bullet nunca comprueba hasSchedule ni paymentFrequency', () => {
    const status = getInvestmentCompletionStatus(baseInput({ incomeModel: 'bullet', paymentFrequency: null, hasSchedule: false }));
    expect(status.isTrackingReady).toBe(true);
    expect(status.isForecastReady).toBe(true);
  });

  it('variable_or_unknown: tracking-ready pero nunca forecast-ready (mismo patrón ya existente, para comparar)', () => {
    const status = getInvestmentCompletionStatus(baseInput({ incomeModel: 'variable_or_unknown', paymentFrequency: null, hasSchedule: false }));
    expect(status.isTrackingReady).toBe(true);
    expect(status.isForecastReady).toBe(false);
  });

  it('caso real "pruebat5": amortizing, mensual, 2 días de plazo, sin calendario → ahora sí se puede guardar como activa', () => {
    const status = getInvestmentCompletionStatus({
      platform: 'urbanitae',
      projectName: 'pruebat5',
      amount: 1239,
      investmentDate: '2026-09-23',
      expectedReturn: 13,
      expectedEndDate: '2026-09-25',
      incomeModel: 'amortizing',
      paymentFrequency: 'monthly',
      hasSchedule: false, // como quedó guardada en la BD antes del fix
      status: 'active',
    });
    expect(status.isTrackingReady).toBe(true);
    expect(status.missingFields).toEqual([]);
  });
});
