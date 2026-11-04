import { describe, expect, it } from 'vitest';
import { calculateProgressiveTax, calculateEffectiveRate, getMarginalRate, getTaxBreakdown } from './calculations';
import { getSavingsBrackets } from '@/types/tax';

describe('calculateProgressiveTax · tramos del ahorro', () => {
  it('base nula o negativa no paga', () => {
    expect(calculateProgressiveTax(0, 2025)).toBe(0);
    expect(calculateProgressiveTax(-500, 2025)).toBe(0);
  });

  it('primer tramo al 19 %', () => {
    expect(calculateProgressiveTax(1000, 2025)).toBe(190);
    expect(calculateProgressiveTax(6000, 2025)).toBe(1140);
  });

  it('cambios de tramo en 6.000, 50.000 y 200.000 (todos los años)', () => {
    for (const year of [2022, 2024, 2025]) {
      expect(calculateProgressiveTax(6001, year)).toBe(1140.21);
      expect(calculateProgressiveTax(50000, year)).toBe(1140 + 44000 * 0.21); // 10.380
      expect(calculateProgressiveTax(200000, year)).toBe(10380 + 150000 * 0.23); // 44.880
    }
  });

  it('2025 (Ley 7/2024): 27 % hasta 300.000 y 30 % por encima', () => {
    expect(calculateProgressiveTax(300000, 2025)).toBe(44880 + 100000 * 0.27); // 71.880
    expect(calculateProgressiveTax(400000, 2025)).toBe(71880 + 100000 * 0.30); // 101.880
  });

  it('2023 y 2024: 28 % por encima de 300.000', () => {
    expect(calculateProgressiveTax(400000, 2024)).toBe(71880 + 100000 * 0.28); // 99.880
    expect(calculateProgressiveTax(400000, 2023)).toBe(99880);
  });

  it('2021 y 2022: 26 % por encima de 200.000', () => {
    expect(calculateProgressiveTax(400000, 2022)).toBe(44880 + 200000 * 0.26); // 96.880
    expect(calculateProgressiveTax(400000, 2021)).toBe(96880);
  });

  it('sin año usa la escala vigente', () => {
    expect(calculateProgressiveTax(400000)).toBe(calculateProgressiveTax(400000, 2025));
    expect(calculateProgressiveTax(400000, 2030)).toBe(calculateProgressiveTax(400000, 2025));
  });

  it('redondea a céntimos', () => {
    expect(calculateProgressiveTax(123.456, 2025)).toBe(23.46);
  });
});

describe('getTaxBreakdown', () => {
  it('reparte la base por tramos y la suma coincide con la cuota', () => {
    const base = 260000;
    const rows = getTaxBreakdown(base, 2025);
    expect(rows.map(r => r.bracket.rate)).toEqual([0.19, 0.21, 0.23, 0.27]);
    expect(rows.reduce((s, r) => s + r.amount, 0)).toBe(base);
    expect(Math.round(rows.reduce((s, r) => s + r.tax, 0) * 100) / 100).toBe(calculateProgressiveTax(base, 2025));
  });

  it('usa la escala del año pedido', () => {
    expect(getTaxBreakdown(400000, 2022).at(-1)?.bracket.rate).toBe(0.26);
    expect(getTaxBreakdown(400000, 2024).at(-1)?.bracket.rate).toBe(0.28);
  });
});

describe('getMarginalRate y calculateEffectiveRate', () => {
  it('tipo marginal según el tramo', () => {
    expect(getMarginalRate(5000, 2025)).toBe(0.19);
    expect(getMarginalRate(60000, 2025)).toBe(0.23);
    expect(getMarginalRate(500000, 2024)).toBe(0.28);
  });

  it('tipo efectivo en porcentaje con dos decimales', () => {
    expect(calculateEffectiveRate(0, 0)).toBe(0);
    expect(calculateEffectiveRate(10000, calculateProgressiveTax(10000, 2025))).toBe(19.8); // 1.980 € sobre 10.000
  });
});

describe('getSavingsBrackets', () => {
  it('las escalas son continuas y acaban en infinito', () => {
    for (const year of [2021, 2023, 2025]) {
      const b = getSavingsBrackets(year);
      expect(b[0].min).toBe(0);
      for (let i = 1; i < b.length; i++) expect(b[i].min).toBe(b[i - 1].max);
      expect(b.at(-1)?.max).toBe(Infinity);
    }
  });
});
