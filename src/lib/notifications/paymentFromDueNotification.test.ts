import { describe, it, expect } from 'vitest';
import { paymentFromDueNotification } from './paymentFromDueNotification';

describe('paymentFromDueNotification', () => {
  it('guarda la fecha del calendario tal cual, sin pasar por UTC', () => {
    expect(paymentFromDueNotification({ investmentId: 'a', scheduleEntryDate: '2026-03-01', expectedAmount: 12.5 })).toEqual({
      investmentId: 'a',
      payment: { date: '2026-03-01', amount: 12.5, type: 'interest' },
    });
  });

  it('no registra la renta de un equity (sin importe y no es interés)', () => {
    expect(paymentFromDueNotification({ investmentId: 'a', scheduleEntryDate: '2026-03-01', expectedAmount: 0, isEquityRent: true })).toBeNull();
  });

  it('no registra con datos incompletos o mal formados', () => {
    expect(paymentFromDueNotification(null)).toBeNull();
    expect(paymentFromDueNotification({ investmentId: 'a', scheduleEntryDate: '2026-03-01T00:00:00Z', expectedAmount: 10 })).toBeNull();
    expect(paymentFromDueNotification({ investmentId: 'a', scheduleEntryDate: '2026-03-01', expectedAmount: 0 })).toBeNull();
    expect(paymentFromDueNotification({ scheduleEntryDate: '2026-03-01', expectedAmount: 10 })).toBeNull();
  });
});
