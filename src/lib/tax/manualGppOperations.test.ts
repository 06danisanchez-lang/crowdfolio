import { describe, it, expect } from 'vitest';
import { computeManualGppOperations } from './manualGppOperations';
import type { Investment, Payment } from '@/types/investment';

const pay = (type: Payment['type'], amount: number, date: string): Payment => ({ id: `${type}-${amount}-${date}`, type, amount, date });

const equity = (overrides: Partial<Investment>): Investment => ({
  id: 'inv-1',
  platform: 'urbanitae',
  projectName: 'Proyecto',
  amount: 1000,
  investmentDate: '2023-02-01',
  expectedEndDate: '2026-02-01',
  expectedReturn: 10,
  incomeModel: 'equity',
  equityType: 'plusvalia',
  status: 'completed',
  actualEndDate: '2026-05-10',
  closeReason: 'on_time',
  payments: [],
  createdAt: '2023-02-01T00:00:00Z',
  updatedAt: '2026-05-10T00:00:00Z',
  ...overrides,
});

const label = () => 'Urbanitae';

describe('computeManualGppOperations', () => {
  it('plusvalía con beneficio repartido como dividendo: no se lista (ya es RCM)', () => {
    const inv = equity({ payments: [pay('principal', 1000, '2026-05-10'), pay('dividend', 150, '2026-05-10')] });
    expect(computeManualGppOperations([inv], 2026, label)).toEqual([]);
  });

  it('plusvalía con pérdida: se lista como pérdida', () => {
    const inv = equity({ payments: [pay('principal', 800, '2026-05-10')] });
    const [row] = computeManualGppOperations([inv], 2026, label);
    expect(row).toMatchObject({ reason: 'loss', acquisitionValue: 1000, transmissionValue: 800, result: -200 });
  });

  it('liquidación con ganancia: se lista con valor de transmisión = capital + ganancia', () => {
    const inv = equity({ equityType: 'liquidacion', payments: [pay('principal', 1000, '2026-05-10'), pay('capital_gain', 200, '2026-05-10')] });
    const [row] = computeManualGppOperations([inv], 2026, label);
    expect(row).toMatchObject({ reason: 'liquidation', transmissionValue: 1200, result: 200, acquisitionDate: '2023-02-01', transmissionDate: '2026-05-10' });
  });

  it('venta: motivo "sale"', () => {
    const inv = equity({ closeReason: 'sold', payments: [pay('principal', 1000, '2026-05-10'), pay('capital_gain', 50, '2026-05-10')] });
    expect(computeManualGppOperations([inv], 2026, label)[0].reason).toBe('sale');
  });

  it('rentas: el valor de adquisición descuenta la prima de emisión de años anteriores', () => {
    const inv = equity({
      equityType: 'liquidacion',
      payments: [pay('capital_return', 100, '2024-06-01'), pay('principal', 900, '2026-05-10'), pay('capital_gain', 60, '2026-05-10')],
    });
    expect(computeManualGppOperations([inv], 2026, label)[0]).toMatchObject({ acquisitionValue: 900, transmissionValue: 960, result: 60 });
  });

  it('solo el ejercicio de cierre', () => {
    const inv = equity({ payments: [pay('principal', 800, '2026-05-10')] });
    expect(computeManualGppOperations([inv], 2025, label)).toEqual([]);
  });

  it('ignora préstamos, inversiones abiertas y cierres sin fecha', () => {
    const loan = equity({ incomeModel: 'bullet', payments: [pay('principal', 800, '2026-05-10')] });
    const open = equity({ status: 'active', payments: [pay('principal', 800, '2026-05-10')] });
    const noDate = equity({ actualEndDate: null, payments: [pay('principal', 800, '2026-05-10')] });
    expect(computeManualGppOperations([loan, open, noDate], 2026, label)).toEqual([]);
  });
});
