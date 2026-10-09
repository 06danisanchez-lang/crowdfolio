import { Investment } from '@/types/investment';

/** Qué ha pasado con el vencimiento: prórroga oficial o cobro que llega tarde. */
export type MaturityChangeKind = 'extended' | 'delayed';

/**
 * Cambios a guardar cuando el vencimiento se mueve a una fecha nueva.
 * - Guarda la fecha prometida al invertir (originalEndDate) la primera vez que se
 *   mueve hacia delante, para que el retraso no se pierda.
 * - Prórroga: el contrato sigue al mismo tipo hasta la nueva fecha (wasExtended).
 * - Retraso: se cobrará lo prometido, más tarde (wasExtended no cambia).
 * Ver getAccrualEndDate en calculations.ts.
 */
export function buildMaturityChange(
  investment: Pick<Investment, 'expectedEndDate' | 'originalEndDate' | 'wasExtended'>,
  newEndDate: string,
  kind: MaturityChangeKind,
): Pick<Partial<Investment>, 'expectedEndDate' | 'originalEndDate' | 'wasExtended'> {
  const promised = investment.originalEndDate || investment.expectedEndDate || null;
  const movesLater = !!promised && newEndDate > promised;
  return {
    expectedEndDate: newEndDate,
    originalEndDate: investment.originalEndDate || (movesLater ? promised : null),
    wasExtended: kind === 'extended' ? true : investment.wasExtended ?? false,
  };
}
