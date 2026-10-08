import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { InvestmentForm } from './InvestmentForm';
import { LanguageProvider } from '@/contexts/LanguageContext';
import type { Investment } from '@/types/investment';

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null }) }));
const fetchExchangeRate = vi.fn();
vi.mock('@/lib/currency/exchangeRateClient', () => ({
  fetchExchangeRate: (...args: unknown[]) => fetchExchangeRate(...args),
}));

const gbpInvestment: Investment = {
  id: 'inv-gbp', platform: 'crowdcube', projectName: 'Préstamo UK', amount: 1150,
  investmentDate: '2026-01-15', expectedEndDate: '2027-01-15', expectedReturn: 8,
  incomeModel: 'bullet', status: 'active', payments: [],
  currency: 'GBP', originalAmount: 1000, exchangeRate: 1.15, exchangeRateDate: '2026-01-15', exchangeRateSource: 'ecb',
  createdAt: '2026-01-15T00:00:00Z', updatedAt: '2026-01-15T00:00:00Z',
};

async function openEdit(initialData: Investment, onSubmit = vi.fn()) {
  render(
    <LanguageProvider>
      <InvestmentForm initialData={initialData} onSubmit={onSubmit} trigger={<button>abrir</button>} />
    </LanguageProvider>,
  );
  fireEvent.click(screen.getByText('abrir'));
  await screen.findByPlaceholderText('Notas adicionales...');
  return onSubmit;
}

describe('InvestmentForm — inversión en otra divisa', () => {
  afterEach(() => { cleanup(); fetchExchangeRate.mockReset(); });

  it('muestra el importe en la divisa y no vuelve a pedir el tipo al abrir', async () => {
    await openEdit(gbpInvestment);
    expect((screen.getByLabelText(/importe invertido \(gbp\)/i) as HTMLInputElement).value).toBe('1.000,00');
    expect(screen.getByText(/1\.?150,00\s*€/)).toBeTruthy();
    expect(fetchExchangeRate).not.toHaveBeenCalled();
  });

  it('al cambiar el importe en libras guarda los euros recalculados y la conversión', async () => {
    const onSubmit = await openEdit(gbpInvestment);
    const input = screen.getByLabelText(/importe invertido \(gbp\)/i);
    fireEvent.change(input, { target: { value: '2.000' } });
    fireEvent.blur(input);
    fireEvent.click(screen.getByText('Guardar Cambios'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const payload = onSubmit.mock.calls[0][0];
    expect(payload).toMatchObject({
      amount: 2300, currency: 'GBP', originalAmount: 2000, exchangeRate: 1.15, exchangeRateSource: 'ecb',
    });
  });

  it('un tipo de cambio escrito a mano se guarda como manual', async () => {
    const onSubmit = await openEdit(gbpInvestment);
    const rate = screen.getByLabelText(/tipo de cambio/i);
    fireEvent.change(rate, { target: { value: '1,2' } });
    fireEvent.blur(rate);
    fireEvent.click(screen.getByText('Guardar Cambios'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ amount: 1200, exchangeRate: 1.2, exchangeRateSource: 'manual' });
  });

  it('una inversión en euros se sigue guardando en euros', async () => {
    const onSubmit = await openEdit({ ...gbpInvestment, platform: 'urbanitae', currency: 'EUR', originalAmount: undefined, exchangeRate: undefined, exchangeRateDate: undefined, exchangeRateSource: undefined, amount: 5000 });
    expect(screen.queryByLabelText(/importe invertido/i)).toBeNull();
    fireEvent.click(screen.getByText('Guardar Cambios'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ amount: 5000, currency: 'EUR' });
    expect(onSubmit.mock.calls[0][0].exchangeRate).toBeUndefined();
  });
});
