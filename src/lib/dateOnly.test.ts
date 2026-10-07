import { describe, it, expect, vi, afterEach } from 'vitest';
import { toDateOnlyString, fromDateOnlyString } from './dateOnly';

// Estos tests corren con TZ=Europe/Madrid (vitest.config.ts) — la zona real
// con offset positivo (CET +1 invierno, CEST +2 verano) que provoca el fallo
// de toISOString() sobre medianoche local.

describe('toDateOnlyString', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('1 de enero (cambio de ejercicio, invierno) — sin desplazamiento', () => {
    const d = new Date(2024, 0, 1); // medianoche LOCAL
    expect(toDateOnlyString(d)).toBe('2024-01-01');
    // La forma antigua (toISOString().split('T')[0]) SÍ se desplazaba:
    expect(d.toISOString().split('T')[0]).toBe('2023-12-31');
  });

  it('31 de diciembre (cambio de ejercicio, invierno) — sin desplazamiento', () => {
    const d = new Date(2024, 11, 31);
    expect(toDateOnlyString(d)).toBe('2024-12-31');
    expect(d.toISOString().split('T')[0]).toBe('2024-12-30');
  });

  it('29 de febrero (bisiesto, invierno) — sin desplazamiento', () => {
    const d = new Date(2024, 1, 29);
    expect(toDateOnlyString(d)).toBe('2024-02-29');
    expect(d.toISOString().split('T')[0]).toBe('2024-02-28');
  });

  it('día de invierno (CET, +1) — sin desplazamiento', () => {
    const d = new Date(2024, 0, 15);
    expect(toDateOnlyString(d)).toBe('2024-01-15');
    expect(d.toISOString().split('T')[0]).toBe('2024-01-14');
  });

  it('día de verano (CEST, +2) — sin desplazamiento', () => {
    const d = new Date(2024, 6, 15);
    expect(toDateOnlyString(d)).toBe('2024-07-15');
    // La forma antigua se desplazaba igual en verano, con el mismo offset de un día
    expect(d.toISOString().split('T')[0]).toBe('2024-07-14');
  });

  it('"hoy" calculado a las 00:30 hora de Madrid — da el día de Madrid, no el de UTC', () => {
    // 2024-01-15 00:30 CET (+1) = 2024-01-14T23:30:00.000Z
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-14T23:30:00.000Z'));
    const now = new Date();
    expect(toDateOnlyString(now)).toBe('2024-01-15');
    // La forma antigua daría el día de UTC (14), no el de Madrid (15):
    expect(now.toISOString().split('T')[0]).toBe('2024-01-14');
  });

  it('"hoy" en verano a las 00:30 hora de Madrid (CEST, +2)', () => {
    // 2024-07-15 00:30 CEST (+2) = 2024-07-14T22:30:00.000Z
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-07-14T22:30:00.000Z'));
    const now = new Date();
    expect(toDateOnlyString(now)).toBe('2024-07-15');
    expect(now.toISOString().split('T')[0]).toBe('2024-07-14');
  });
});

describe('fromDateOnlyString', () => {
  it('devuelve la medianoche local del día, ida y vuelta sin perder días', () => {
    for (const s of ['2024-01-01', '2024-03-31', '2024-07-01', '2024-10-27', '2024-12-31']) {
      const d = fromDateOnlyString(s);
      expect(d.getHours()).toBe(0);
      expect(toDateOnlyString(d)).toBe(s);
    }
  });
});
