import { describe, it, expect } from 'vitest';
import { notificationDedupeKey } from './dedupeKey';

describe('notificationDedupeKey', () => {
  it('un aviso de cobro por inversión y fecha', () => {
    expect(notificationDedupeKey('payment_due', { investmentId: 'a', scheduleEntryDate: '2026-10-07', expectedAmount: 7.5 }))
      .toBe('payment_due:a:2026-10-07');
  });

  it('vencimientos y avisos fiscales: uno por inversión', () => {
    expect(notificationDedupeKey('maturity_overdue', { investmentId: 'a', maturityDate: '2026-01-01' })).toBe('maturity_overdue:a');
    expect(notificationDedupeKey('maturity_soon', { investmentId: 'a' })).toBe('maturity_soon:a');
    expect(notificationDedupeKey('fiscal_loss_incomplete', { investmentId: 'a' })).toBe('fiscal_loss_incomplete:a');
    expect(notificationDedupeKey('fiscal_loss_ready', { investmentId: 'a' })).toBe('fiscal_loss_ready:a');
  });

  it('revisión fiscal: una por inversión y fecha de revisión', () => {
    expect(notificationDedupeKey('fiscal_loss_review', { investmentId: 'a', reviewDate: '2026-12-01' }))
      .toBe('fiscal_loss_review:a:2026-12-01');
  });

  it('resumen semanal: uno por semana', () => {
    expect(notificationDedupeKey('weekly_summary', { weekKey: '2026-W41' })).toBe('weekly_summary:2026-W41');
  });

  it('sin datos suficientes o tipo desconocido no hay clave', () => {
    expect(notificationDedupeKey('payment_due', { investmentId: 'a' })).toBeNull();
    expect(notificationDedupeKey('new_opportunity', { investmentId: 'a' })).toBeNull();
    expect(notificationDedupeKey(null, null)).toBeNull();
  });
});
