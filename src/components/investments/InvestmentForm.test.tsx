import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { InvestmentForm } from './InvestmentForm';
import { LanguageProvider } from '@/contexts/LanguageContext';
import type { Investment } from '@/types/investment';

// InvestmentForm llama a useAuth() incondicionalmente (para el borrador de
// nuevas inversiones). La mayoría de estos tests usan initialData (edición),
// donde el borrador queda desactivado sin importar el usuario — pero los
// tests del borrador automático de "Nueva Inversión" (más abajo) sí
// necesitan un user.id real, así que el mock es controlable por test en vez
// de fijo.
const mockUseAuth = vi.fn(() => ({ user: null as { id: string } | null }));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

// El entorno de test (Node 25 + jsdom vía vitest) expone un `localStorage`
// global roto (TypeError: setItem is not a function) salvo que Node arranque
// con --localstorage-file — nada que ver con el bug de producción, donde el
// localStorage del navegador funciona con normalidad. Los tests del
// borrador automático necesitan un localStorage real, así que se sustituye
// por un stub en memoria solo mientras dura cada uno de esos tests.
function stubWorkingLocalStorage() {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => { store.set(k, String(v)); },
    removeItem: (k: string) => { store.delete(k); },
    clear: () => { store.clear(); },
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    get length() { return store.size; },
  });
}

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

