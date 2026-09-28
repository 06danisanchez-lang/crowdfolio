import type { EquityType, IncomeModel, Investment, InvestmentStatus } from '@/types/investment';

/**
 * Impide marcar una inversión como 'defaulted' sin haber completado el
 * cuestionario de calificación fiscal (art. 14.2.k LIRPF, Fase 3) en la
 * misma actualización: toda transición a 'defaulted' debe traer
 * `lossAssessedAt` en el mismo `updates` (lo pone answersToLossColumns,
 * incluida la rama equity). No bloquea editar una inversión que YA está en
 * 'defaulted' — incluidas las marcadas antes de la Fase 3, sin
 * loss_assessed_at, que deben poder seguir editándose con normalidad.
 */
export function isBlockedDefaultedTransition(
  currentStatus: InvestmentStatus | undefined,
  updates: Partial<Investment>,
): boolean {
  return (
    updates.status === 'defaulted' &&
    currentStatus !== 'defaulted' &&
    updates.lossAssessedAt === undefined
  );
}

const normalize = <T>(v: T | null | undefined): T | null => v ?? null;

/**
 * Impide cambiar incomeModel/equityType de una inversión que YA está en
 * 'defaulted' (antes de esta actualización): assessDefaultLoss califica la
 * pérdida de forma completamente distinta según el modelo (equity nunca se
 * evalúa, el resto sí), así que cambiarlo dejaría huérfano el cuestionario
 * fiscal ya respondido (loss_*) sin ningún aviso. No bloquea reenviar el
 * MISMO valor (p.ej. "Deshacer impago" reenvía incomeModel sin cambiarlo
 * para forzar la regeneración del calendario, ver InvestmentDetail.tsx) ni
 * afecta a inversiones que no estaban ya en 'defaulted'.
 */
export function isBlockedIncomeModelChange(
  current: { status?: InvestmentStatus; incomeModel?: IncomeModel; equityType?: EquityType | null } | undefined,
  updates: Partial<Investment>,
): boolean {
  if (current?.status !== 'defaulted') return false;

  const incomeModelChanged =
    updates.incomeModel !== undefined && normalize(updates.incomeModel) !== normalize(current.incomeModel);
  const equityTypeChanged =
    updates.equityType !== undefined && normalize(updates.equityType) !== normalize(current.equityType);

  return incomeModelChanged || equityTypeChanged;
}
