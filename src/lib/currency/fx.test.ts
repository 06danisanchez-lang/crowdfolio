import { describe, it, expect } from 'vitest';
import {
  convertToEur, foreignAmountToEur, buildForeignPaymentFields, withForeignFields,
  isMissingForeignData, foreignWithholdingEur, computeExchangeDifferences,
  summarizeForeignIncome, getPlatformDefaultCurrency, isForeignCurrency,
  formatExchangeRate, formatForeignAmount,
} from './fx';
import type { Investment } from '@/types/investment';

describe('convertToEur', () => {
  it('multiplica por euros por unidad y redondea a céntimos', () => {
    expect(convertToEur(1000, 1.15321)).toBe(1153.21);
    expect(convertToEur(7.5, 1.1)).toBe(8.25);
  });
  it('no acepta un tipo de cambio 0, negativo o no numérico', () => {
    expect(() => convertToEur(100, 0)).toThrow();
    expect(() => convertToEur(100, -1)).toThrow();
    expect(() => convertToEur(100, NaN)).toThrow();
  });
});

describe('divisa por defecto de la plataforma', () => {
  it('Crowdcube en libras, el resto en euros', () => {
    expect(getPlatformDefaultCurrency('crowdcube')).toBe('GBP');
    expect(getPlatformDefaultCurrency('urbanitae')).toBe('EUR');
    expect(getPlatformDefaultCurrency('estateguru')).toBe('EUR');
    expect(getPlatformDefaultCurrency('other')).toBe('EUR');
    expect(getPlatformDefaultCurrency(undefined)).toBe('EUR');
  });
  it('EUR y vacío no son divisa extranjera', () => {
    expect(isForeignCurrency('EUR')).toBe(false);
    expect(isForeignCurrency(undefined)).toBe(false);
    expect(isForeignCurrency('GBP')).toBe(true);
  });
});

describe('importes en otra divisa', () => {
  it('sin importe o sin tipo no hay euros', () => {
    expect(foreignAmountToEur({ originalAmount: 100, exchangeRate: null, exchangeRateDate: null, exchangeRateSource: null })).toBeNull();
    expect(foreignAmountToEur({ originalAmount: null, exchangeRate: 1.1, exchangeRateDate: null, exchangeRateSource: null })).toBeNull();
  });

  it('un cobro guarda los euros en amount y el rastro de la conversión', () => {
    const fields = buildForeignPaymentFields('GBP', {
      originalAmount: 25, exchangeRate: 1.16, exchangeRateDate: '2026-10-02', exchangeRateSource: 'ecb',
    }, '2026-10-04');
    expect(fields).toEqual({
      amount: 29, amountEur: 29, originalAmount: 25, originalCurrency: 'GBP',
      exchangeRate: 1.16, exchangeRateDate: '2026-10-02', exchangeRateSource: 'ecb',
    });
  });

  it('el cierre de un equity reparte capital y beneficio con el mismo tipo', () => {
    const out = withForeignFields([{ amount: 1150, type: 'principal' }, { amount: 230, type: 'dividend' }], 'GBP', 1.15, '2026-10-01', 'ecb');
    expect(out.map(p => [p.type, p.amount, p.originalAmount])).toEqual([['principal', 1150, 1000], ['dividend', 230, 200]]);
    expect(out.every(p => p.originalCurrency === 'GBP' && p.exchangeRate === 1.15)).toBe(true);
  });

  it('detecta cobros de inversiones en otra divisa sin tipo de cambio', () => {
    expect(isMissingForeignData('GBP', {})).toBe(true);
    expect(isMissingForeignData('GBP', { originalAmount: 10, exchangeRate: 1.1 })).toBe(false);
    expect(isMissingForeignData('EUR', {})).toBe(false);
  });
});

describe('retención en origen', () => {
  it('en la divisa del cobro se pasa a euros con su tipo de cambio', () => {
    expect(foreignWithholdingEur({ foreignWithholdingAmount: 5, foreignWithholdingCurrency: 'GBP', exchangeRate: 1.2 })).toBe(6);
  });
  it('en euros (p. ej. una plataforma estonia) se suma tal cual', () => {
    expect(foreignWithholdingEur({ foreignWithholdingAmount: 3.5, foreignWithholdingCurrency: 'EUR' })).toBe(3.5);
    expect(foreignWithholdingEur({ foreignWithholdingAmount: 3.5 })).toBe(3.5);
  });
  it('sin retención, 0', () => {
    expect(foreignWithholdingEur({})).toBe(0);
  });
});

