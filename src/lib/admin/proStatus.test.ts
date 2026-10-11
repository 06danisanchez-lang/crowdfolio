import { describe, expect, it } from 'vitest';
import { getAdminProStatus, type SubscriptionRow } from './proStatus';

const now = new Date('2026-10-11T12:00:00Z');
const base: SubscriptionRow = { plan: 'free', status: 'free', current_period_end: null, is_beta_pro: false, pro_until: null };

describe('getAdminProStatus', () => {
  it('sin fila de suscripción: gratuito', () => {
    expect(getAdminProStatus(null, now)).toEqual({ isPro: false, kind: null, proEnd: null, expiredFreeProEnd: null });
  });

  it('Pro de prueba vigente: Pro gratis con su fecha de fin (antes salía como Free)', () => {
    const s = getAdminProStatus({ ...base, is_beta_pro: true, pro_until: '2026-11-04T19:12:00Z' }, now);
    expect(s).toMatchObject({ isPro: true, kind: 'free', proEnd: '2026-11-04T19:12:00Z' });
  });

  it('Pro de prueba caducado: gratuito, recordando cuándo terminó', () => {
    const s = getAdminProStatus({ ...base, is_beta_pro: true, pro_until: '2026-10-09T10:00:00Z' }, now);
    expect(s).toMatchObject({ isPro: false, kind: null, expiredFreeProEnd: '2026-10-09T10:00:00Z' });
  });

  it('suscripción activa con fecha futura: Pro de suscripción', () => {
    const s = getAdminProStatus({ ...base, plan: 'pro', status: 'active', current_period_end: '2027-06-02T00:00:00Z' }, now);
    expect(s).toMatchObject({ isPro: true, kind: 'subscription', proEnd: '2027-06-02T00:00:00Z' });
  });

  it('suscripción "active" pero ya vencida: no es Pro (la app tampoco la cuenta)', () => {
    const s = getAdminProStatus({ ...base, plan: 'yearly', status: 'active', current_period_end: '2026-01-01T00:00:00Z' }, now);
    expect(s.isPro).toBe(false);
  });

  it('las dos vigentes: manda la fecha más lejana', () => {
    const s = getAdminProStatus({
      plan: 'monthly', status: 'active', current_period_end: '2026-11-01T00:00:00Z',
      is_beta_pro: true, pro_until: '2027-08-27T00:00:00Z',
    }, now);
    expect(s).toMatchObject({ isPro: true, kind: 'free', proEnd: '2027-08-27T00:00:00Z' });
  });
});
