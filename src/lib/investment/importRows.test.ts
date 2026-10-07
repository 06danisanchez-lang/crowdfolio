import { describe, it, expect } from 'vitest';
import { buildInvestmentFromRow } from './importRows';

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
  it('fechas sin desplazamiento y con el día primero', () => {
    const [inv, complete] = buildInvestmentFromRow(row());
    expect(inv.investmentDate).toBe('2024-02-01');
    expect(inv.expectedEndDate).toBe('2025-02-01');
    expect(complete).toBe(true);
  });

  it('YYYY-MM-DD no resta un día', () => {
    const [inv] = buildInvestmentFromRow(row({ investmentDate: '2024-01-01' }));
    expect(inv.investmentDate).toBe('2024-01-01');
  });

  it('importe en formato español: el punto es separador de miles', () => {
    expect(buildInvestmentFromRow(row())[0].amount).toBe(1500.5);
    expect(buildInvestmentFromRow(row({ amount: '1.500' }))[0].amount).toBe(1500);
    expect(buildInvestmentFromRow(row({ amount: '1500.5' }))[0].amount).toBe(1500.5);
    expect(buildInvestmentFromRow(row({ amount: '1500,125' }))[0].amount).toBe(1500.125);
  });

  it('fecha no reconocida → borrador, nunca una fecha inventada', () => {
    const [inv, complete] = buildInvestmentFromRow(row({ investmentDate: '31/02/2024' }));
    expect(complete).toBe(false);
    expect(inv.status).toBe('draft');
  });

  it('rentabilidad fuera de 0-100 % → borrador', () => {
    const [, complete] = buildInvestmentFromRow(row({ expectedReturn: '7.125' }));
    expect(complete).toBe(false);
  });
});
