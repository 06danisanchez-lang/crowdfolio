import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { RiskView } from './RiskView';
import type { Investment } from '@/types/investment';

afterEach(cleanup);

const inv = (o: Partial<Investment>): Investment => ({
  id: 'x', platform: 'urbanitae', projectName: 'Proyecto', amount: 1000,
  investmentDate: '2024-01-01', expectedEndDate: '2030-01-01', expectedReturn: 10,
  incomeModel: 'bullet', status: 'active', payments: [],
  createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z', ...o,
});

describe('RiskView', () => {
  it('sin problemas: «Todo en plazo»', () => {
    render(<RiskView investments={[inv({})]} lockedInvestments={[]} onOpenInvestment={() => {}} />);
    expect(screen.getAllByText('Todo en plazo').length).toBeGreaterThan(0);
  });

  it('lista las inversiones con problemas y abre la ficha', () => {
    const onOpen = vi.fn();
    render(
      <RiskView
        investments={[
          inv({ id: 'a', projectName: 'Residencial Sur', status: 'pending', expectedEndDate: '2025-01-01' }),
          inv({ id: 'b', projectName: 'Impago Norte', status: 'defaulted', amount: 5000, platform: 'wecity' }),
        ]}
        lockedInvestments={[inv({ id: 'c', status: 'pending', expectedEndDate: '2025-01-01', amount: 8000 })]}
        onOpenInvestment={onOpen}
      />,
    );
    expect(screen.getByText('Residencial Sur')).toBeTruthy();
    expect(screen.getByText('Impago Norte')).toBeTruthy();
    expect(screen.getByText(/1 inversión más/)).toBeTruthy();
    fireEvent.click(screen.getByText('Confirmar qué ha pasado'));
    expect(onOpen).toHaveBeenCalledWith('a');
  });
});
