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

describe('InvestmentForm — fecha del primer cobro fuera de rango tras editar otra fecha', () => {
  afterEach(cleanup);

  it('editar el vencimiento dejando first_payment_date fuera de rango avisa con un mensaje claro y NO llama a onSubmit (nunca llega al constraint de la BD)', async () => {
    const onSubmit = vi.fn();
    const inv = makeInvestment({
      id: 'inv-f',
      incomeModel: 'periodic_fixed',
      paymentFrequency: 'monthly',
      investmentDate: '2024-01-01',
      expectedEndDate: '2025-01-01',
      firstPaymentDate: '2024-06-01', // válido: entre investmentDate y expectedEndDate
    });

    renderForm(inv, onSubmit);
    await openDialog();

    // Abre el calendario de "Fecha de Vencimiento" y lo mueve a marzo de 2024
    // (antes de firstPaymentDate) usando los desplegables de mes/año — así el
    // vencimiento editado queda ANTES del primer cobro ya guardado.
    fireEvent.click(screen.getByText('Fecha de Vencimiento'));
    const selects = await screen.findAllByRole('combobox', { hidden: true });
    const monthSelect = selects[selects.length - 2] as HTMLSelectElement;
    const yearSelect = selects[selects.length - 1] as HTMLSelectElement;
    fireEvent.change(monthSelect, { target: { value: '2' } }); // marzo (0-indexado)
    fireEvent.change(yearSelect, { target: { value: '2024' } });

    const dayButtons = Array.from(document.querySelectorAll('button[name="day"]')) as HTMLButtonElement[];
    const day10 = dayButtons.find(b => b.textContent === '10' && !b.className.includes('day-outside'));
    expect(day10).toBeTruthy();
    fireEvent.click(day10!);

    fireEvent.click(screen.getByText('Guardar Cambios'));

    await screen.findByText('La fecha del primer cobro debe estar entre la fecha de inversión y el vencimiento');
    expect(onSubmit).not.toHaveBeenCalled();
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
