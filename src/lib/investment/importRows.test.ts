import { describe, it, expect } from 'vitest';
import {
  buildInvestmentFromRow, buildImportCandidates, detectDateOrder, detectFractionReturns, matchPlatform, parseImportNumber,
  selectForImport,
} from './importRows';

const row = (overrides: Record<string, string> = {}) => ({
  platform: 'Urbanitae',
  projectName: 'Proyecto',
  amount: '1.500,50',
  investmentDate: '01/02/2024',
  expectedEndDate: '2025-02-01',
  expectedReturn: '9,5',
  incomeModel: 'bullet',
  ...overrides,
});

describe('buildInvestmentFromRow (importación CSV/XLSX)', () => {
  it('fila completa → activa, fechas sin desplazamiento y con el día primero', () => {
    const r = buildInvestmentFromRow(row());
    expect(r.investment.investmentDate).toBe('2024-02-01');
    expect(r.investment.expectedEndDate).toBe('2025-02-01');
    expect(r.complete).toBe(true);
    expect(r.investment.status).toBe('active');
    expect(r.missing).toEqual([]);
  });

  it('vencimiento prometido anterior al actual: llega como retraso', () => {
    const { investment } = buildInvestmentFromRow(row({ originalEndDate: '01/08/2024' }));
    expect(investment.originalEndDate).toBe('2024-08-01');
    expect(investment.interestEndDate).toBe('2024-08-01');
    expect(investment.wasExtended).toBe(false);
  });

  it('sin vencimiento prometido no marca retraso', () => {
    expect(buildInvestmentFromRow(row()).investment.originalEndDate).toBeUndefined();
  });

  it('importe en formato español: el punto es separador de miles', () => {
    expect(buildInvestmentFromRow(row()).investment.amount).toBe(1500.5);
    expect(buildInvestmentFromRow(row({ amount: '1.500' })).investment.amount).toBe(1500);
    expect(buildInvestmentFromRow(row({ amount: '1500.5' })).investment.amount).toBe(1500.5);
    expect(buildInvestmentFromRow(row({ amount: '1500,125' })).investment.amount).toBe(1500.125);
    expect(buildInvestmentFromRow(row({ amount: '1.500,00 €' })).investment.amount).toBe(1500);
  });

  it('lo que falta queda vacío, nunca con un valor inventado', () => {
    const r = buildInvestmentFromRow({ platform: 'Urbanitae', projectName: 'Solo nombre' });
    expect(r.complete).toBe(false);
    expect(r.investment.status).toBe('draft');
    expect(r.investment.amount).toBeNull();
    expect(r.investment.investmentDate).toBeNull();
    expect(r.investment.expectedReturn).toBeNull();
    expect(r.investment.incomeModel).toBeNull();
    expect(r.missing).toEqual(expect.arrayContaining([
      'investments.field.amount', 'investments.field.investmentDate', 'investments.field.expectedReturn',
      'investments.field.incomeModel', 'investments.field.expectedEndDate',
    ]));
    expect(r.missing).not.toContain('investments.field.platform');
  });

  it('fecha que no existe → vacía y aviso', () => {
    const r = buildInvestmentFromRow(row({ investmentDate: '31/02/2024' }));
    expect(r.complete).toBe(false);
    expect(r.investment.investmentDate).toBeNull();
    expect(r.warnings.length).toBeGreaterThan(0);
  });

  it('año con dos cifras = 20xx', () => {
    expect(buildInvestmentFromRow(row({ investmentDate: '01/02/24' })).investment.investmentDate).toBe('2024-02-01');
  });

  it('rentabilidad fuera de 0-100 % o entre 0 y 1 → vacía', () => {
    expect(buildInvestmentFromRow(row({ expectedReturn: '7.125' })).investment.expectedReturn).toBeNull();
    expect(buildInvestmentFromRow(row({ expectedReturn: '0,08' })).investment.expectedReturn).toBeNull();
    expect(buildInvestmentFromRow(row({ expectedReturn: '0' })).investment.expectedReturn).toBe(0);
    expect(buildInvestmentFromRow(row({ expectedReturn: '10,5 %' })).investment.expectedReturn).toBe(10.5);
  });

  it('tipos y frecuencias en español', () => {
    const r = buildInvestmentFromRow(row({ incomeModel: 'Amortización progresiva', paymentFrequency: 'Trimestral' }));
    expect(r.investment.incomeModel).toBe('amortizing');
    expect(r.investment.paymentFrequency).toBe('quarterly');
    expect(r.complete).toBe(true);
    expect(buildInvestmentFromRow(row({ incomeModel: 'Pago único al vencimiento' })).investment.incomeModel).toBe('bullet');
    const equity = buildInvestmentFromRow(row({ incomeModel: 'Equity' }));
    expect(equity.investment.incomeModel).toBe('equity');
    // El tipo de retorno equity no viene en el archivo: siempre lo elige el usuario.
    expect(equity.complete).toBe(false);
    expect(equity.missing).toEqual(['investments.field.equityType']);
    expect(buildInvestmentFromRow(row({ incomeModel: 'periodic_fixed', paymentFrequency: 'monthly' })).investment.incomeModel).toBe('periodic_fixed');
  });

  it('periódica sin frecuencia → falta la frecuencia', () => {
    const r = buildInvestmentFromRow(row({ incomeModel: 'Rendimiento periódico fijo' }));
    expect(r.missing).toEqual(['investments.field.paymentFrequency']);
  });

  it('tipo desconocido → vacío, no se supone', () => {
    const r = buildInvestmentFromRow(row({ incomeModel: 'Préstamo' }));
    expect(r.investment.incomeModel).toBeNull();
    expect(r.missing).toContain('investments.field.incomeModel');
  });

  it('plazo en meses → vencimiento, solo si no hay fecha de vencimiento', () => {
    expect(buildInvestmentFromRow(row({ expectedEndDate: '', termMonths: '18' })).investment.expectedEndDate).toBe('2025-08-01');
    expect(buildInvestmentFromRow(row({ termMonths: '18' })).investment.expectedEndDate).toBe('2025-02-01');
    expect(buildInvestmentFromRow(row({ expectedEndDate: '', termMonths: '18,5' })).investment.expectedEndDate).toBeUndefined();
  });

  it('vencimiento anterior a la inversión → vacío', () => {
    expect(buildInvestmentFromRow(row({ expectedEndDate: '01/01/2024' })).investment.expectedEndDate).toBeUndefined();
  });

  it('plataforma en libras o divisa distinta del euro → importe vacío y nota', () => {
    const gbp = buildInvestmentFromRow(row({ platform: 'Crowdcube' }));
    expect(gbp.investment.amount).toBeNull();
    expect(gbp.investment.notes).toContain('GBP');
    const usd = buildInvestmentFromRow(row({ currency: 'USD' }));
    expect(usd.investment.amount).toBeNull();
    expect(buildInvestmentFromRow(row({ currency: 'EUR' })).investment.amount).toBe(1500.5);
  });

  it('plataforma del archivo cuando la fila no la trae', () => {
    const r = buildInvestmentFromRow(row({ platform: '' }), { defaultPlatform: { platform: 'wecity' } });
    expect(r.investment.platform).toBe('wecity');
    const sin = buildInvestmentFromRow(row({ platform: '' }));
    expect(sin.missing).toContain('investments.field.platform');
  });
});

