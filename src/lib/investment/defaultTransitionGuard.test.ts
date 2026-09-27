import { describe, it, expect } from 'vitest';
import { isBlockedDefaultedTransition } from './defaultTransitionGuard';

describe('isBlockedDefaultedTransition', () => {
  it('transición a defaulted sin loss_assessed_at → rechazada', () => {
    expect(isBlockedDefaultedTransition('active', { status: 'defaulted' })).toBe(true);
  });

  it('transición a defaulted con loss_assessed_at → aceptada', () => {
    expect(
      isBlockedDefaultedTransition('active', {
        status: 'defaulted',
        lossAssessedAt: '2026-09-24T10:00:00.000Z',
      }),
    ).toBe(false);
  });

  it('edición de una inversión ya en impago, sin loss_assessed_at en el payload → aceptada', () => {
    expect(isBlockedDefaultedTransition('defaulted', { status: 'defaulted', notes: 'nota' })).toBe(false);
  });

  it('edición de una inversión ya en impago que no reenvía status → aceptada', () => {
    expect(isBlockedDefaultedTransition('defaulted', { notes: 'nota' })).toBe(false);
  });

  it('actualización que no toca status → aceptada (la guarda no aplica)', () => {
    expect(isBlockedDefaultedTransition('active', { notes: 'nota' })).toBe(false);
  });

  it('transición a un estado distinto de defaulted → aceptada', () => {
    expect(isBlockedDefaultedTransition('active', { status: 'completed' })).toBe(false);
  });

  it('currentStatus desconocido (undefined) y transición a defaulted sin loss_assessed_at → rechazada', () => {
    expect(isBlockedDefaultedTransition(undefined, { status: 'defaulted' })).toBe(true);
  });
});