describe('InvestmentForm — el campo Monto (y Rentabilidad) se pueden vaciar por completo', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    mockUseAuth.mockReturnValue({ user: null });
  });

  it('borrar el importe hasta vaciarlo al editar una inversión existente deja el campo vacío, no el importe original', async () => {
    const onSubmit = vi.fn();
    const prueba = makeInvestment({ id: 'inv-prueba', projectName: 'prueba', amount: 7089 });

    renderForm(prueba, onSubmit);
    await openDialog();

    const amountInput = screen.getByPlaceholderText('1000') as HTMLInputElement;
    expect(amountInput.value).toBe('7.089,00');

    fireEvent.change(amountInput, { target: { value: '708' } });
    fireEvent.change(amountInput, { target: { value: '70' } });
    fireEvent.change(amountInput, { target: { value: '7' } });
    fireEvent.change(amountInput, { target: { value: '' } });

    expect(amountInput.value).toBe('');
  });

  it('nueva inversión tras editar otra: el borrador restaurado no arrastra el importe de la inversión editada, y su propio importe SÍ se puede vaciar', async () => {
    stubWorkingLocalStorage();
    mockUseAuth.mockReturnValue({ user: { id: 'user-1' } });

    // 1) Empieza una inversión nueva con un importe (5000) y la abandona sin
    // enviarla — por diseño, cerrar sin guardar conserva el borrador.
    const onSubmitNew1 = vi.fn();
    const { unmount: unmountNew1 } = render(
      <LanguageProvider>
        <InvestmentForm onSubmit={onSubmitNew1} trigger={<button>nueva</button>} />
      </LanguageProvider>,
    );
    fireEvent.click(screen.getByText('nueva'));
    await screen.findByPlaceholderText('Notas adicionales...');
    fireEvent.change(screen.getByPlaceholderText('1000'), { target: { value: '5000' } });
    await new Promise((r) => setTimeout(r, 350)); // deja que el guardado del borrador (debounced 300ms) se dispare
    unmountNew1();

    // 2) Edita una inversión YA EXISTENTE distinta ("prueba", importe 7089) y cancela.
    const onSubmitEdit = vi.fn();
    const prueba = makeInvestment({ id: 'inv-prueba', projectName: 'prueba', amount: 7089 });
    const { unmount: unmountEdit } = renderForm(prueba, onSubmitEdit);
    await openDialog();
    expect((screen.getByPlaceholderText('1000') as HTMLInputElement).value).toBe('7.089,00');
    closeViaCancel();
    unmountEdit();

    // 3) Reabre "Nueva Inversión": el importe restaurado debe ser el del
    // borrador propio (5000), NUNCA el de "prueba" (7089).
    const onSubmitNew2 = vi.fn();
    render(
      <LanguageProvider>
        <InvestmentForm onSubmit={onSubmitNew2} trigger={<button>nueva</button>} />
      </LanguageProvider>,
    );
    fireEvent.click(screen.getByText('nueva'));
    await screen.findByPlaceholderText('Notas adicionales...');
    const amountInput = screen.getByPlaceholderText('1000') as HTMLInputElement;
    await waitFor(() => expect(amountInput.value).toBe('5.000,00'));
    expect(amountInput.value).not.toBe('7.089,00');

    // 4) Y ese importe restaurado SÍ se debe poder vaciar del todo.
    fireEvent.change(amountInput, { target: { value: '500' } });
    fireEvent.change(amountInput, { target: { value: '' } });
    expect(amountInput.value).toBe('');
  });

  it('el borrador automático: un importe restaurado tras reabrir el formulario se puede vaciar por completo', async () => {
    stubWorkingLocalStorage();
    mockUseAuth.mockReturnValue({ user: { id: 'user-1' } });

    const onSubmit1 = vi.fn();
    const { unmount } = render(
      <LanguageProvider>
        <InvestmentForm onSubmit={onSubmit1} trigger={<button>nueva</button>} />
      </LanguageProvider>,
    );
    fireEvent.click(screen.getByText('nueva'));
    await screen.findByPlaceholderText('Notas adicionales...');
    fireEvent.change(screen.getByPlaceholderText('1000'), { target: { value: '7089' } });
    await new Promise((r) => setTimeout(r, 350));
    unmount();

    const onSubmit2 = vi.fn();
    render(
      <LanguageProvider>
        <InvestmentForm onSubmit={onSubmit2} trigger={<button>nueva</button>} />
      </LanguageProvider>,
    );
    fireEvent.click(screen.getByText('nueva'));
    await screen.findByPlaceholderText('Notas adicionales...');

    // Confirma que de verdad se restauró un borrador (y no que el campo
    // simplemente nació vacío) antes de comprobar que se puede vaciar.
    expect(screen.getByText('Borrador restaurado')).toBeTruthy();
    const amountInput = screen.getByPlaceholderText('1000') as HTMLInputElement;
    expect(amountInput.value).toBe('7.089,00');

    fireEvent.change(amountInput, { target: { value: '708' } });
    fireEvent.change(amountInput, { target: { value: '' } });
    expect(amountInput.value).toBe('');
  });

  it('acepta coma decimal en Monto y Rentabilidad', async () => {
    const onSubmit = vi.fn();
    const prueba = makeInvestment({ id: 'inv-prueba', projectName: 'prueba', amount: 10000, expectedReturn: 8 });

    renderForm(prueba, onSubmit);
    await openDialog();

    // Tecleo incremental, carácter a carácter (como un usuario real), no un
    // único fireEvent.change con el valor final: así se comprueba que la
    // coma "1234," no se reformatea a "1234" a mitad de escritura, que es
    // justo lo que impediría completar "1234,56".
    const amountInput = screen.getByPlaceholderText('1000') as HTMLInputElement;
    for (const partial of ['1', '12', '123', '1234', '1234,', '1234,5', '1234,56']) {
      fireEvent.change(amountInput, { target: { value: partial } });
      expect(amountInput.value).toBe(partial);
    }

    const returnInput = screen.getByPlaceholderText('10') as HTMLInputElement;
    for (const partial of ['7', '7,', '7,5']) {
      fireEvent.change(returnInput, { target: { value: partial } });
      expect(returnInput.value).toBe(partial);
    }

    changeNotesAndSave('con coma decimal');

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const payload = onSubmit.mock.calls[onSubmit.mock.calls.length - 1][0] as Record<string, unknown>;
    expect(payload.amount).toBe(1234.56);
    expect(payload.expectedReturn).toBe(7.5);
  });

  it('interpreta el punto como separador de miles: "1.500" son 1500, nunca 1,5', async () => {
    const onSubmit = vi.fn();
    const prueba = makeInvestment({ id: 'inv-prueba', projectName: 'prueba', amount: 10000 });

    renderForm(prueba, onSubmit);
    await openDialog();

    fireEvent.change(screen.getByPlaceholderText('1000'), { target: { value: '1.500' } });
    changeNotesAndSave('importe con punto de millares');

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const payload = onSubmit.mock.calls[onSubmit.mock.calls.length - 1][0] as Record<string, unknown>;
    expect(payload.amount).toBe(1500);
  });

  it('al perder el foco, reformatea el importe al estilo español (1.500,00) para que el usuario vea lo que se va a guardar', async () => {
    const onSubmit = vi.fn();
    const prueba = makeInvestment({ id: 'inv-prueba', projectName: 'prueba', amount: 10000 });

    renderForm(prueba, onSubmit);
    await openDialog();

    const amountInput = screen.getByPlaceholderText('1000') as HTMLInputElement;
    fireEvent.change(amountInput, { target: { value: '1500' } });
    expect(amountInput.value).toBe('1500'); // tal cual se escribió, sin reformatear en pleno tecleo

    fireEvent.blur(amountInput);
    expect(amountInput.value).toBe('1.500,00');
  });

  it('una entrada ambigua (formato inglés "1,500.50") muestra un error claro al perder el foco y bloquea el guardado en vez de guardar un valor silenciosamente distinto', async () => {
    const onSubmit = vi.fn();
    const prueba = makeInvestment({ id: 'inv-prueba', projectName: 'prueba', amount: 10000 });

    renderForm(prueba, onSubmit);
    await openDialog();

    const amountInput = screen.getByPlaceholderText('1000') as HTMLInputElement;
    fireEvent.change(amountInput, { target: { value: '1,500.50' } });
    fireEvent.blur(amountInput);

    await screen.findByText(/en España el punto separa los miles y la coma los decimales/);

    fireEvent.click(screen.getByText('Guardar Cambios'));

    // Nunca debe guardarse ni el importe original (10000) ni el número
    // "adivinado" a partir de una entrada ambigua — el guardado queda
    // bloqueado (Importe pasa a considerarse un campo pendiente) hasta que
    // el usuario corrija el texto.
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('una entrada no reconocible ("abc") muestra un error claro y bloquea el guardado', async () => {
    const onSubmit = vi.fn();
    const prueba = makeInvestment({ id: 'inv-prueba', projectName: 'prueba', amount: 10000 });

    renderForm(prueba, onSubmit);
    await openDialog();

    const amountInput = screen.getByPlaceholderText('1000') as HTMLInputElement;
    fireEvent.change(amountInput, { target: { value: 'abc' } });
    fireEvent.blur(amountInput);

    await screen.findByText(/No se reconoce como un número/);
    fireEvent.click(screen.getByText('Guardar Cambios'));
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
