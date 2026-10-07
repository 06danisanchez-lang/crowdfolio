import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { TaxExpenseForm } from './TaxExpenseForm';

describe('TaxExpenseForm — importe en formato español', () => {
  afterEach(cleanup);

  async function submitWithAmount(amount: string) {
    const onSubmit = vi.fn().mockResolvedValue(true);
    render(<TaxExpenseForm year={2026} onSubmit={onSubmit} open onOpenChange={() => {}} triggerButton={false} />);
    fireEvent.change(screen.getByPlaceholderText(/comisión de gestión/i), { target: { value: 'Comisión' } });
    fireEvent.change(screen.getByPlaceholderText('0,00'), { target: { value: amount } });
    fireEvent.click(screen.getByRole('button', { name: /guardar/i }));
    return onSubmit;
  }

  it('"1.500" son mil quinientos euros, no 1,5', async () => {
    const onSubmit = await submitWithAmount('1.500');
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0].amount).toBe(1500);
  });

  it('"1.500,50" con decimales', async () => {
    const onSubmit = await submitWithAmount('1.500,50');
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0].amount).toBe(1500.5);
  });

  it('formato no válido no se guarda', async () => {
    const onSubmit = await submitWithAmount('1,500.50');
    expect(await screen.findByText(/importe no válido/i)).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
