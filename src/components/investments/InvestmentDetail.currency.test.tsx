import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { InvestmentDetail } from './InvestmentDetail';
import { LanguageProvider } from '@/contexts/LanguageContext';
import type { Investment } from '@/types/investment';

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null }) }));
const fetchExchangeRate = vi.fn();
vi.mock('@/lib/currency/exchangeRateClient', () => ({
  fetchExchangeRate: (...args: unknown[]) => fetchExchangeRate(...args),
}));

const gbpLoan: Investment = {
  id: 'inv-gbp', platform: 'crowdcube', projectName: 'Préstamo UK', amount: 1150,
  investmentDate: '2026-01-15', expectedEndDate: '2027-01-15', expectedReturn: 8,
  incomeModel: 'bullet', status: 'active', payments: [],
  currency: 'GBP', originalAmount: 1000, exchangeRate: 1.15, exchangeRateDate: '2026-01-15', exchangeRateSource: 'ecb',
  createdAt: '2026-01-15T00:00:00Z', updatedAt: '2026-01-15T00:00:00Z',
};

function renderDetail(investment: Investment) {
  const onAddPayment = vi.fn();
  render(
    <LanguageProvider>
      <InvestmentDetail
        investment={investment}
        onClose={() => {}}
        onUpdate={async () => ({ demotedToDraft: false })}
        onDelete={() => {}}
        onAddPayment={onAddPayment}
        onDeletePayment={() => {}}
      />
    </LanguageProvider>,
  );
  return onAddPayment;
}

describe('InvestmentDetail — cobros de una inversión en otra divisa', () => {
  afterEach(() => { cleanup(); fetchExchangeRate.mockReset(); });

  it('propone el tipo del BCE del día y guarda los euros con la conversión y la retención en origen', async () => {
    fetchExchangeRate.mockResolvedValue({ ok: true, data: { currency: 'GBP', requestedDate: 'x', rateDate: '2026-10-07', fellBack: false, rate: 1.2, inverseRate: 0.8333, source: 'ECB' } });
    const onAddPayment = renderDetail(gbpLoan);
    expect(screen.getByText(/1\.000,00 GBP/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /añadir pago/i }));
    await waitFor(() => expect(fetchExchangeRate).toHaveBeenCalledWith('GBP', expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/)));
    await waitFor(() => expect((screen.getByLabelText(/tipo de cambio/i) as HTMLInputElement).value).toBe('1,20'));

    const amount = screen.getByLabelText(/importe cobrado \(gbp\)/i);
    fireEvent.change(amount, { target: { value: '25' } });
    fireEvent.blur(amount);
    // Crowdcube no es española: sin retención española propuesta, con campo de retención en origen
    expect((screen.getByLabelText(/retención practicada/i) as HTMLInputElement).value).toBe('');
    fireEvent.change(screen.getByLabelText(/retención en origen/i), { target: { value: '5' } });

    fireEvent.click(screen.getByRole('button', { name: /^añadir$/i }));
    expect(onAddPayment).toHaveBeenCalledTimes(1);
    const [, payment] = onAddPayment.mock.calls[0];
    expect(payment).toMatchObject({
      amount: 30, amountEur: 30, originalAmount: 25, originalCurrency: 'GBP',
      exchangeRate: 1.2, exchangeRateDate: '2026-10-07', exchangeRateSource: 'ecb',
      foreignWithholdingAmount: 5, foreignWithholdingCurrency: 'GBP', withholdingApplied: 0,
    });
  });

  it('si el BCE no responde, deja escribir el tipo a mano', async () => {
    fetchExchangeRate.mockResolvedValue({ ok: false, message: 'No se ha podido consultar el BCE. Escribe el tipo de cambio a mano.' });
    const onAddPayment = renderDetail(gbpLoan);
    fireEvent.click(screen.getByRole('button', { name: /añadir pago/i }));
    await screen.findByText(/no se ha podido consultar el bce/i);
    const add = screen.getByRole('button', { name: /^añadir$/i }) as HTMLButtonElement;
    fireEvent.change(screen.getByLabelText(/importe cobrado \(gbp\)/i), { target: { value: '10' } });
    expect(add.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText(/tipo de cambio/i), { target: { value: '1,1' } });
    fireEvent.click(add);
    expect(onAddPayment.mock.calls[0][1]).toMatchObject({ amount: 11, exchangeRate: 1.1, exchangeRateSource: 'manual' });
  });
});
