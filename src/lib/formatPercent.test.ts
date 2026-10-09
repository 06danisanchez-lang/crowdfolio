import { describe, it, expect } from 'vitest';
import { formatPercent } from './formatPercent';

describe('formatPercent', () => {
  it('usa coma decimal y espacio antes del %', () => {
    expect(formatPercent(19)).toBe('19,0 %');
    expect(formatPercent(89.63)).toBe('89,6 %');
    expect(formatPercent(19, 0)).toBe('19 %');
  });
  it('no muestra -0', () => {
    expect(formatPercent(-0)).toBe('0,0 %');
  });
  it('mantiene el signo de los negativos', () => {
    expect(formatPercent(-2.5)).toBe('-2,5 %');
  });
});
