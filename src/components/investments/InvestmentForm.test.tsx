import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { InvestmentForm } from './InvestmentForm';
import { LanguageProvider } from '@/contexts/LanguageContext';
import type { Investment } from '@/types/investment';

// InvestmentForm llama a useAuth() incondicionalmente (para el borrador de
// nuevas inversiones) — no nos interesa aquí (initialData siempre presente
// en estos tests, así que el borrador queda desactivado de todas formas), y
// montar el AuthProvider real dispararía llamadas reales a Supabase.
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null }),
}));

function makeInvestment(overrides: Partial<Investment> & { id: string }): Investment {
  return {
    platform: 'urbanitae',
    projectName: 'Proyecto de prueba',
    amount: 10000,
    investmentDate: '2024-01-01',
    expectedEndDate: '2025-01-01',
    expectedReturn: 8,
    incomeModel: 'bullet',
    status: 'active',
    payments: [],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function renderForm(initialData: Investment, onSubmit: (data: unknown) => void) {
  return render(
    <LanguageProvider>
      <InvestmentForm initialData={initialData} onSubmit={onSubmit} trigger={<button>abrir</button>} />
    </LanguageProvider>,
  );
}

async function openDialog() {
  fireEvent.click(screen.getByText('abrir'));
  await screen.findByPlaceholderText('Notas adicionales...');
}

function closeViaCancel() {
  fireEvent.click(screen.getByText('Cancelar'));
}

function changeNotesAndSave(value: string) {
  fireEvent.change(screen.getByPlaceholderText('Notas adicionales...'), { target: { value } });
  fireEvent.click(screen.getByText('Guardar Cambios'));
}

describe('InvestmentForm — no debe arrastrar datos obsoletos entre aperturas', () => {
  afterEach(cleanup);

  it('reabrir la MISMA inversión tras un cambio externo de incomeModel envía el valor actual, no el de la apertura anterior', async () => {
    const onSubmit = vi.fn();
    const bulletVersion = makeInvestment({ id: 'inv-a', incomeModel: 'bullet' });

    const { rerender } = renderForm(bulletVersion, onSubmit);

    await openDialog();
    closeViaCancel();

    // La MISMA inversión (mismo id) cambia de modelo FUERA de este formulario
    // (p.ej. otra edición, o un refetch) mientras el componente sigue montado.
    const equityVersion = makeInvestment({ id: 'inv-a', incomeModel: 'equity', equityType: 'liquidacion' });
    rerender(
      <LanguageProvider>
        <InvestmentForm initialData={equityVersion} onSubmit={onSubmit} trigger={<button>abrir</button>} />
      </LanguageProvider>,
    );

    // Reabre y cambia solo un campo ajeno (notas) — no se toca incomeModel a propósito.
    await openDialog();
    changeNotesAndSave('cambio ajeno al modelo de ingresos');

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const payload = onSubmit.mock.calls[onSubmit.mock.calls.length - 1][0] as Record<string, unknown>;
    expect(payload.incomeModel).toBe('equity');
    expect(payload.equityType).toBe('liquidacion');
  });

  it('abrir la inversión A y luego la B no arrastra los campos de A', async () => {
    const onSubmit = vi.fn();
    const invA = makeInvestment({ id: 'inv-a', incomeModel: 'equity', equityType: 'rentas', projectName: 'Proyecto A' });
    const invB = makeInvestment({ id: 'inv-b', incomeModel: 'bullet', projectName: 'Proyecto B' });

    const { rerender } = renderForm(invA, onSubmit);

    await openDialog();
    await screen.findByDisplayValue('Proyecto A');
    closeViaCancel();

    rerender(
      <LanguageProvider>
        <InvestmentForm initialData={invB} onSubmit={onSubmit} trigger={<button>abrir</button>} />
      </LanguageProvider>,
    );

    await openDialog();
    await screen.findByDisplayValue('Proyecto B');
    changeNotesAndSave('nota de B');

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const payload = onSubmit.mock.calls[onSubmit.mock.calls.length - 1][0] as Record<string, unknown>;
    expect(payload.projectName).toBe('Proyecto B');
    expect(payload.incomeModel).toBe('bullet');
    expect(payload.equityType).toBeFalsy();
  });

  it('al cerrar el diálogo (Cancelar) ningún campo de calificación queda en undefined', async () => {
    const onSubmit = vi.fn();
    const periodicInv = makeInvestment({
      id: 'inv-c',
      incomeModel: 'periodic_fixed',
      paymentFrequency: 'monthly',
      expectedEndDate: '2026-01-01',
    });

    renderForm(periodicInv, onSubmit);

    await openDialog();
    closeViaCancel();

    // Reabre sin que nada externo haya cambiado: si el cierre hubiera dejado
    // incomeModel/paymentFrequency en undefined, guardar ahora sin tocar
    // nada enviaría un payload incompleto/incorrecto.
    await openDialog();
    changeNotesAndSave('sin tocar el modelo');

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const payload = onSubmit.mock.calls[onSubmit.mock.calls.length - 1][0] as Record<string, unknown>;
    expect(payload.incomeModel).toBe('periodic_fixed');
    expect(payload.paymentFrequency).toBe('monthly');
  });
});

describe('InvestmentForm — inversiones en impago no permiten cambiar el tipo de rendimiento', () => {
  afterEach(cleanup);

  it('con status defaulted, el desplegable de tipo de rendimiento está deshabilitado y muestra la nota', async () => {
    const onSubmit = vi.fn();
    const defaultedInv = makeInvestment({ id: 'inv-d', incomeModel: 'bullet', status: 'defaulted' });

    renderForm(defaultedInv, onSubmit);
    await openDialog();

    expect((screen.getByLabelText('Tipo de rendimiento') as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText('Para cambiar el tipo de rendimiento, primero deshaz el impago.')).toBeTruthy();
  });

  it('con status distinto de defaulted, el desplegable está habilitado y no hay nota', async () => {
    const onSubmit = vi.fn();
    const activeInv = makeInvestment({ id: 'inv-e', incomeModel: 'bullet', status: 'active' });

    renderForm(activeInv, onSubmit);
    await openDialog();

    expect((screen.getByLabelText('Tipo de rendimiento') as HTMLButtonElement).disabled).toBe(false);
    expect(screen.queryByText('Para cambiar el tipo de rendimiento, primero deshaz el impago.')).toBeNull();
  });
});
