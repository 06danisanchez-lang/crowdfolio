import { addYears, addMonths, format, parseISO } from 'date-fns';
import { getPrincipalReturned } from './principalReturned';

/**
 * Motor puro de calificación fiscal de pérdidas por impago — art. 14.2.k LIRPF.
 * Sin React, sin Supabase: solo funciones sobre datos ya cargados. La UI y
 * useTaxSummary.ts se conectan en una fase posterior.
 *
 * Regla legal (fuente de verdad, ver docs de la Fase 2): la pérdida por un
 * crédito impagado solo se imputa en el ejercicio en que ocurre uno de estos
 * hechos:
 *   (a) adquiere eficacia una quita — solo por su importe;
 *   (b) concluye el concurso de acreedores del deudor sin cobro;
 *   (c) se cumple 1 año desde el inicio de un procedimiento judicial de
 *       ejecución distinto del concursal, sin haber cobrado.
 * Base imponible general. Sin compensación con RCM. No aplica a incomeModel
 * 'equity' (no son créditos).
 */

export type InsolvencyStatus = 'none' | 'open' | 'concluded_unpaid' | 'unknown';
export type EnforcementInitiator = 'user' | 'platform';
export type ImputationTrigger = 'quita' | 'insolvency_concluded' | 'enforcement_one_year';

/** Motivo por el que una parte de la pérdida sigue sin poder imputarse. */
export type PendingReason = 'pending_deadline' | 'pending_insolvency' | 'not_yet' | 'unknown';

export type DefaultLossStatus =
  | 'deductible'
  | 'partially_deductible'
  | PendingReason
  | 'not_assessed'
  | 'no_loss'
  | 'not_applicable_equity';

export interface DefaultLossPayment {
  type: string;
  amount: number;
  date: string; // YYYY-MM-DD
}

export interface DefaultLossInput {
  /** IncomeModel de la inversión — si es 'equity', el motor no aplica (no es un crédito). */
  incomeModel: string;
  /** Capital invertido, en EUR. */
  amountInvested: number;
  /** Histórico completo de pagos de la inversión (para getPrincipalReturned). */
  payments: DefaultLossPayment[];
  /** Cuándo se rellenó el cuestionario. null = todavía no evaluado. */
  lossAssessedAt: string | null;
  insolvencyStatus: InsolvencyStatus | null;
  insolvencyConcludedDate: string | null; // YYYY-MM-DD, requerido si status = concluded_unpaid
  quitaAmount: number | null;
  quitaDate: string | null; // YYYY-MM-DD — van siempre juntos con quitaAmount
  enforcementStarted: boolean | null;
  enforcementDate: string | null; // YYYY-MM-DD
  enforcementInitiator: EnforcementInitiator | null;
}

export interface Imputation {
  amount: number;
  trigger: ImputationTrigger;
  triggerDate: string; // YYYY-MM-DD
  year: number;
}

export interface RecoveryGain {
  year: number;
  amount: number;
}

export interface DefaultLossResult {
  status: DefaultLossStatus;
  lossAmount: number;
  imputations: Imputation[];
  pendingAmount: number;
  pendingReason: PendingReason | null;
  deadlineDate: string | null;
  nextReviewDate: string | null;
  recoveryGains: RecoveryGain[];
  flags: { platformInitiatedEnforcement: boolean };
}

// ─── Helpers de fecha — todo en 'YYYY-MM-DD', sin conversiones de zona horaria.
// Las comparaciones son de string (el formato ISO ordena igual que las fechas),
// parseISO/format de date-fns solo se usan para la aritmética (sumar años/meses).
const yearOf = (dateStr: string): number => Number(dateStr.slice(0, 4));
const addYearsStr = (dateStr: string, years: number): string =>
  format(addYears(parseISO(dateStr), years), 'yyyy-MM-dd');
const addMonthsStr = (dateStr: string, months: number): string =>
  format(addMonths(parseISO(dateStr), months), 'yyyy-MM-dd');
const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

const EMPTY: Omit<DefaultLossResult, 'status'> = {
  lossAmount: 0,
  imputations: [],
  pendingAmount: 0,
  pendingReason: null,
  deadlineDate: null,
  nextReviewDate: null,
  recoveryGains: [],
  flags: { platformInitiatedEnforcement: false },
};

