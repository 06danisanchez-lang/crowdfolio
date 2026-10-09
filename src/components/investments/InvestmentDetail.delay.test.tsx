import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import { InvestmentDetail } from './InvestmentDetail';
import { LanguageProvider } from '@/contexts/LanguageContext';
import type { Investment } from '@/types/investment';

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null }) }));

// 10 % a 12 meses que vencía el 1/1/2026 y se ha movido al 1/7/2026 → 6 meses de retraso.
const base: Investment = {
  id: 'inv-1', platform: 'urbanitae', projectName: 'Proyecto', amount: 10000,
  investmentDate: '2025-01-01', expectedEndDate: '2026-07-01', originalEndDate: '2026-01-01',
  expectedReturn: 10, incomeModel: 'bullet', status: 'active', payments: [],
  createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z',
};

function renderDetail(investment: Investment, onUpdate = vi.fn(async () => ({ demotedToDraft: false }))) {
  render(
    <LanguageProvider>
      <InvestmentDetail
        investment={investment}
        onClose={() => {}}
        onUpdate={onUpdate}
        onDelete={() => {}}
        onAddPayment={vi.fn()}
        onDeletePayment={() => {}}
      />
    </LanguageProvider>,
  );
  return onUpdate;
}

describe('InvestmentDetail — retrasos', () => {
  afterEach(() => { cleanup(); vi.useRealTimers(); });

  it('retraso: muestra la fecha prometida, el retraso y la TAE ajustada', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-02-01T12:00:00'));
    renderDetail({ ...base, interestEndDate: '2026-01-01' });
    expect(screen.getByText(/vencimiento prometido/i)).toBeTruthy();
    expect(screen.getByText(/retraso previsto de 6 meses/i)).toBeTruthy();
    expect(screen.getByText(/TAE ajustada por el retraso/i)).toBeTruthy();
    expect(screen.getByText('6.7%')).toBeTruthy();
    expect(screen.getByText(/sin intereses extra/i)).toBeTruthy();
  });

  it('prórroga aún en plazo: informa del retraso sin bajar la TAE', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-02-01T12:00:00'));
    renderDetail({ ...base, wasExtended: true });
    expect(screen.getByText(/prorrogada 6 meses/i)).toBeTruthy();
    expect(screen.queryByText(/TAE ajustada por el retraso/i)).toBeNull();
    expect(screen.getByText(/sigue generando intereses al mismo tipo/i)).toBeTruthy();
  });

  it('el formulario de prórroga o retraso guarda la opción elegida', async () => {
    const onUpdate = renderDetail({ ...base, originalEndDate: undefined, expectedEndDate: '2026-01-01' });
    fireEvent.click(screen.getByRole('button', { name: /prórroga o retraso/i }));
    fireEvent.click(screen.getByRole('button', { name: /retraso en el cobro/i }));
    expect(screen.getByRole('button', { name: /retraso en el cobro/i }).getAttribute('aria-pressed')).toBe('true');
    // sin fecha no se puede guardar
    const form = screen.getByText(/¿qué ha pasado\?/i).parentElement!;
    expect((within(form).getByRole('button', { name: /guardar/i }) as HTMLButtonElement).disabled).toBe(true);
    expect(onUpdate).not.toHaveBeenCalled();
  });
});
