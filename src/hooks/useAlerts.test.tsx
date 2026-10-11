import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAlerts } from './useAlerts';
import type { Investment } from '@/types/investment';

const daysFromToday = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

const inv = (id: string, status: Investment['status'], endInDays: number) => ({
  id, status, projectName: id, platform: 'urbanitae', amount: 1000,
  expectedEndDate: daysFromToday(endInDays), incomeModel: 'bullet', payments: [],
}) as unknown as Investment;

describe('useAlerts', () => {
  it('avisa de una inversión vencida pendiente de cerrar', () => {
    const { result } = renderHook(() => useAlerts([inv('vencida', 'pending', -20)], {}));
    const overdue = result.current.alerts.filter(a => a.type === 'overdue');
    expect(overdue).toHaveLength(1);
    expect(overdue[0].title).toBe('Vencida, pendiente de cerrar');
  });

  it('cuenta el retraso desde la fecha prometida, no desde la última', () => {
    const moved = { ...inv('movida', 'pending', -20), originalEndDate: daysFromToday(-200) } as Investment;
    const { result } = renderHook(() => useAlerts([moved], {}));
    expect(result.current.alerts[0].message).toBe('Lleva 7 meses de retraso: confirma si te han devuelto el capital');
  });

  it('no avisa de las cerradas', () => {
    const { result } = renderHook(() => useAlerts([inv('cerrada', 'completed', -20)], {}));
    expect(result.current.alerts).toHaveLength(0);
  });

  it('sigue avisando de los vencimientos próximos de las activas', () => {
    const { result } = renderHook(() => useAlerts([inv('activa', 'active', 10)], {}));
    expect(result.current.alerts.map(a => a.type)).toEqual(['maturity']);
  });
});
