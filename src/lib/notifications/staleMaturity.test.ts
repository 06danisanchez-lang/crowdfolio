import { describe, it, expect } from 'vitest';
import { dropStaleMaturitySoon, isStaleMaturitySoon } from './staleMaturity';

const today = new Date(2026, 10, 4); // 4 nov 2026

describe('isStaleMaturitySoon', () => {
  it('oculta «Vencimiento próximo» cuya fecha ya pasó', () => {
    expect(isStaleMaturitySoon({ type: 'maturity_soon', data: { maturityDate: '2026-09-25' } }, today)).toBe(true);
  });
  it('mantiene el aviso si vence hoy o más adelante', () => {
    expect(isStaleMaturitySoon({ type: 'maturity_soon', data: { maturityDate: '2026-11-04' } }, today)).toBe(false);
    expect(isStaleMaturitySoon({ type: 'maturity_soon', data: { maturityDate: '2026-11-09' } }, today)).toBe(false);
  });
  it('no toca otros tipos ni avisos sin fecha', () => {
    expect(isStaleMaturitySoon({ type: 'maturity_overdue', data: { maturityDate: '2026-09-25' } }, today)).toBe(false);
    expect(isStaleMaturitySoon({ type: 'maturity_soon', data: {} }, today)).toBe(false);
    expect(isStaleMaturitySoon({ type: 'maturity_soon', data: null }, today)).toBe(false);
  });
});

describe('dropStaleMaturitySoon', () => {
  it('deja el «¿Ha vencido…?» y quita el «Vencimiento próximo» desfasado', () => {
    const list = [
      { type: 'maturity_overdue', data: { maturityDate: '2026-09-25' } },
      { type: 'maturity_soon', data: { maturityDate: '2026-09-25' } },
    ];
    expect(dropStaleMaturitySoon(list, today).map(n => n.type)).toEqual(['maturity_overdue']);
  });
});