describe('matchPlatform', () => {
  it('reconoce el catálogo y deja las demás como «Otra» con su nombre', () => {
    expect(matchPlatform('URBANITAE')).toEqual({ platform: 'urbanitae' });
    expect(matchPlatform('Civislend')).toEqual({ platform: 'other', customPlatformName: 'Civislend' });
    expect(matchPlatform('')).toBeNull();
  });
});

describe('parseImportNumber', () => {
  it('formatos con símbolos', () => {
    expect(parseImportNumber('2.000 €')).toBe(2000);
    expect(parseImportNumber('EUR 250,5')).toBe(250.5);
    expect(parseImportNumber('1,500.50')).toBeNull(); // formato inglés: ambiguo
  });
});

describe('formato de fecha', () => {
  it('sugiere mes/día solo si alguna fecha solo existe así y ninguna al revés', () => {
    expect(detectDateOrder([
      { rowNumber: 2, raw: { investmentDate: '01/25/2024' } },
      { rowNumber: 3, raw: { investmentDate: '03/02/2024' } },
    ])).toEqual({ suggested: 'mdy', ambiguous: true });
    expect(detectDateOrder([
      { rowNumber: 2, raw: { investmentDate: '25/01/2024' } },
      { rowNumber: 3, raw: { investmentDate: '03/02/2024' } },
    ])).toEqual({ suggested: 'dmy', ambiguous: false });
    expect(detectDateOrder([
      { rowNumber: 2, raw: { investmentDate: '25/01/2024', expectedEndDate: '01/25/2025' } },
    ])).toEqual({ suggested: 'dmy', ambiguous: true });
  });

  it('mes/día solo se aplica si se elige', () => {
    expect(buildInvestmentFromRow(row({ investmentDate: '03/02/2024' })).investment.investmentDate).toBe('2024-02-03');
    expect(buildInvestmentFromRow(row({ investmentDate: '03/02/2024' }), { dateOrder: 'mdy' }).investment.investmentDate).toBe('2024-03-02');
    // Las celdas de fecha de Excel (ISO) no se giran nunca.
    expect(buildInvestmentFromRow(row({ investmentDate: '2024-03-02' }), { dateOrder: 'mdy' }).investment.investmentDate).toBe('2024-03-02');
  });
});