export function assessDefaultLoss(
  input: DefaultLossInput,
  today: Date = new Date(),
): DefaultLossResult {
  // 1. equity nunca es un crédito — no aplica, sin cuestionario.
  if (input.incomeModel === 'equity') {
    return { status: 'not_applicable_equity', ...EMPTY };
  }
  if (!input.lossAssessedAt) {
    return { status: 'not_assessed', ...EMPTY };
  }

  const todayStr = format(today, 'yyyy-MM-dd');

  // 2. firstTrigger = la fecha más temprana entre quita, conclusión del
  // concurso, y (inicio de ejecución + 1 año) SI ya se ha cumplido hoy.
  const candidates: string[] = [];
  if (input.quitaDate) candidates.push(input.quitaDate);
  if (input.insolvencyStatus === 'concluded_unpaid' && input.insolvencyConcludedDate) {
    candidates.push(input.insolvencyConcludedDate);
  }
  let enforcementOneYearDate: string | null = null;
  if (input.enforcementStarted && input.enforcementDate) {
    enforcementOneYearDate = addYearsStr(input.enforcementDate, 1);
    if (enforcementOneYearDate <= todayStr) candidates.push(enforcementOneYearDate);
  }
  const firstTrigger = candidates.length > 0 ? candidates.reduce((a, b) => (a < b ? a : b)) : null;

  // 3. Importe de la pérdida: capital invertido − principal devuelto antes del
  // primer hecho (o todo el histórico, si todavía no hay ningún hecho).
  const principalReturnedBefore = getPrincipalReturned(input.payments, firstTrigger ?? undefined);
  const rawLoss = input.amountInvested - principalReturnedBefore;
  if (rawLoss <= 0) {
    return { status: 'no_loss', ...EMPTY };
  }

  const imputations: Imputation[] = [];
  let remainder = rawLoss;

  // 4. Quita — siempre por su importe, tope el total de la pérdida.
  if (input.quitaAmount != null && input.quitaDate) {
    const part = Math.min(input.quitaAmount, remainder);
    imputations.push({
      amount: round2(part),
      trigger: 'quita',
      triggerDate: input.quitaDate,
      year: yearOf(input.quitaDate),
    });
    remainder -= part;
  }

  // 5. El resto — el concurso prevalece sobre la ejecución.
  let pendingReason: PendingReason | null = null;
  let deadlineDate: string | null = null;
  const flags = { platformInitiatedEnforcement: false };

  if (remainder > 0) {
    if (input.insolvencyStatus === 'concluded_unpaid' && input.insolvencyConcludedDate) {
      imputations.push({
        amount: round2(remainder),
        trigger: 'insolvency_concluded',
        triggerDate: input.insolvencyConcludedDate,
        year: yearOf(input.insolvencyConcludedDate),
      });
      remainder = 0;
    } else if (input.insolvencyStatus === 'open') {
      pendingReason = 'pending_insolvency';
    } else if (input.enforcementStarted && input.enforcementDate) {
      const oneYear = enforcementOneYearDate ?? addYearsStr(input.enforcementDate, 1);
      if (oneYear <= todayStr) {
        imputations.push({
          amount: round2(remainder),
          trigger: 'enforcement_one_year',
          triggerDate: oneYear,
          year: yearOf(oneYear),
        });
        flags.platformInitiatedEnforcement = input.enforcementInitiator === 'platform';
        remainder = 0;
      } else {
        pendingReason = 'pending_deadline';
        deadlineDate = oneYear;
      }
    } else if (input.insolvencyStatus === 'unknown') {
      pendingReason = 'unknown';
    } else {
      pendingReason = 'not_yet';
    }
  }

  let pendingAmount = remainder;

  // 7. Pagos de principal con fecha ≥ firstTrigger: primero reducen lo
  // pendiente; el exceso es ganancia patrimonial en el año del cobro.
  const recoveryGainsByYear = new Map<number, number>();
  if (firstTrigger) {
    const laterPrincipal = input.payments
      .filter((p) => p.type === 'principal' && p.date >= firstTrigger)
      .sort((a, b) => a.date.localeCompare(b.date));
    for (const p of laterPrincipal) {
      const applied = Math.min(p.amount, pendingAmount);
      pendingAmount -= applied;
      const excess = p.amount - applied;
      if (excess > 0) {
        const y = yearOf(p.date);
        recoveryGainsByYear.set(y, (recoveryGainsByYear.get(y) ?? 0) + excess);
      }
    }
  }
  const recoveryGains: RecoveryGain[] = Array.from(recoveryGainsByYear.entries())
    .sort(([a], [b]) => a - b)
    .map(([year, amount]) => ({ year, amount: round2(amount) }));

  // 6. status final — se calcula tras aplicar los pagos posteriores (paso 7)
  // para que siempre sea coherente con pendingAmount.
  let status: DefaultLossStatus;
  if (imputations.length > 0 && pendingAmount <= 0) {
    status = 'deductible';
  } else if (imputations.length > 0 && pendingAmount > 0) {
    status = 'partially_deductible';
  } else {
    status = pendingReason ?? 'not_yet';
  }

  const nextReviewDate =
    pendingReason === 'not_yet' || pendingReason === 'unknown' || pendingReason === 'pending_insolvency'
      ? addMonthsStr(todayStr, 3)
      : null;

  return {
    status,
    lossAmount: round2(rawLoss),
    imputations,
    pendingAmount: round2(Math.max(0, pendingAmount)),
    pendingReason,
    deadlineDate,
    nextReviewDate,
    recoveryGains,
    flags,
  };
}
