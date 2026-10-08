import { describe, it, expect } from 'vitest';
import { paymentFromDueNotification, hasMatchingPayment } from './paymentFromDueNotification';

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

describe('hasMatchingPayment', () => {
  const payments = [{ date: '2026-09-29', type: 'interest', amount: 7.5 }];
  it('detecta el mismo cobro ya registrado', () => {
    expect(hasMatchingPayment(payments, { date: '2026-09-29', type: 'interest', amount: 7.5 })).toBe(true);
  });
  it('otra fecha, otro tipo u otro importe no cuentan como el mismo cobro', () => {
    expect(hasMatchingPayment(payments, { date: '2026-10-29', type: 'interest', amount: 7.5 })).toBe(false);
    expect(hasMatchingPayment(payments, { date: '2026-09-29', type: 'principal', amount: 7.5 })).toBe(false);
    expect(hasMatchingPayment(payments, { date: '2026-09-29', type: 'interest', amount: 8 })).toBe(false);
  });
});
