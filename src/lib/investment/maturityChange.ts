import { Investment } from '@/types/investment';
import { getAccrualEndDate } from './calculations';

/** Qué ha pasado con el vencimiento: prórroga oficial o cobro que llega tarde. */
export type MaturityChangeKind = 'extended' | 'delayed';

type MaturityFields = Pick<Investment, 'expectedEndDate' | 'originalEndDate' | 'interestEndDate' | 'wasExtended'>;

/**
 * Cambios a guardar cuando el vencimiento se mueve a una fecha nueva.
 * - La primera vez que se mueve hacia delante guarda la fecha prometida al
 *   invertir (originalEndDate), para que el retraso no se pierda.
 * - Prórroga: el contrato sigue al mismo tipo hasta la nueva fecha
 *   (interestEndDate vacío, wasExtended para la etiqueta).
 * - Retraso: cobrará lo prometido, más tarde. Los intereses se quedan donde
 *   acababan antes de este cambio (interestEndDate), aunque hubiera prórrogas
 *   anteriores.
 * - Mover la fecha hacia atrás es una corrección: solo cambia la fecha.
 * Solo devuelve los campos que cambian (una columna que no se manda no puede
 * romper el guardado).
 */
export function buildMaturityChange(
  investment: MaturityFields,
  newEndDate: string,
  kind: MaturityChangeKind,
): Pick<Partial<Investment>, 'expectedEndDate' | 'originalEndDate' | 'interestEndDate' | 'wasExtended'> {
  const changes: Pick<Partial<Investment>, 'expectedEndDate' | 'originalEndDate' | 'interestEndDate' | 'wasExtended'> = {
    expectedEndDate: newEndDate,
  };
  const current = investment.expectedEndDate || null;
  if (!current || newEndDate <= current) return changes;

  if (!investment.originalEndDate) changes.originalEndDate = current;

  if (kind === 'extended') {
    if (investment.interestEndDate) changes.interestEndDate = null;
    if (!investment.wasExtended) changes.wasExtended = true;
  } else if (!investment.interestEndDate) {
    changes.interestEndDate = getAccrualEndDate(investment) ?? current;
  }
  return changes;
}
