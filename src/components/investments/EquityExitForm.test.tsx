import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { EquityExitForm } from './EquityExitForm';
import type { Investment } from '@/types/investment';

const investment: Investment = {
  id: 'inv-1', platform: 'urbanitae', projectName: 'Proyecto Equity', amount: 1000,
  investmentDate: '2023-01-01', expectedEndDate: '2026-01-01', expectedReturn: 10,
  incomeModel: 'equity', equityType: 'plusvalia', status: 'active', payments: [],
  createdAt: '2023-01-01T00:00:00Z', updatedAt: '2023-01-01T00:00:00Z',
};

function renderForm(onConfirm = vi.fn().mockResolvedValue({}), inv: Investment = investment) {
  render(
    <Dialog open>
      <DialogContent>
        <EquityExitForm investment={inv} closeReason="on_time" saving={false} onBack={() => {}} onConfirm={onConfirm} />
      </DialogContent>
    </Dialog>,
  );
  return onConfirm;
}

describe('EquityExitForm', () => {
  afterEach(cleanup);

  it('no deja confirmar sin importe válido', () => {
    renderForm();
    const btn = screen.getByRole('button', { name: /confirmar y cerrar/i }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    fireEvent.change(screen.getByPlaceholderText(/1\.500,50/), { target: { value: 'abc' } });
    expect(btn.disabled).toBe(true);
  });

  it('interpreta el punto como separador de miles y separa capital y beneficio', async () => {
    const onConfirm = renderForm();
    fireEvent.change(screen.getByPlaceholderText(/1\.500,50/), { target: { value: '1.150,00' } });
    fireEvent.click(screen.getByRole('button', { name: /confirmar y cerrar/i }));
    await waitFor(() => expect(onConfirm).toHaveBeenCalled());
    const [plan] = onConfirm.mock.calls[0];
    expect(plan.payments.map((p: { type: string; amount: number }) => [p.type, p.amount])).toEqual([['principal', 1000], ['dividend', 150]]);
  });

  it('con pérdida avisa de que es pérdida patrimonial a declarar manualmente', () => {
    renderForm();
    fireEvent.change(screen.getByPlaceholderText(/1\.500,50/), { target: { value: '700' } });
    expect(screen.getByText(/pérdida patrimonial/i)).toBeTruthy();
  });

  it('muestra el error si no se ha podido guardar y no se cierra', async () => {
    renderForm(vi.fn().mockResolvedValue({ error: 'No se ha podido registrar el importe recibido.' }));
    fireEvent.change(screen.getByPlaceholderText(/1\.500,50/), { target: { value: '1000' } });
    fireEvent.click(screen.getByRole('button', { name: /confirmar y cerrar/i }));
    expect(await screen.findByText(/no se ha podido registrar/i)).toBeTruthy();
  });
});
