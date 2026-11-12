import { describe, expect, it } from 'vitest';
import { duePaymentRows, type CandidateRow } from '../../../supabase/functions/_shared/digestPayments.ts';

const base: CandidateRow = {
  user_id: 'u1',
  email: 'u1@test.local',
  investment_id: 'inv1',
  project_name: 'Préstamo',
  platform: 'urbanitae',
  custom_platform_name: null,
  income_model: 'periodic_fixed',
  assumed_paid_until: null,
  schedule: [],
  payments: [],
};
const cuota = (expectedDate: string, extra: Record<string, unknown> = {}) =>
  ({ expectedDate, expectedAmount: 10, type: 'interest' as const, status: 'pending' as const, matchedPaymentId: null, ...extra });

describe('duePaymentRows (correo diario: cobros previstos sin registrar)', () => {
  const today = '2026-11-12';

  it('avisa de una cuota de los últimos 7 días sin cobro', () => {
    const rows = duePaymentRows([{ ...base, schedule: [cuota('2026-11-10')] }], today);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ kind: 'payment_due', event_date: '2026-11-10', dedupe_key: 'payment_due:inv1:2026-11-10' });
  });

  it('no avisa si el cobro está registrado aunque no esté enlazado (emparejamiento por importes, como la app)', () => {
    const rows = duePaymentRows([{
      ...base,
      schedule: [cuota('2026-11-10')],
      payments: [{ id: 'p1', date: '2026-11-11', amount: 8.1, type: 'interest' }], // neto tras el 19 %
    }], today);
    expect(rows).toHaveLength(0);
  });

  it('un cobro tardío cubre la cuota antigua, no la reciente', () => {
    const rows = duePaymentRows([{
      ...base,
      schedule: [cuota('2026-10-10'), cuota('2026-11-10')],
      payments: [{ id: 'p1', date: '2026-11-11', amount: 10, type: 'interest' }],
    }], today);
    expect(rows.map(r => r.event_date)).toEqual(['2026-11-10']);
  });

  it('no avisa de cuotas «cobradas, falta el detalle», omitidas, futuras ni de hace más de 7 días', () => {
    const rows = duePaymentRows([
      { ...base, investment_id: 'a', assumed_paid_until: '2026-11-30', schedule: [cuota('2026-11-10')] },
      { ...base, investment_id: 'b', schedule: [cuota('2026-11-10', { status: 'skipped' })] },
      { ...base, investment_id: 'c', schedule: [cuota('2026-11-13'), cuota('2026-11-04')] },
    ], today);
    expect(rows).toHaveLength(0);
  });

  it('no cuenta un cobro de capital como cobro de intereses', () => {
    const rows = duePaymentRows([{
      ...base,
      schedule: [cuota('2026-11-10')],
      payments: [{ id: 'p1', date: '2026-11-11', amount: 10, type: 'principal' }],
    }], today);
    expect(rows).toHaveLength(1);
  });
});
