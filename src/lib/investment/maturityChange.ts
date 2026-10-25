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

/** En el formulario de edición, además: «la fecha estaba mal» (no es ni prórroga ni retraso). */
export type FormMaturityKind = MaturityChangeKind | 'correction';

type MaturityUpdate = Pick<Partial<Investment>, 'originalEndDate' | 'interestEndDate' | 'wasExtended'>;

/** Prórroga o retraso según lo que ya tiene guardado la inversión (por defecto, retraso). */
export function deriveMaturityKind(investment: Pick<Investment, 'interestEndDate' | 'wasExtended'> | null | undefined): MaturityChangeKind {
  if (investment?.interestEndDate) return 'delayed';
  if (investment?.wasExtended) return 'extended';
  return 'delayed';
}

function fromPromised(promised: string, kind: MaturityChangeKind): MaturityUpdate {
  return kind === 'extended'
    ? { originalEndDate: promised, interestEndDate: null, wasExtended: true }
    : { originalEndDate: promised, interestEndDate: promised, wasExtended: false };
}

/**
 * Campos de vencimiento a guardar desde el formulario de alta o de edición, que
 * tiene dos fechas: el vencimiento actual y el prometido al invertir (opcional).
 *
 * - Alta: si el prometido es anterior al actual, la inversión ya llega movida
 *   (prórroga o retraso según `kind`; si el usuario no lo sabe, retraso: no se
 *   suponen intereses extra).
 * - Edición, el usuario cambia el prometido: es una corrección; se guarda tal cual
 *   (vacío o no anterior al actual = sin retraso).
 * - Edición, mueve el vencimiento actual hacia delante sin tocar el prometido:
 *   igual que el botón «Prorrogar» (buildMaturityChange), así no se pierde la fecha
 *   original.
 * - Edición, mueve el vencimiento actual y dice que la fecha estaba mal
 *   ('correction'): solo cambia la fecha; no se guarda ningún retraso.
 * - Edición, solo cambia prórroga ↔ retraso: se aplica sobre el prometido guardado.
 * Devuelve solo lo que cambia ({} si nada).
 */
export function buildMaturityFromForm(
  previous: MaturityFields | null,
  input: { expectedEndDate?: string; promisedEndDate?: string; kind: FormMaturityKind },
): MaturityUpdate {
  const isCorrection = input.kind === 'correction';
  const kind: MaturityChangeKind = input.kind === 'correction' ? 'delayed' : input.kind;
  const expected = input.expectedEndDate || null;
  const rawPromised = input.promisedEndDate || null;
  const promised = rawPromised && expected && rawPromised < expected ? rawPromised : null;

  if (!previous) return promised ? fromPromised(promised, kind) : {};

  const prevPromised = previous.originalEndDate || null;
  const prevExpected = previous.expectedEndDate || null;

  if (rawPromised !== prevPromised) {
    return promised
      ? fromPromised(promised, kind)
      : { originalEndDate: null, interestEndDate: null, wasExtended: false };
  }

  if (isCorrection) return {};

  if (expected && prevExpected && expected > prevExpected) {
    const { expectedEndDate: _ignored, ...rest } = buildMaturityChange(previous, expected, kind);
    void _ignored;
    return rest;
  }

  if (prevPromised && kind !== deriveMaturityKind(previous)) {
    return fromPromised(prevPromised, kind);
  }
  return {};
}
