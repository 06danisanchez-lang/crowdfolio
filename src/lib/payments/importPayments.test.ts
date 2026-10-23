import { describe, it, expect } from 'vitest';
import { guessMapping, gridToRows } from '@/lib/investment/importSheet';
import {
  classifyConcept, nameKey, PAYMENT_IMPORT_FIELDS, PaymentLine, readPaymentLines, resolvePayments, ResolveOptions,
  suggestMatches, TargetInvestment,
} from './importPayments';

const sheet = (grid: string[][]) => gridToRows(grid, 0, guessMapping(grid[0], PAYMENT_IMPORT_FIELDS));

const inv = (o: Partial<TargetInvestment> = {}): TargetInvestment => ({
  id: 'i1', platform: 'urbanitae', projectName: 'Ático Ruzafa', investmentDate: '2024-01-15',
  incomeModel: 'periodic_fixed', status: 'active', currency: 'EUR', payments: [], ...o,
});

const opts = (o: Partial<ResolveOptions> = {}): ResolveOptions => ({
  targets: [inv()],
  investmentFor: { [nameKey({ platform: 'urbanitae' }, 'Ático Ruzafa')]: 'i1' },
  typeOverrides: {},
  defaultType: null,
  withholdingKnown: false,
  amountsAre: null,
  noWithholdingMode: null,
  today: '2026-10-23',
  ...o,
});

const line = (o: Partial<PaymentLine> = {}): PaymentLine => ({
  rowNumber: 2, sourceName: 'Ático Ruzafa', platform: { platform: 'urbanitae' }, date: '2025-04-15', amount: 100,
  type: 'interest', concept: 'Intereses', mixed: false, withholding: null, warnings: [], ...o,
});

describe('columnas', () => {
  it('extracto de movimientos', () => {
    expect(guessMapping(['Fecha valor', 'Proyecto', 'Concepto', 'Importe', 'Retención IRPF', 'Saldo'], PAYMENT_IMPORT_FIELDS))
      .toEqual(['date', 'projectName', 'concept', 'amount', 'withholding', null]);
  });
  it('control propio en formato ancho', () => {
    expect(guessMapping(['Fecha de cobro', 'Proyecto', 'Intereses', 'Capital devuelto', 'Retención'], PAYMENT_IMPORT_FIELDS))
      .toEqual(['date', 'projectName', 'interestAmount', 'principalAmount', 'withholding']);
  });
  it('no confunde capital pendiente ni tipo de interés', () => {
    expect(guessMapping(['Capital pendiente', 'Tipo de interés', 'Fecha de inversión'], PAYMENT_IMPORT_FIELDS))
      .toEqual([null, null, null]);
  });
});

describe('classifyConcept', () => {
  it('tipos claros', () => {
    expect(classifyConcept('Pago de intereses')).toBe('interest');
    expect(classifyConcept('Intereses de demora')).toBe('interest');
    expect(classifyConcept('Devolución de capital')).toBe('principal');
    expect(classifyConcept('Amortización')).toBe('principal');
    expect(classifyConcept('Devolución de la inversión')).toBe('principal');
    expect(classifyConcept('Dividendo')).toBe('dividend');
    expect(classifyConcept('Devolución de prima de emisión')).toBe('capital_return');
    expect(classifyConcept('Retención IRPF')).toBe('withholding');
  });
  it('lo que no es un cobro', () => {
    expect(classifyConcept('Inversión en proyecto')).toBe('ignore');
    expect(classifyConcept('Ingreso de fondos')).toBe('ignore');
    expect(classifyConcept('Retirada a cuenta bancaria')).toBe('ignore');
    expect(classifyConcept('Ampliación de capital')).toBe('ignore');
    expect(classifyConcept('Comisión de gestión')).toBe('ignore');
  });
  it('dudoso o mezclado → no se adivina', () => {
    expect(classifyConcept('Liquidación')).toBeNull();
    expect(classifyConcept('Pago proyecto Ruzafa')).toBeNull();
    expect(classifyConcept('Rentas')).toBeNull();
    expect(classifyConcept('Cuota mensual')).toBe('mixed');
    expect(classifyConcept('Devolución de capital e intereses')).toBe('mixed');
  });
});