const loan = (overrides: Partial<Investment>): Investment => ({
  id: 'inv-gbp', platform: 'other', projectName: 'Préstamo UK', amount: 1150, investmentDate: '2025-01-10',
  expectedReturn: 8, incomeModel: 'bullet', status: 'completed', payments: [],
  currency: 'GBP', originalAmount: 1000, exchangeRate: 1.15,
  createdAt: '2025-01-10T00:00:00Z', updatedAt: '2025-01-10T00:00:00Z',
  ...overrides,
});

describe('diferencias de cambio al recuperar capital', () => {
  it('1.000 GBP prestadas a 1,15 y devueltas a 1,10 son 50 € de pérdida', () => {
    const inv = loan({
      payments: [
        { id: 'p1', date: '2026-03-01', type: 'interest', amount: 88, originalAmount: 80, exchangeRate: 1.1 },
        { id: 'p2', date: '2026-03-01', type: 'principal', amount: 1100, originalAmount: 1000, exchangeRate: 1.1 },
      ],
    });
    const rows = computeExchangeDifferences([inv], 2026);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ acquisitionValue: 1150, transmissionValue: 1100, result: -50, currency: 'GBP' });
  });

  it('amortizaciones parciales: cada devolución con su tipo', () => {
    const inv = loan({
      payments: [
        { id: 'a', date: '2026-02-01', type: 'principal', amount: 600, originalAmount: 500, exchangeRate: 1.2 },
        { id: 'b', date: '2026-08-01', type: 'principal', amount: 575, originalAmount: 500, exchangeRate: 1.15 },
      ],
    });
    expect(computeExchangeDifferences([inv], 2026).map(r => r.result)).toEqual([25]);
  });

  it('solo el ejercicio pedido, ni equity ni inversiones en euros', () => {
    const p = [{ id: 'x', date: '2025-12-01', type: 'principal' as const, amount: 1100, originalAmount: 1000, exchangeRate: 1.1 }];
    expect(computeExchangeDifferences([loan({ payments: p })], 2026)).toEqual([]);
    const p26 = [{ ...p[0], date: '2026-12-01' }];
    expect(computeExchangeDifferences([loan({ payments: p26, incomeModel: 'equity' })], 2026)).toEqual([]);
    expect(computeExchangeDifferences([loan({ payments: p26, currency: 'EUR' })], 2026)).toEqual([]);
  });
});

describe('resumen de rentas en otra divisa', () => {
  it('suma intereses en euros, retención en origen y cobros sin tipo', () => {
    const payments = [
      { type: 'interest' as const, amount: 11, originalAmount: 10, exchangeRate: 1.1, foreignWithholdingAmount: 2, foreignWithholdingCurrency: 'GBP', inv: 'gbp' },
      { type: 'principal' as const, amount: 1100, originalAmount: 1000, exchangeRate: 1.1, inv: 'gbp' },
      { type: 'interest' as const, amount: 20, inv: 'gbp' },
      { type: 'interest' as const, amount: 50, foreignWithholdingAmount: 5, foreignWithholdingCurrency: 'EUR', inv: 'eur' },
    ];
    const s = summarizeForeignIncome(payments, p => (p as unknown as { inv: string }).inv === 'gbp' ? 'GBP' : 'EUR');
    expect(s).toEqual({ foreignCurrencyIncomeEur: 31, foreignWithholdingEur: 7.2, paymentsMissingFx: 1 });
  });
});

describe('formatos', () => {
  it('importe en divisa con miles y dos decimales', () => {
    expect(formatForeignAmount(1000, 'GBP')).toBe('1.000,00 GBP');
  });
  it('tipo de cambio con 4 a 6 decimales', () => {
    expect(formatExchangeRate(1.15, 'GBP')).toBe('1 GBP = 1,1500 €');
    expect(formatExchangeRate(1.153217, 'GBP')).toBe('1 GBP = 1,153217 €');
  });
});
