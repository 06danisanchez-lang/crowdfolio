import { describe, it, expect } from 'vitest';
import { assessDefaultLoss, DefaultLossInput, DefaultLossPayment } from './defaultLoss';

// Input base "vacío" — cada test sobreescribe solo lo que necesita.
function baseInput(overrides: Partial<DefaultLossInput> = {}): DefaultLossInput {
  return {
    incomeModel: 'bullet',
    amountInvested: 1000,
    payments: [],
    lossAssessedAt: '2025-01-01T00:00:00.000Z',
    insolvencyStatus: null,
    insolvencyConcludedDate: null,
    quitaAmount: null,
    quitaDate: null,
    enforcementStarted: null,
    enforcementDate: null,
    enforcementInitiator: null,
    ...overrides,
  };
}

const principal = (amount: number, date: string): DefaultLossPayment => ({ type: 'principal', amount, date });
const today = (s: string) => new Date(`${s}T12:00:00`);

describe('assessDefaultLoss', () => {
  it('equity → not_applicable_equity', () => {
    const r = assessDefaultLoss(baseInput({ incomeModel: 'equity', lossAssessedAt: null }), today('2027-01-01'));
    expect(r.status).toBe('not_applicable_equity');
    expect(r.lossAmount).toBe(0);
    expect(r.imputations).toEqual([]);
  });

  it('sin cuestionario → not_assessed', () => {
    const r = assessDefaultLoss(baseInput({ lossAssessedAt: null }), today('2027-01-01'));
    expect(r.status).toBe('not_assessed');
    expect(r.lossAmount).toBe(0);
  });

  it('pérdida 0 → no_loss', () => {
    const r = assessDefaultLoss(
      baseInput({ amountInvested: 1000, payments: [principal(1000, '2024-01-01')] }),
      today('2027-01-01'),
    );
    expect(r.status).toBe('no_loss');
    expect(r.lossAmount).toBe(0);
  });

  it('concurso concluido sin cobro → deductible en el año de conclusión', () => {
    const r = assessDefaultLoss(
      baseInput({ amountInvested: 1000, insolvencyStatus: 'concluded_unpaid', insolvencyConcludedDate: '2025-06-10' }),
      today('2027-01-01'),
    );
    expect(r.status).toBe('deductible');
    expect(r.lossAmount).toBe(1000);
    expect(r.imputations).toEqual([
      { amount: 1000, trigger: 'insolvency_concluded', triggerDate: '2025-06-10', year: 2025 },
    ]);
    expect(r.pendingAmount).toBe(0);
  });

  it('quita parcial sin más hechos → partially_deductible, resto not_yet', () => {
    const r = assessDefaultLoss(
      baseInput({ amountInvested: 1000, quitaAmount: 400, quitaDate: '2025-03-01' }),
      today('2026-01-01'),
    );
    expect(r.status).toBe('partially_deductible');
    expect(r.imputations).toEqual([
      { amount: 400, trigger: 'quita', triggerDate: '2025-03-01', year: 2025 },
    ]);
    expect(r.pendingAmount).toBe(600);
    expect(r.pendingReason).toBe('not_yet');
  });

  it('quita en 2025 y concurso concluido en 2027 → dos imputaciones, cada una en su año', () => {
    const r = assessDefaultLoss(
      baseInput({
        amountInvested: 1000,
        quitaAmount: 300,
        quitaDate: '2025-05-01',
        insolvencyStatus: 'concluded_unpaid',
        insolvencyConcludedDate: '2027-02-01',
      }),
      today('2027-06-01'),
    );
    expect(r.status).toBe('deductible');
    expect(r.imputations).toEqual([
      { amount: 300, trigger: 'quita', triggerDate: '2025-05-01', year: 2025 },
      { amount: 700, trigger: 'insolvency_concluded', triggerDate: '2027-02-01', year: 2027 },
    ]);
    expect(r.pendingAmount).toBe(0);
  });

  it('quita mayor que la pérdida → imputa solo la pérdida', () => {
    const r = assessDefaultLoss(
      baseInput({ amountInvested: 500, quitaAmount: 800, quitaDate: '2025-01-01' }),
      today('2026-01-01'),
    );
    expect(r.status).toBe('deductible');
    expect(r.imputations).toEqual([
      { amount: 500, trigger: 'quita', triggerDate: '2025-01-01', year: 2025 },
    ]);
    expect(r.pendingAmount).toBe(0);
  });

  it('concurso abierto + ejecución de hace 2 años → pending_insolvency', () => {
    const r = assessDefaultLoss(
      baseInput({
        amountInvested: 1000,
        insolvencyStatus: 'open',
        enforcementStarted: true,
        enforcementDate: '2025-01-01',
        enforcementInitiator: 'user',
      }),
      today('2027-01-01'),
    );
    expect(r.status).toBe('pending_insolvency');
    expect(r.pendingReason).toBe('pending_insolvency');
    expect(r.imputations).toEqual([]);
    expect(r.pendingAmount).toBe(1000);
  });

  it('ejecución hace 11 meses → pending_deadline con fecha correcta', () => {
    const r = assessDefaultLoss(
      baseInput({
        amountInvested: 1000,
        enforcementStarted: true,
        enforcementDate: '2026-02-15',
        enforcementInitiator: 'user',
      }),
      today('2027-01-15'),
    );
    expect(r.status).toBe('pending_deadline');
    expect(r.pendingReason).toBe('pending_deadline');
    expect(r.deadlineDate).toBe('2027-02-15');
    expect(r.pendingAmount).toBe(1000);
  });

  it('hoy = aniversario exacto de la ejecución → deductible', () => {
    const r = assessDefaultLoss(
      baseInput({
        amountInvested: 1000,
        enforcementStarted: true,
        enforcementDate: '2026-01-15',
        enforcementInitiator: 'user',
      }),
      today('2027-01-15'),
    );
    expect(r.status).toBe('deductible');
    expect(r.imputations).toEqual([
      { amount: 1000, trigger: 'enforcement_one_year', triggerDate: '2027-01-15', year: 2027 },
    ]);
  });

  it('ejecución iniciada el 29/02/2024 → deadline correcto (año siguiente no bisiesto → 28/02)', () => {
    const r = assessDefaultLoss(
      baseInput({
        amountInvested: 1000,
        enforcementStarted: true,
        enforcementDate: '2024-02-29',
        enforcementInitiator: 'user',
      }),
      today('2025-01-01'),
    );
    expect(r.status).toBe('pending_deadline');
    expect(r.deadlineDate).toBe('2025-02-28');
  });

  it('ejecución iniciada el 20/12/2025, hoy 15/01/2027 → imputación en 2026', () => {
    const r = assessDefaultLoss(
      baseInput({
        amountInvested: 1000,
        enforcementStarted: true,
        enforcementDate: '2025-12-20',
        enforcementInitiator: 'user',
      }),
      today('2027-01-15'),
    );
    expect(r.status).toBe('deductible');
    expect(r.imputations[0]).toMatchObject({ trigger: 'enforcement_one_year', triggerDate: '2026-12-20', year: 2026 });
  });

  it('amortizable con principal devuelto antes del impago → lossAmount lo descuenta', () => {
    const r = assessDefaultLoss(
      baseInput({
        amountInvested: 1000,
        payments: [principal(300, '2024-01-01')],
        insolvencyStatus: 'concluded_unpaid',
        insolvencyConcludedDate: '2025-06-01',
      }),
      today('2027-01-01'),
    );
    expect(r.lossAmount).toBe(700);
    expect(r.imputations).toEqual([
      { amount: 700, trigger: 'insolvency_concluded', triggerDate: '2025-06-01', year: 2025 },
    ]);
  });

  it('recuperación antes del hecho → reduce la pérdida', () => {
    const r = assessDefaultLoss(
      baseInput({
        amountInvested: 1000,
        payments: [principal(200, '2024-06-01')], // antes de la quita
        quitaAmount: 1000,
        quitaDate: '2025-01-01',
      }),
      today('2026-01-01'),
    );
    // lossAmount = 1000 - 200 = 800; la quita (1000) queda topada a la pérdida real (800)
    expect(r.lossAmount).toBe(800);
    expect(r.imputations).toEqual([
      { amount: 800, trigger: 'quita', triggerDate: '2025-01-01', year: 2025 },
    ]);
  });

  it('recuperación después del hecho con todo imputado → ganancia en el año del cobro', () => {
    const r = assessDefaultLoss(
      baseInput({
        amountInvested: 1000,
        insolvencyStatus: 'concluded_unpaid',
        insolvencyConcludedDate: '2025-06-01',
        payments: [principal(150, '2026-03-01')], // después del hecho, ya todo imputado
      }),
      today('2027-01-01'),
    );
    expect(r.status).toBe('deductible');
    expect(r.pendingAmount).toBe(0);
    expect(r.recoveryGains).toEqual([{ year: 2026, amount: 150 }]);
  });

  it('recuperación después de una quita parcial → primero reduce el pendiente; el exceso es ganancia', () => {
    const r = assessDefaultLoss(
      baseInput({
        amountInvested: 1000,
        quitaAmount: 300,
        quitaDate: '2025-01-01',
        payments: [principal(900, '2025-08-01')], // después de la quita
      }),
      today('2026-01-01'),
    );
    // pendiente tras la quita: 700. El pago de 900 cubre esos 700 y deja 200 de exceso.
    expect(r.pendingAmount).toBe(0);
    expect(r.recoveryGains).toEqual([{ year: 2025, amount: 200 }]);
    expect(r.status).toBe('deductible'); // ya no queda nada pendiente
  });

  it('ejecución iniciada por la plataforma → flag activado', () => {
    const r = assessDefaultLoss(
      baseInput({
        amountInvested: 1000,
        enforcementStarted: true,
        enforcementDate: '2025-01-01',
        enforcementInitiator: 'platform',
      }),
      today('2027-01-01'),
    );
    expect(r.status).toBe('deductible');
    expect(r.flags.platformInitiatedEnforcement).toBe(true);
  });

  it('unknown sin ejecución → unknown con nextReviewDate', () => {
    const r = assessDefaultLoss(
      baseInput({ amountInvested: 1000, insolvencyStatus: 'unknown' }),
      today('2027-01-01'),
    );
    expect(r.status).toBe('unknown');
    expect(r.pendingReason).toBe('unknown');
    expect(r.nextReviewDate).toBe('2027-04-01');
  });
});