describe('readPaymentLines', () => {
  it('extracto: ignora aportaciones y negativos, asocia la retención en línea aparte', () => {
    const r = readPaymentLines(sheet([
      ['Fecha', 'Proyecto', 'Concepto', 'Importe'],
      ['15/04/2025', 'Ático Ruzafa', 'Intereses', '100,00'],
      ['15/04/2025', 'Ático Ruzafa', 'Retención IRPF', '-19,00'],
      ['10/01/2025', 'Ático Ruzafa', 'Inversión', '-1.500,00'],
      ['01/02/2025', '', 'Ingreso de fondos', '2.000,00'],
      ['15/07/2027', 'Ático Ruzafa', 'Devolución de capital', '1.500,00'],
    ]), { defaultPlatform: { platform: 'urbanitae' } });
    expect(r.withholdingKnown).toBe(true);
    expect(r.ignoredRows).toEqual([4, 5]);
    expect(r.lines.map(l => [l.type, l.amount, l.withholding])).toEqual([['interest', 100, 19], ['principal', 1500, 0]]);
    expect(r.orphanWithholdingRows).toEqual([]);
  });

  it('retención que no se puede asociar a un único cobro', () => {
    const r = readPaymentLines(sheet([
      ['Fecha', 'Proyecto', 'Concepto', 'Importe'],
      ['15/04/2025', 'Ático Ruzafa', 'Intereses', '50'],
      ['15/04/2025', 'Ático Ruzafa', 'Intereses', '50'],
      ['15/04/2025', 'Ático Ruzafa', 'Retención', '19'],
    ]));
    expect(r.orphanWithholdingRows).toEqual([4]);
  });

  it('formato ancho: una fila da intereses y capital por separado', () => {
    const r = readPaymentLines(sheet([
      ['Fecha de cobro', 'Proyecto', 'Intereses', 'Capital devuelto', 'Retención'],
      ['15/04/2025', 'Ático Ruzafa', '100', '500', '19'],
    ]));
    expect(r.lines.map(l => [l.type, l.amount, l.withholding])).toEqual([['interest', 100, 19], ['principal', 500, 0]]);
  });

  it('sin columna de retención: la retención queda desconocida', () => {
    const r = readPaymentLines(sheet([['Fecha', 'Proyecto', 'Concepto', 'Importe'], ['15/04/2025', 'X', 'Intereses', '81']]));
    expect(r.withholdingKnown).toBe(false);
    expect(r.lines[0].withholding).toBeNull();
  });
});

describe('suggestMatches', () => {
  const targets = [
    inv(),
    inv({ id: 'i2', projectName: 'Residencial Campanar Fase 2', platform: 'wecity' }),
    inv({ id: 'i3', projectName: 'Nave', platform: 'wecity' }),
    inv({ id: 'i4', projectName: 'Nave', platform: 'wecity' }),
  ];
  it('mismo nombre, parecido único, y nada si hay dos tickets con el mismo nombre', () => {
    const m = suggestMatches([
      line({ sourceName: 'ÁTICO RUZAFA' }),
      line({ sourceName: 'Residencial Campanar', platform: { platform: 'wecity' } }),
      line({ sourceName: 'Nave', platform: { platform: 'wecity' } }),
    ], targets);
    expect(m[nameKey({ platform: 'urbanitae' }, 'ÁTICO RUZAFA')]).toEqual({ id: 'i1', quality: 'exact' });
    expect(m[nameKey({ platform: 'wecity' }, 'Residencial Campanar')]).toEqual({ id: 'i2', quality: 'similar' });
    expect(m[nameKey({ platform: 'wecity' }, 'Nave')]).toBeUndefined();
  });
});

