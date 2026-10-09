import { describe, it, expect } from 'vitest';
import {
  calculateAccruedReturn,
  calculateDelayAdjustedTAE,
  calculateInvestmentTotalReturn,
  getAccrualEndDate,
  getDelayDays,
  getEffectiveTAE,
  isDelayedWithoutExtraInterest,
} from './calculations';
import { buildMaturityChange } from './maturityChange';
import { generateSchedule, generateScheduleWithDelay } from './scheduleGenerator';
import type { Investment, Payment } from '@/types/investment';

// 10 % anual, 1.000 €, del 1/1/2025 al 1/1/2026 (12 meses)
const base: Investment = {
  id: 'inv',
  platform: 'urbanitae',
  projectName: 'Prueba',
  amount: 1000,
  investmentDate: '2025-01-01',
  expectedEndDate: '2026-01-01',
  expectedReturn: 10,
  incomeModel: 'bullet',
  status: 'active',
  payments: [],
} as Investment;

const at = (d: string) => new Date(`${d}T12:00:00`);

describe('buildMaturityChange', () => {
  it('retraso: guarda el vencimiento prometido y hasta cuándo genera intereses', () => {
    expect(buildMaturityChange(base, '2026-07-01', 'delayed')).toEqual({
      expectedEndDate: '2026-07-01',
      originalEndDate: '2026-01-01',
      interestEndDate: '2026-01-01',
    });
  });

  it('prórroga: guarda el vencimiento prometido y marca la etiqueta', () => {
    expect(buildMaturityChange(base, '2026-07-01', 'extended')).toEqual({
      expectedEndDate: '2026-07-01',
      originalEndDate: '2026-01-01',
      wasExtended: true,
    });
  });

  it('un segundo retraso no pisa la fecha prometida ni el fin de intereses', () => {
    const once = { ...base, ...buildMaturityChange(base, '2026-07-01', 'delayed') };
    expect(buildMaturityChange(once, '2026-12-01', 'delayed')).toEqual({ expectedEndDate: '2026-12-01' });
  });

  it('prórroga y después retraso: intereses hasta el final de la prórroga', () => {
    const extended = { ...base, ...buildMaturityChange(base, '2026-07-01', 'extended') };
    const delayed = { ...extended, ...buildMaturityChange(extended, '2027-01-01', 'delayed') };
    expect(getAccrualEndDate(delayed)).toBe('2026-07-01');
    expect(Math.round(calculateInvestmentTotalReturn(delayed))).toBe(149);
    expect(isDelayedWithoutExtraInterest(delayed)).toBe(true);
  });

  it('retraso y después prórroga oficial: vuelve a generar intereses hasta la nueva fecha', () => {
    const delayed = { ...base, ...buildMaturityChange(base, '2026-07-01', 'delayed') };
    const extended = { ...delayed, ...buildMaturityChange(delayed, '2027-01-01', 'extended') };
    expect(extended.interestEndDate).toBeNull();
    expect(getAccrualEndDate(extended)).toBe('2027-01-01');
  });

  it('adelantar la fecha es una corrección: solo cambia la fecha', () => {
    expect(buildMaturityChange(base, '2025-10-01', 'extended')).toEqual({ expectedEndDate: '2025-10-01' });
  });
});

