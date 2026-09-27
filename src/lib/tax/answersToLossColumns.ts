import type { InsolvencyStatus, EnforcementInitiator } from './defaultLoss';

/**
 * Respuestas del cuestionario de calificación fiscal (Fase 3). `null` cuando
 * la inversión es equity: no hay cuestionario, ver answersToLossColumns(null).
 */
export interface DefaultLossAnswers {
  insolvencyStatus: InsolvencyStatus;
  insolvencyConcludedDate: string | null; // solo si insolvencyStatus = 'concluded_unpaid'
  quitaAmount: number | null; // van siempre juntos con quitaDate
  quitaDate: string | null;
  enforcementStarted: boolean;
  enforcementDate: string | null; // solo si enforcementStarted
  enforcementInitiator: EnforcementInitiator | null; // solo si enforcementStarted
}

/** Forma exacta de las columnas loss_* de `investments`, en camelCase (como las mapea useInvestments.ts). */
export interface LossColumns {
  lossInsolvencyStatus: InsolvencyStatus | null;
  lossInsolvencyConcludedDate: string | null;
  lossQuitaAmount: number | null;
  lossQuitaDate: string | null;
  lossEnforcementStarted: boolean | null;
  lossEnforcementDate: string | null;
  lossEnforcementInitiator: EnforcementInitiator | null;
  lossAssessedAt: string;
  lossRulesVersion: number;
}

/**
 * Convierte las respuestas del cuestionario en las columnas loss_* a guardar.
 * `answers = null` es el caso equity: no hay cuestionario, todos los hechos
 * quedan a null pero se marca igualmente lossAssessedAt/lossRulesVersion, para
 * que la guarda de updateInvestment (isBlockedDefaultedTransition) valga para
 * todos los modelos de ingreso, no solo los que sí tienen preguntas.
 */
export function answersToLossColumns(
  answers: DefaultLossAnswers | null,
  now: Date = new Date(),
): LossColumns {
  const lossAssessedAt = now.toISOString();
  const lossRulesVersion = 1;

  if (!answers) {
    return {
      lossInsolvencyStatus: null,
      lossInsolvencyConcludedDate: null,
      lossQuitaAmount: null,
      lossQuitaDate: null,
      lossEnforcementStarted: null,
      lossEnforcementDate: null,
      lossEnforcementInitiator: null,
      lossAssessedAt,
      lossRulesVersion,
    };
  }

  return {
    lossInsolvencyStatus: answers.insolvencyStatus,
    lossInsolvencyConcludedDate:
      answers.insolvencyStatus === 'concluded_unpaid' ? answers.insolvencyConcludedDate : null,
    lossQuitaAmount: answers.quitaAmount,
    lossQuitaDate: answers.quitaDate,
    lossEnforcementStarted: answers.enforcementStarted,
    lossEnforcementDate: answers.enforcementStarted ? answers.enforcementDate : null,
    lossEnforcementInitiator: answers.enforcementStarted ? answers.enforcementInitiator : null,
    lossAssessedAt,
    lossRulesVersion,
  };
}