describe('resolvePayments: retención', () => {
  it('el archivo trae la retención: hay que decir si los importes son brutos o netos', () => {
    const l = [line({ withholding: 19 })];
    expect(resolvePayments(l, opts({ withholdingKnown: true }))[0].status).toBe('needsWithholding');
    const gross = resolvePayments(l, opts({ withholdingKnown: true, amountsAre: 'gross' }))[0];
    expect([gross.gross, gross.withholding]).toEqual([100, 19]);
    const net = resolvePayments([line({ amount: 81, withholding: 19 })], opts({ withholdingKnown: true, amountsAre: 'net' }))[0];
    expect([net.gross, net.withholding]).toEqual([100, 19]);
  });

  it('sin retención en el archivo: solo con confirmación, 19 % y nota para cotejar', () => {
    expect(resolvePayments([line()], opts())[0].status).toBe('needsWithholding');
    const g = resolvePayments([line()], opts({ noWithholdingMode: 'gross19' }))[0];
    expect([g.gross, g.withholding]).toEqual([100, 19]);
    expect(g.notes).toContain('cotéjala con el certificado');
    const n = resolvePayments([line({ amount: 81 })], opts({ noWithholdingMode: 'net19' }))[0];
    expect([n.gross, n.withholding]).toEqual([100, 19]);
    const none = resolvePayments([line()], opts({ noWithholdingMode: 'none' }))[0];
    expect([none.gross, none.withholding, none.notes]).toEqual([100, 0, undefined]);
  });

  it('plataforma extranjera: sin retención española aunque se elija el 19 %', () => {
    const o = opts({
      targets: [inv({ platform: 'estateguru' })], noWithholdingMode: 'gross19',
      investmentFor: { [nameKey({ platform: 'estateguru' }, 'Ático Ruzafa')]: 'i1' },
    });
    const r = resolvePayments([line({ platform: { platform: 'estateguru' } })], o)[0];
    expect([r.gross, r.withholding]).toEqual([100, 0]);
  });

  it('el capital devuelto nunca lleva retención ni necesita la pregunta', () => {
    const r = resolvePayments([line({ type: 'principal', amount: 1500, withholding: 5 })], opts({ withholdingKnown: true }))[0];
    expect([r.status, r.gross, r.withholding]).toEqual(['ready', 1500, 0]);
  });
});

describe('resolvePayments: comprobaciones', () => {
  it('tipo sin clasificar: lo elige el usuario (a mano o para todo el archivo)', () => {
    expect(resolvePayments([line({ type: null })], opts({ noWithholdingMode: 'none' }))[0].status).toBe('needsType');
    expect(resolvePayments([line({ type: null })], opts({ noWithholdingMode: 'none', defaultType: 'interest' }))[0].type).toBe('interest');
    expect(resolvePayments([line({ type: null })], opts({ noWithholdingMode: 'none', typeOverrides: { 0: 'principal' } }))[0].type).toBe('principal');
  });
  it('cuota mixta: el tipo del archivo no se aplica, hay que elegirlo', () => {
    expect(resolvePayments([line({ type: null, mixed: true })], opts({ defaultType: 'interest' }))[0].status).toBe('needsType');
  });
  it('equity: «intereses» no vale, hay que elegir dividendo o prima', () => {
    const r = resolvePayments([line()], opts({ targets: [inv({ incomeModel: 'equity' })], noWithholdingMode: 'none' }))[0];
    expect(r.status).toBe('needsType');
  });
  it('sin inversión, impago, divisa, fechas imposibles', () => {
    expect(resolvePayments([line({ sourceName: 'Otro' })], opts())[0].status).toBe('needsInvestment');
    expect(resolvePayments([line()], opts({ targets: [inv({ status: 'defaulted' })] }))[0].status).toBe('blocked');
    expect(resolvePayments([line()], opts({ targets: [inv({ currency: 'GBP' })] }))[0].status).toBe('blocked');
    expect(resolvePayments([line({ date: '2027-01-01' })], opts())[0].status).toBe('blocked');
    expect(resolvePayments([line({ date: '2023-01-01' })], opts())[0].status).toBe('blocked');
  });
  it('repetido: mismo día, tipo e importe (bruto o el del archivo)', () => {
    const targets = [inv({ payments: [{ date: '2025-04-15', amount: 100, type: 'interest' }] })];
    expect(resolvePayments([line()], opts({ targets, noWithholdingMode: 'none' }))[0].status).toBe('duplicate');
    const net = resolvePayments([line({ amount: 81 })], opts({ targets, noWithholdingMode: 'net19' }))[0];
    expect(net.status).toBe('duplicate');
  });
  it('no importar', () => {
    expect(resolvePayments([line()], opts({ typeOverrides: { 0: 'skip' } }))[0].status).toBe('skipped');
  });
});
