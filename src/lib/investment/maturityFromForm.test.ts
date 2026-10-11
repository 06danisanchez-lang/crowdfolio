import { describe, it, expect } from 'vitest';
import { buildMaturityFromForm, deriveMaturityKind } from './maturityChange';

const prev = { expectedEndDate: '2026-01-01', originalEndDate: undefined, interestEndDate: undefined, wasExtended: false };

describe('buildMaturityFromForm — alta', () => {
  it('sin vencimiento prometido no guarda nada', () => {
    expect(buildMaturityFromForm(null, { expectedEndDate: '2026-01-01', kind: 'delayed' })).toEqual({});
  });
  it('prometido anterior al actual: retraso', () => {
    expect(buildMaturityFromForm(null, { expectedEndDate: '2026-10-01', promisedEndDate: '2026-01-01', kind: 'delayed' }))
      .toEqual({ originalEndDate: '2026-01-01', interestEndDate: '2026-01-01', wasExtended: false });
  });
  it('prometido anterior al actual: prórroga', () => {
    expect(buildMaturityFromForm(null, { expectedEndDate: '2026-10-01', promisedEndDate: '2026-01-01', kind: 'extended' }))
      .toEqual({ originalEndDate: '2026-01-01', interestEndDate: null, wasExtended: true });
  });
  it('prometido igual o posterior al actual: sin retraso', () => {
    expect(buildMaturityFromForm(null, { expectedEndDate: '2026-01-01', promisedEndDate: '2026-01-01', kind: 'delayed' })).toEqual({});
  });
});

describe('buildMaturityFromForm — edición', () => {
  it('mover la fecha hacia delante conserva la original (como «Prorrogar»)', () => {
    expect(buildMaturityFromForm(prev, { expectedEndDate: '2026-07-01', kind: 'delayed' }))
      .toEqual({ originalEndDate: '2026-01-01', interestEndDate: '2026-01-01' });
  });
  it('sin cambios no toca nada', () => {
    expect(buildMaturityFromForm(prev, { expectedEndDate: '2026-01-01', kind: 'delayed' })).toEqual({});
  });
  it('corregir el prometido lo guarda tal cual', () => {
    const moved = { ...prev, expectedEndDate: '2026-07-01', originalEndDate: '2026-01-01', interestEndDate: '2026-01-01' };
    expect(buildMaturityFromForm(moved, { expectedEndDate: '2026-07-01', promisedEndDate: '2025-12-01', kind: 'delayed' }))
      .toEqual({ originalEndDate: '2025-12-01', interestEndDate: '2025-12-01', wasExtended: false });
  });
  it('borrar el prometido quita el retraso', () => {
    const moved = { ...prev, expectedEndDate: '2026-07-01', originalEndDate: '2026-01-01', interestEndDate: '2026-01-01' };
    expect(buildMaturityFromForm(moved, { expectedEndDate: '2026-07-01', kind: 'delayed' }))
      .toEqual({ originalEndDate: null, interestEndDate: null, wasExtended: false });
  });
  it('cambiar retraso → prórroga', () => {
    const moved = { ...prev, expectedEndDate: '2026-07-01', originalEndDate: '2026-01-01', interestEndDate: '2026-01-01' };
    expect(deriveMaturityKind(moved)).toBe('delayed');
    expect(buildMaturityFromForm(moved, { expectedEndDate: '2026-07-01', promisedEndDate: '2026-01-01', kind: 'extended' }))
      .toEqual({ originalEndDate: '2026-01-01', interestEndDate: null, wasExtended: true });
  });
});