describe('retraso sin intereses extra', () => {
  const delayed = { ...base, ...buildMaturityChange(base, '2026-07-01', 'delayed') };

  it('deja de generar rentabilidad en la fecha prometida', () => {
    expect(getAccrualEndDate(delayed)).toBe('2026-01-01');
    expect(isDelayedWithoutExtraInterest(delayed)).toBe(true);
    // el beneficio esperado sigue siendo el prometido (≈100 €), no 150 €
    expect(calculateInvestmentTotalReturn(delayed)).toBeCloseTo(100, 0);
    expect(calculateAccruedReturn(delayed, [], at('2026-04-01'))).toBeCloseTo(100, 0);
  });

  it('cuenta el retraso desde la fecha prometida aunque aún no haya llegado la nueva', () => {
    expect(getDelayDays(delayed, at('2026-02-01'))).toBe(181);
  });

  it('los días de retraso no dependen de la hora del día', () => {
    const pending = { ...base, status: 'pending' as const };
    expect(getDelayDays(pending, new Date('2026-01-10T08:00:00'))).toBe(9);
    expect(getDelayDays(pending, new Date('2026-01-10T23:30:00'))).toBe(9);
  });

  it('TAE ajustada: 10 % a 12 meses cobrado a los 18 → ≈6,7 %', () => {
    expect(calculateDelayAdjustedTAE(delayed, [], at('2026-02-01'))).toBeCloseTo(6.67, 1);
    expect(getEffectiveTAE(delayed, [], at('2026-02-01'))).toBeCloseTo(6.67, 1);
  });

  it('si se vuelve a pasar la fecha, la TAE sigue bajando', () => {
    // a 2 años del inicio sin cobrar: 10 % × 1/2
    expect(calculateDelayAdjustedTAE(delayed, [], at('2027-01-01'))).toBeCloseTo(5, 1);
  });

  it('si sigue pagando intereses durante el retraso, cuentan', () => {
    const interest = (date: string): Payment => ({ id: date, date, amount: 100, type: 'interest' });
    // 150 € cobrados a los 18 meses → 10 % anual
    const tae = calculateDelayAdjustedTAE(delayed, [interest('2026-01-01'), { ...interest('2026-06-30'), amount: 50 }], at('2026-07-01'));
    expect(tae).toBeCloseTo(10, 0);
  });
});

describe('prórroga', () => {
  const extended = { ...base, ...buildMaturityChange(base, '2026-07-01', 'extended') };

  it('sigue generando al mismo tipo hasta la nueva fecha', () => {
    expect(getAccrualEndDate(extended)).toBe('2026-07-01');
    expect(Math.round(calculateInvestmentTotalReturn(extended))).toBe(149);
    expect(getEffectiveTAE(extended, [], at('2026-02-01'))).toBe(10);
  });

  it('el retraso sobre lo prometido se sigue viendo', () => {
    expect(getDelayDays(extended, at('2026-02-01'))).toBe(181);
  });
});

describe('inversiones a tiempo y cerradas', () => {
  it('a tiempo: TAE prometida y sin retraso', () => {
    expect(getEffectiveTAE(base, [], at('2025-06-01'))).toBe(10);
    expect(getDelayDays(base, at('2025-06-01'))).toBe(0);
  });

  it('vencida sin cobrar ni mover la fecha: baja con los días, no cae a 0', () => {
    expect(getEffectiveTAE({ ...base, status: 'pending' }, [], at('2026-07-01'))).toBeCloseTo(6.67, 1);
  });

  it('cerrada tras un retraso: el retraso se mide contra la fecha prometida', () => {
    const closed = {
      ...base,
      ...buildMaturityChange(base, '2026-07-01', 'delayed'),
      status: 'completed' as const,
      actualEndDate: '2026-07-01',
    };
    expect(getDelayDays(closed)).toBe(181);
  });
});

describe('generateScheduleWithDelay', () => {
  const periodic = {
    id: 'inv',
    amount: 1000,
    expectedReturn: 12,
    incomeModel: 'periodic_fixed' as const,
    paymentFrequency: 'monthly' as const,
    principalReturnType: 'at_maturity' as const,
    investmentDate: '2025-01-01',
    expectedEndDate: '2025-07-01',
  };

  it('sin retraso es el calendario normal', () => {
    expect(generateScheduleWithDelay(periodic, '2025-07-01')).toEqual(generateSchedule(periodic));
  });

  it('con retraso: mismas cuotas, la última y el capital en la nueva fecha', () => {
    const delayedSchedule = generateScheduleWithDelay({ ...periodic, expectedEndDate: '2025-10-01' }, '2025-07-01');
    const normal = generateSchedule(periodic);
    expect(delayedSchedule).toHaveLength(normal.length);
    expect(delayedSchedule.reduce((s, e) => s + e.expectedAmount, 0)).toBeCloseTo(normal.reduce((s, e) => s + e.expectedAmount, 0), 2);
    expect(delayedSchedule.filter(e => e.expectedDate === '2025-10-01').map(e => e.type).sort()).toEqual(['interest', 'principal']);
    expect(delayedSchedule.some(e => e.expectedDate === '2025-07-01')).toBe(false);
  });
});
