import type { Investment } from '@/types/investment';
import { assessDefaultLoss, type DefaultLossStatus, type ImputationTrigger, type PendingReason } from './defaultLoss';
import { investmentToDefaultLossInput } from './investmentToDefaultLossInput';
import { getPlatformLabel } from '@/lib/labels';

export interface DefaultLossImputationRow {
  investmentId: string;
  projectName: string;
  platform: string;
  amountInvested: number;
  /** Capital recuperado ANTES del primer hecho imputable — el mismo que usa
   * el motor para calcular `loss` (amountInvested − esto = loss). NO es el
   * histórico completo: lo recuperado DESPUÉS del primer hecho ya sale en
   * `recoveryGains` (es ganancia patrimonial, no reduce esta pérdida). */
  amountRecoveredBeforeTrigger: number;
  /** Pérdida TOTAL de la inversión (result.lossAmount) — igual en todas las
   * filas de una misma inversión si tiene más de una imputación; lo que
   * corresponde a ESTE hecho/año está en `amount`. */
  loss: number;
  status: DefaultLossStatus;
  trigger: ImputationTrigger;
  triggerDate: string;
  year: number;
  /** Importe imputable de este hecho concreto. */
  amount: number;
  platformInitiatedEnforcement: boolean;
  /** Las DEMÁS imputaciones de esta misma inversión (excluida esta fila) —
   * p.ej. una inversión con quita en 2025 y concurso concluido en 2027 lista,
   * en la fila de 2025, la imputación de 2027 aquí, y viceversa. Vacío si
   * esta es la única imputación de la inversión. */
  otherImputations: { amount: number; year: number }[];
}

export interface DefaultLossRecoveryRow {
  investmentId: string;
  projectName: string;
  platform: string;
  /** Ejercicio del cobro (en el que se declara la ganancia patrimonial). */
  year: number;
  /** Ejercicio en el que esta pérdida ya era declarable. */
  lossYear: number;
  amount: number;
}

export interface DefaultLossPendingRow {
  investmentId: string;
  projectName: string;
  platform: string;
  pendingAmount: number;
  pendingReason: PendingReason;
  deadlineDate: string | null;
}

export interface DefaultLossExcludedRow {
  investmentId: string;
  projectName: string;
}

export interface DefaultLossYearSummary {
  year: number;
  declarable: { totalAmount: number; rows: DefaultLossImputationRow[] };
  recoveryGains: { totalAmount: number; rows: DefaultLossRecoveryRow[] };
  pending: DefaultLossPendingRow[];
  notAssessed: DefaultLossExcludedRow[];
  equityExcluded: DefaultLossExcludedRow[];
}

const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * Agrega el resultado de assessDefaultLoss (art. 14.2.k LIRPF) de todas las
 * inversiones en impago del usuario, para un ejercicio dado (Fase 5). Función
 * pura, sin React ni Supabase — useTaxSummary.ts solo le pasa Investment[] ya
 * cargadas y construye el resto (TaxBucketsCard/TaxExportButton) a partir de
 * su resultado, así el contenido es idéntico en pantalla y en las
 * exportaciones.
 *
 * `today` es SIEMPRE la fecha real (nunca "como si fuera el 31/12/{year}"):
 * los hechos imputables (imputations[].year, recoveryGains[].year) son
 * fechas ya fijadas en la BD, y lo que hace este cálculo es filtrar por
 * `.year === year` el resultado de evaluar esos hechos con el conocimiento
 * de HOY — así una inversión con una quita en 2025 y el concurso concluido
 * en 2027 aparece con una parte en cada ejercicio en una sola pasada.
 *
 * pending NO se filtra por año: es la foto del estado actual (igual que la
 * ficha individual), se muestra junto al ejercicio seleccionado sin más.
 *
 * lossYear de una recuperación = el año de la imputación MÁS TEMPRANA de esa
 * inversión (= el año de firstTrigger en defaultLoss.ts): es el ejercicio en
 * el que la pérdida empezó a ser declarable, que es la fecha desde la que se
 * cuentan los pagos que reducen pendingAmount (paso 7) — no el de la última
 * imputación, que solo marca cuándo pendingAmount llegó a 0.
 */
export function computeDefaultLossSummary(
  investments: Investment[],
  year: number,
  today: Date = new Date(),
): DefaultLossYearSummary {
  const declarableRows: DefaultLossImputationRow[] = [];
  const recoveryRows: DefaultLossRecoveryRow[] = [];
  const pending: DefaultLossPendingRow[] = [];
  const notAssessed: DefaultLossExcludedRow[] = [];
  const equityExcluded: DefaultLossExcludedRow[] = [];

  const defaultedInvestments = investments.filter((inv) => inv.status === 'defaulted');

  for (const inv of defaultedInvestments) {
    const result = assessDefaultLoss(investmentToDefaultLossInput(inv), today);

    if (result.status === 'not_applicable_equity') {
      equityExcluded.push({ investmentId: inv.id, projectName: inv.projectName });
      continue;
    }
    if (result.status === 'not_assessed') {
      notAssessed.push({ investmentId: inv.id, projectName: inv.projectName });
      continue;
    }

    const platform = getPlatformLabel(inv.platform, inv.customPlatformName);
    // El motor no expone principalReturnedBefore directamente, pero
    // lossAmount = amountInvested − principalReturnedBefore siempre que haya
    // pérdida (si no, no llegamos aquí: imputations solo existe con
    // rawLoss > 0) — se deriva así en vez de recalcularlo aparte.
    const amountRecoveredBeforeTrigger = round2(inv.amount - result.lossAmount);

    for (const imp of result.imputations) {
      if (imp.year !== year) continue;
      declarableRows.push({
        investmentId: inv.id,
        projectName: inv.projectName,
        platform,
        amountInvested: inv.amount,
        amountRecoveredBeforeTrigger,
        loss: result.lossAmount,
        status: result.status,
        trigger: imp.trigger,
        triggerDate: imp.triggerDate,
        year: imp.year,
        amount: imp.amount,
        platformInitiatedEnforcement: result.flags.platformInitiatedEnforcement,
        otherImputations: result.imputations
          .filter((other) => other !== imp)
          .map((other) => ({ amount: other.amount, year: other.year })),
      });
    }

    if (result.recoveryGains.length > 0) {
      const lossYear = Math.min(...result.imputations.map((imp) => imp.year));
      for (const gain of result.recoveryGains) {
        if (gain.year !== year) continue;
        recoveryRows.push({
          investmentId: inv.id,
          projectName: inv.projectName,
          platform,
          year: gain.year,
          lossYear,
          amount: gain.amount,
        });
      }
    }

    if (result.pendingAmount > 0 && result.pendingReason) {
      pending.push({
        investmentId: inv.id,
        projectName: inv.projectName,
        platform,
        pendingAmount: result.pendingAmount,
        pendingReason: result.pendingReason,
        deadlineDate: result.deadlineDate,
      });
    }
  }

  return {
    year,
    declarable: {
      totalAmount: round2(declarableRows.reduce((sum, r) => sum + r.amount, 0)),
      rows: declarableRows,
    },
    recoveryGains: {
      totalAmount: round2(recoveryRows.reduce((sum, r) => sum + r.amount, 0)),
      rows: recoveryRows,
    },
    pending,
    notAssessed,
    equityExcluded,
  };
}