describe('valores dudosos', () => {
  const opts = { today: '2026-10-23' };
  it('fecha de inversión futura o absurda → vacía', () => {
    expect(buildInvestmentFromRow(row({ investmentDate: '01/02/2030' }), opts).investment.investmentDate).toBeNull();
    expect(buildInvestmentFromRow(row({ investmentDate: '31/12/1899' }), opts).investment.investmentDate).toBeNull();
  });
  it('importe 0, negativo o desorbitado → vacío', () => {
    expect(buildInvestmentFromRow(row({ amount: '0' })).investment.amount).toBeNull();
    expect(buildInvestmentFromRow(row({ amount: '-500' })).investment.amount).toBeNull();
    expect(buildInvestmentFromRow(row({ amount: '25.000.000' })).investment.amount).toBeNull();
  });
  it('lo que no se entiende va a las notas para tenerlo a mano', () => {
    const r = buildInvestmentFromRow(row({ incomeModel: 'Préstamo', amount: '1,500.00', notes: 'Mía' }));
    expect(r.investment.notes).toBe('Mía · Del archivo, sin leer: importe «1,500.00», tipo «Préstamo»');
  });
});

describe('rentabilidad en tanto por uno', () => {
  const rows = (...vals: string[]) => vals.map((v, i) => ({ rowNumber: i + 2, raw: { expectedReturn: v } }));
  it('solo si toda la columna está entre 0 y 0,30', () => {
    expect(detectFractionReturns(rows('0,09', '0,105', ''))).toBe(true);
    expect(detectFractionReturns(rows('0,09', '9,5'))).toBe(false);
    expect(detectFractionReturns(rows('9 %', '0,09'))).toBe(false);
    expect(detectFractionReturns(rows('0'))).toBe(false);
    expect(detectFractionReturns(rows('0,5'))).toBe(false);
  });
  it('0,09 → 9 %', () => {
    expect(buildInvestmentFromRow(row({ expectedReturn: '0,09' }), { returnsAsFraction: true }).investment.expectedReturn).toBe(9);
    expect(buildInvestmentFromRow(row({ expectedReturn: '0,105' }), { returnsAsFraction: true }).investment.expectedReturn).toBe(10.5);
  });
});

describe('datos para todo el archivo', () => {
  it('tipo y frecuencia elegidos se aplican a las filas que no los tienen', () => {
    const r = buildInvestmentFromRow(row({ incomeModel: '' }), { defaultIncomeModel: 'periodic_fixed', defaultFrequency: 'quarterly' });
    expect(r.investment.incomeModel).toBe('periodic_fixed');
    expect(r.investment.paymentFrequency).toBe('quarterly');
    expect(r.complete).toBe(true);
  });
  it('un tipo que no se entiende no se pisa con el del archivo', () => {
    const r = buildInvestmentFromRow(row({ incomeModel: 'Préstamo' }), { defaultIncomeModel: 'bullet' });
    expect(r.investment.incomeModel).toBeNull();
  });
  it('el valor de la fila manda sobre el del archivo', () => {
    const r = buildInvestmentFromRow(row({ incomeModel: 'Pago único' }), { defaultIncomeModel: 'equity' });
    expect(r.investment.incomeModel).toBe('bullet');
  });
  it('la frecuencia no se pone en las que no la usan', () => {
    const r = buildInvestmentFromRow(row(), { defaultFrequency: 'monthly' });
    expect(r.investment.paymentFrequency).toBeUndefined();
  });
});

