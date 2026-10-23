import { describe, it, expect } from 'vitest';
import { buildInvestmentFromRow, buildImportCandidates, fixUsDateColumns, matchPlatform, parseImportNumber } from './importRows';

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

describe('fixUsDateColumns', () => {
  it('columna mes/día → se le da la vuelta', () => {
    const rows = fixUsDateColumns([
      { rowNumber: 2, raw: { investmentDate: '01/25/2024' } },
      { rowNumber: 3, raw: { investmentDate: '03/02/2024' } },
    ]);
    expect(rows.map(r => r.raw.investmentDate)).toEqual(['25/01/2024', '02/03/2024']);
  });
  it('columna día/mes → se queda igual', () => {
    const rows = fixUsDateColumns([
      { rowNumber: 2, raw: { investmentDate: '25/01/2024' } },
      { rowNumber: 3, raw: { investmentDate: '03/02/2024' } },
    ]);
    expect(rows.map(r => r.raw.investmentDate)).toEqual(['25/01/2024', '03/02/2024']);
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
});
