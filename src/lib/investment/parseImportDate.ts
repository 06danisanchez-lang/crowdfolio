import { toDateOnlyString } from '@/lib/dateOnly';

/**
 * Convierte una fecha de un archivo importado (CSV/XLSX/JSON) a 'YYYY-MM-DD'
 * sin cambiarle el día. Devuelve null si no se reconoce: nunca adivina.
 *
 * Formatos aceptados:
 *  - 'YYYY-MM-DD' (lo que exporta Crowdfolio): se guarda tal cual.
 *  - 'DD/MM/YYYY', 'DD-MM-YYYY', 'DD.MM.YYYY' (formato español; el día va
 *    primero, nunca se interpreta como mes/día a la americana).
 *  - Fecha y hora ISO con zona ('2023-12-31T23:00:00.000Z', exportaciones
 *    antiguas que guardaban la medianoche local en UTC): se toma el día en
 *    hora local, que es el que eligió el usuario.
 *
 * Antes se usaba `new Date(texto).toISOString()`, que interpreta '01/02/2024'
 * como 2 de enero (formato de EE. UU.), deja sin fecha '13/01/2024' y, al
 * pasar a UTC, guarda el día anterior.
 */
export function parseImportDate(raw: string | null | undefined): string | null {
  const s = (raw ?? '').trim();
  if (!s) return null;

  let y: number, m: number, d: number;
  let match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  if (match) {
    [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  } else if ((match = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(s))) {
    [d, m, y] = [Number(match[1]), Number(match[2]), Number(match[3])];
  } else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})$/.test(s)) {
    const instant = new Date(s);
    return isNaN(instant.getTime()) ? null : toDateOnlyString(instant);
  } else {
    return null;
  }

  // Validar que el día existe (31/02 no es una fecha).
  const check = new Date(y, m - 1, d);
  if (check.getFullYear() !== y || check.getMonth() !== m - 1 || check.getDate() !== d) return null;
  if (y < 1900 || y > 2200) return null;
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
