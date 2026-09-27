import type { Investment, InvestmentStatus } from '@/types/investment';

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
