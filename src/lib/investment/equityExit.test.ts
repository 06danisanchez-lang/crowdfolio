import { describe, it, expect } from 'vitest';
import { buildEquityExitPlan, getEquityExitTreatment, getEquityNetCapital } from './equityExit';
import type { Payment } from '@/types/investment';

const pay = (type: Payment['type'], amount: number, date = '2025-03-01'): Payment => ({ id: `${type}-${amount}`, type, amount, date });

describe('getEquityExitTreatment', () => {
  it('plusvalía y rentas cerradas por la plataforma: dividendo (RCM)', () => {
    expect(getEquityExitTreatment('plusvalia', 'on_time')).toBe('rcm_dividend');
    expect(getEquityExitTreatment('rentas', 'early')).toBe('rcm_dividend');
  });
  it('cuota de liquidación: ganancia patrimonial', () => {
    expect(getEquityExitTreatment('liquidacion', 'on_time')).toBe('gpp_manual');
  });
  it('venta en secundario: ganancia patrimonial, sea cual sea el tipo', () => {
    expect(getEquityExitTreatment('plusvalia', 'sold')).toBe('gpp_manual');
    expect(getEquityExitTreatment('rentas', 'sold')).toBe('gpp_manual');
  });
});

describe('getEquityNetCapital', () => {
  it('resta la prima de emisión devuelta', () => {
    expect(getEquityNetCapital({ amount: 1000, payments: [pay('capital_return', 50), pay('capital_return', 25.5), pay('dividend', 10)] })).toBe(924.5);
  });
});

describe('buildEquityExitPlan', () => {
  it('beneficio en plusvalía: principal + dividendo positivo', () => {
    const plan = buildEquityExitPlan({
      investment: { amount: 1000, payments: [], equityType: 'plusvalia' },
      amountReceived: 1150, date: '2026-05-10', closeReason: 'on_time',
    });
    expect(plan.result).toBe(150);
    expect(plan.treatment).toBe('rcm_dividend');
    expect(plan.payments).toEqual([
      expect.objectContaining({ type: 'principal', amount: 1000, date: '2026-05-10' }),
      expect.objectContaining({ type: 'dividend', amount: 150, date: '2026-05-10' }),
    ]);
  });

  it('pérdida: nunca registra un dividendo negativo', () => {
    const plan = buildEquityExitPlan({
      investment: { amount: 1000, payments: [], equityType: 'plusvalia' },
      amountReceived: 800, date: '2026-05-10', closeReason: 'on_time',
    });
    expect(plan.result).toBe(-200);
    expect(plan.treatment).toBe('gpp_manual');
    expect(plan.payments).toEqual([expect.objectContaining({ type: 'principal', amount: 800 })]);
    expect(plan.payments.some(p => p.amount < 0)).toBe(false);
  });

  it('liquidación con beneficio: capital_gain, no dividendo', () => {
    const plan = buildEquityExitPlan({
      investment: { amount: 1000, payments: [], equityType: 'liquidacion' },
      amountReceived: 1200, date: '2026-05-10', closeReason: 'on_time',
    });
    expect(plan.treatment).toBe('gpp_manual');
    expect(plan.payments.map(p => p.type)).toEqual(['principal', 'capital_gain']);
    expect(plan.payments.some(p => p.type === 'dividend')).toBe(false);
  });

  it('rentas: el capital pendiente descuenta la prima ya devuelta', () => {
    const plan = buildEquityExitPlan({
      investment: { amount: 1000, payments: [pay('capital_return', 100)], equityType: 'rentas' },
      amountReceived: 1000, date: '2026-05-10', closeReason: 'on_time',
    });
    expect(plan.netCapital).toBe(900);
    expect(plan.result).toBe(100);
    expect(plan.payments).toEqual([
      expect.objectContaining({ type: 'principal', amount: 900 }),
      expect.objectContaining({ type: 'dividend', amount: 100 }),
    ]);
  });

  it('pérdida total: sin pagos', () => {
    const plan = buildEquityExitPlan({
      investment: { amount: 500, payments: [], equityType: 'plusvalia' },
      amountReceived: 0, date: '2026-05-10',
    });
    expect(plan.result).toBe(-500);
    expect(plan.payments).toEqual([]);
  });

  it('sin beneficio ni pérdida', () => {
    const plan = buildEquityExitPlan({
      investment: { amount: 500, payments: [], equityType: 'plusvalia' },
      amountReceived: 500, date: '2026-05-10',
    });
    expect(plan.treatment).toBe('none');
    expect(plan.payments).toEqual([expect.objectContaining({ type: 'principal', amount: 500 })]);
  });

  it('redondea a céntimos (sin errores de coma flotante)', () => {
    const plan = buildEquityExitPlan({
      investment: { amount: 0.3, payments: [pay('capital_return', 0.1)], equityType: 'rentas' },
      amountReceived: 0.3, date: '2026-05-10',
    });
    expect(plan.netCapital).toBe(0.2);
    expect(plan.result).toBe(0.1);
  });

  it('rechaza importes negativos o no numéricos', () => {
    const base = { investment: { amount: 100, payments: [], equityType: 'plusvalia' as const }, date: '2026-01-01' };
    expect(() => buildEquityExitPlan({ ...base, amountReceived: -1 })).toThrow();
    expect(() => buildEquityExitPlan({ ...base, amountReceived: Number.NaN })).toThrow();
  });
});
