import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { InvestmentDetail } from './InvestmentDetail';
import { LanguageProvider } from '@/contexts/LanguageContext';
import type { Investment } from '@/types/investment';

// InvestmentDetail incluye el formulario de edición, que usa useAuth.
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null }) }));

const investment: Investment = {
  id: 'inv-1', platform: 'urbanitae', projectName: 'Proyecto', amount: 10000,
  investmentDate: '2025-01-01', expectedEndDate: '2027-01-01', expectedReturn: 10,
  incomeModel: 'bullet', status: 'active', payments: [],
  createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z',
};

function renderDetail(onAddPayment = vi.fn()) {
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

describe('InvestmentDetail — añadir cobro en formato español', () => {
  afterEach(cleanup);

  it('lee "1.500,50" como mil quinientos y propone el 19 % de retención', () => {
    const onAddPayment = renderDetail();
    fireEvent.click(screen.getByRole('button', { name: /añadir pago/i }));
    fireEvent.change(screen.getByPlaceholderText(/importe|monto|amount/i), { target: { value: '1.500,50' } });
    expect((screen.getByLabelText(/retención practicada/i) as HTMLInputElement).value).toBe('285,10');
    fireEvent.click(screen.getByRole('button', { name: /^añadir$/i }));
    expect(onAddPayment).toHaveBeenCalledTimes(1);
    const [, payment] = onAddPayment.mock.calls[0];
    expect(payment.amount).toBe(1500.5);
    expect(payment.withholdingApplied).toBe(285.1);
  });

  it('no deja añadir un importe que no se puede interpretar', () => {
    const onAddPayment = renderDetail();
    fireEvent.click(screen.getByRole('button', { name: /añadir pago/i }));
    fireEvent.change(screen.getByPlaceholderText(/importe|monto|amount/i), { target: { value: '1,500.50' } });
    expect(screen.getByText(/importe no válido/i)).toBeTruthy();
    expect((screen.getByRole('button', { name: /^añadir$/i }) as HTMLButtonElement).disabled).toBe(true);
    expect(onAddPayment).not.toHaveBeenCalled();
  });

  it('una retención escrita a mano también se lee en formato español', () => {
    const onAddPayment = renderDetail();
    fireEvent.click(screen.getByRole('button', { name: /añadir pago/i }));
    fireEvent.change(screen.getByPlaceholderText(/importe|monto|amount/i), { target: { value: '2.000' } });
    fireEvent.change(screen.getByLabelText(/retención practicada/i), { target: { value: '380,00' } });
    fireEvent.click(screen.getByRole('button', { name: /^añadir$/i }));
    const [, payment] = onAddPayment.mock.calls[0];
    expect(payment.amount).toBe(2000);
    expect(payment.withholdingApplied).toBe(380);
  });
});
