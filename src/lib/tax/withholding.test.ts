import { describe, it, expect } from 'vitest';
import {
  getDefaultWithholding,
  getDefaultWithholdingRate,
  isWithholdingApplicable,
  validateWithholding,
  findIncomeWithoutWithholding,
} from './withholding';

describe('getDefaultWithholdingRate', () => {
  it('19 % en plataformas españolas', () => {
    expect(getDefaultWithholdingRate('urbanitae')).toBe(0.19);
    expect(getDefaultWithholdingRate('wecity')).toBe(0.19);
    expect(getDefaultWithholdingRate('housers')).toBe(0.19);
    expect(getDefaultWithholdingRate('brickstarter')).toBe(0.19);
  });
  it('0 en extranjeras y en "Otra" (no sabemos si es española)', () => {
    expect(getDefaultWithholdingRate('estateguru')).toBe(0);
    expect(getDefaultWithholdingRate('crowdcube')).toBe(0);
    expect(getDefaultWithholdingRate('other')).toBe(0);
    expect(getDefaultWithholdingRate(null)).toBe(0);
  });
});

describe('isWithholdingApplicable', () => {
  it('solo intereses y dividendos', () => {
    expect(isWithholdingApplicable('interest')).toBe(true);
    expect(isWithholdingApplicable('dividend')).toBe(true);
    expect(isWithholdingApplicable('principal')).toBe(false);
    expect(isWithholdingApplicable('capital_return')).toBe(false);
    expect(isWithholdingApplicable('capital_gain')).toBe(false);
  });
});

describe('getDefaultWithholding', () => {
  it('19 % del bruto, redondeado a céntimos', () => {
    expect(getDefaultWithholding(250, 'dividend', 'urbanitae')).toBe(47.5);
    expect(getDefaultWithholding(13.75, 'interest', 'wecity')).toBe(2.61);
  });
  it('0 para capital, plataformas extranjeras o importes no válidos', () => {
    expect(getDefaultWithholding(1000, 'principal', 'urbanitae')).toBe(0);
    expect(getDefaultWithholding(100, 'interest', 'estateguru')).toBe(0);
    expect(getDefaultWithholding(0, 'interest', 'urbanitae')).toBe(0);
    expect(getDefaultWithholding(NaN, 'interest', 'urbanitae')).toBe(0);
  });
});

describe('validateWithholding', () => {
  it('acepta de 0 al importe bruto', () => {
    expect(validateWithholding(0, 100)).toBeNull();
    expect(validateWithholding(19, 100)).toBeNull();
    expect(validateWithholding(100, 100)).toBeNull();
  });
  it('rechaza negativos y retenciones mayores que el bruto', () => {
    expect(validateWithholding(-1, 100)).not.toBeNull();
    expect(validateWithholding(101, 100)).not.toBeNull();
  });
});

describe('findIncomeWithoutWithholding', () => {
  const platforms = new Map<string, import('@/types/investment').Platform>([
    ['es', 'urbanitae'], ['ee', 'estateguru'], ['otra', 'other'],
  ]);
  it('cuenta solo intereses y dividendos de plataformas españolas sin retención', () => {
    const result = findIncomeWithoutWithholding([
      { investment_id: 'es', type: 'interest', amount: 100, withholding_applied: 0 },
      { investment_id: 'es', type: 'dividend', amount: 50.5, withholding_applied: null },
      { investment_id: 'es', type: 'interest', amount: 100, withholding_applied: 19 },
      { investment_id: 'es', type: 'principal', amount: 1000, withholding_applied: 0 },
      { investment_id: 'ee', type: 'interest', amount: 100, withholding_applied: 0 },
      { investment_id: 'otra', type: 'interest', amount: 100, withholding_applied: 0 },
    ], platforms);
    expect(result).toEqual({ count: 2, amount: 150.5, investmentIds: ['es'] });
  });
});