describe('estado del archivo', () => {
  it('finalizada / impago', () => {
    expect(buildInvestmentFromRow(row({ status: 'Finalizado' })).finished).toBe(true);
    expect(buildInvestmentFromRow(row({ status: 'Devuelta' })).finished).toBe(true);
    expect(buildInvestmentFromRow(row({ status: 'En curso' })).finished).toBe(false);
    const impago = buildInvestmentFromRow(row({ status: 'Impago' }));
    expect(impago.finished).toBe(false);
    expect(impago.investment.status).toBe('active'); // el impago se registra en la ficha, con su cuestionario
    expect(impago.warnings.join()).toContain('impago');
  });
  it('vencida', () => {
    expect(buildInvestmentFromRow(row(), { today: '2026-10-23' }).pastDue).toBe(true);
    expect(buildInvestmentFromRow(row({ expectedEndDate: '01/01/2030' }), { today: '2026-10-23' }).pastDue).toBe(false);
  });
});

describe('buildImportCandidates', () => {
  it('marca repetidas y descarta filas sin nombre', () => {
    const { candidates, withoutName } = buildImportCandidates(
      [
        { rowNumber: 2, raw: row() },
        { rowNumber: 3, raw: row({ projectName: 'Otro' }) },
        { rowNumber: 4, raw: row({ projectName: '' }) },
      ],
      [{ platform: 'urbanitae', projectName: 'proyecto', amount: 1500.5, investmentDate: '2024-02-01' }],
    );
    expect(candidates.map(c => c.duplicate)).toEqual([true, false]);
    expect(withoutName).toEqual([4]);
  });

  it('segundo ticket en el mismo proyecto (otro importe o fecha) no es repetida', () => {
    const existing = [{ platform: 'urbanitae', projectName: 'Proyecto', amount: 1000, investmentDate: '2024-02-01' }];
    expect(buildImportCandidates([{ rowNumber: 2, raw: row() }], existing).candidates[0].duplicate).toBe(false);
  });

  it('volver a subir el archivo no duplica los borradores de la vez anterior', () => {
    const existing = [{ platform: 'urbanitae', projectName: 'Proyecto', amount: null, investmentDate: null }];
    expect(buildImportCandidates([{ rowNumber: 2, raw: row() }], existing).candidates[0].duplicate).toBe(true);
  });

  it('reutiliza cómo escribe el usuario una plataforma «Otra»', () => {
    const existing = [{ platform: 'other', customPlatformName: 'Civislend', projectName: 'X', amount: 1, investmentDate: '2024-01-01' }];
    const { candidates } = buildImportCandidates([{ rowNumber: 2, raw: row({ platform: 'CIVISLEND' }) }], existing);
    expect(candidates[0].investment.customPlatformName).toBe('Civislend');
  });

  it('se salta la fila de ejemplo de la plantilla', () => {
    const { candidates } = buildImportCandidates([{ rowNumber: 2, raw: row({ projectName: 'EJEMPLO · Residencial Ruzafa' }) }], []);
    expect(candidates).toEqual([]);
  });
});

describe('selectForImport', () => {
  const base = buildImportCandidates([
    { rowNumber: 2, raw: row({ projectName: 'A', expectedEndDate: '01/01/2030' }) },
    { rowNumber: 3, raw: row({ projectName: 'B', status: 'Finalizada' }) },
    { rowNumber: 4, raw: row({ projectName: 'C' }) }, // vencida
    { rowNumber: 5, raw: row({ projectName: 'D', expectedEndDate: '01/01/2030' }) },
  ], [{ platform: 'urbanitae', projectName: 'D', amount: 1500.5, investmentDate: '2024-02-01' }], { today: '2026-10-23' }).candidates;

  it('por defecto: fuera repetidas y finalizadas; dentro las vencidas', () => {
    const s = selectForImport(base, { includeDuplicates: false, includeFinished: false, includePastDue: true, slots: Infinity });
    expect(s.accepted.map(c => c.investment.projectName)).toEqual(['A', 'C']);
    expect([s.duplicates, s.finished, s.pastDue]).toEqual([1, 1, 1]);
  });
  it('casillas y límite del plan', () => {
    const s = selectForImport(base, { includeDuplicates: true, includeFinished: true, includePastDue: false, slots: 2 });
    expect(s.accepted.map(c => c.investment.projectName)).toEqual(['A', 'B']);
    expect(s.overLimit).toBe(1);
  });
});
