/**
 * Parseo y formateo de números en el formato español que usan los campos
 * numéricos de InvestmentForm (Monto, Rentabilidad Anual): el punto separa
 * los miles y la coma los decimales — justo al revés que en formato inglés,
 * y por eso un input type="number" nativo (que solo entiende punto decimal)
 * no vale aquí.
 */

export interface ParsedSpanishNumber {
  /** null = entrada vacía (no es un error). */
  value: number | null;
  /** Presente solo si la entrada no se pudo interpretar con confianza. */
  error?: string;
}

const FORMAT_HINT = 'ej. 1.500,50';

/**
 * Interpreta `raw` como un número en formato español.
 *
 * Reglas:
 * - El punto es separador de miles: solo es válido si agrupa en bloques de
 *   exactamente 3 dígitos desde la derecha (p.ej. "1.500", "10.000",
 *   "1.500.000"). "1.500" son MIL QUINIENTOS, nunca 1,5.
 * - La coma es el separador decimal, y solo puede haber una.
 * - Un único punto seguido de 1-2 dígitos (p.ej. "9.5") no puede ser una
 *   agrupación de miles válida (le faltan dígitos para completar el grupo de
 *   3) — se interpreta como si esos dígitos fueran los decimales, igual que
 *   si el usuario hubiera escrito la coma por error en formato inglés.
 * - Cualquier otra combinación ambigua o inválida (coma antes que punto,
 *   más de una coma, puntos que no agrupan de 3 en 3, letras, etc.) es un
 *   error explícito — nunca se adivina un valor distinto al escrito.
 */
export function parseSpanishNumber(raw: string): ParsedSpanishNumber {
  const trimmed = raw.trim();
  if (trimmed === '') return { value: null };

  if (!/^[0-9.,]+$/.test(trimmed)) {
    return { value: null, error: `No se reconoce como un número (${FORMAT_HINT})` };
  }

  const commaCount = (trimmed.match(/,/g) || []).length;
  if (commaCount > 1) {
    return { value: null, error: 'Solo puede haber una coma decimal' };
  }

  const firstComma = trimmed.indexOf(',');
  const firstDot = trimmed.indexOf('.');
  if (firstComma !== -1 && firstDot !== -1 && firstComma < firstDot) {
    return {
      value: null,
      error: `Formato no reconocido: en España el punto separa los miles y la coma los decimales (${FORMAT_HINT})`,
    };
  }

  let integerPart: string;
  let decimalPart: string | null = null;

  if (commaCount === 1) {
    integerPart = trimmed.slice(0, firstComma);
    decimalPart = trimmed.slice(firstComma + 1);
    if (decimalPart === '') {
      return { value: null, error: 'Falta la parte decimal después de la coma' };
    }
  } else {
    integerPart = trimmed;
  }

  if (integerPart.includes('.')) {
    const groups = integerPart.split('.');
    const validGrouping =
      groups.every((g) => g.length > 0) &&
      groups[0].length >= 1 && groups[0].length <= 3 &&
      groups.slice(1).every((g) => g.length === 3);

    if (validGrouping) {
      integerPart = groups.join('');
    } else if (decimalPart === null && groups.length === 2 && groups[1].length >= 1 && groups[1].length <= 2) {
      // Un solo punto con 1-2 dígitos detrás no puede ser una agrupación de
      // miles válida: se interpreta como decimal.
      integerPart = groups[0];
      decimalPart = groups[1];
    } else {
      return { value: null, error: `No se reconoce como un número en formato español (${FORMAT_HINT})` };
    }
  }

  if (
    integerPart === '' ||
    !/^[0-9]+$/.test(integerPart) ||
    (decimalPart != null && !/^[0-9]+$/.test(decimalPart))
  ) {
    return { value: null, error: `No se reconoce como un número en formato español (${FORMAT_HINT})` };
  }

  const numeric = Number(decimalPart != null ? `${integerPart}.${decimalPart}` : integerPart);
  return { value: numeric };
}

/**
 * Formatea un número al estilo español para mostrarlo al perder el foco
 * (punto de millares cada 3 dígitos, coma decimal). No se usa
 * `toLocaleString('es-ES')` porque los datos CLDR de Node no agrupan los
 * miles por debajo de 5 dígitos (1500 → "1500", no "1.500") — aquí se
 * agrupa siempre, sea cual sea la magnitud.
 */
export function formatSpanishNumber(value: number, decimals = 2): string {
  const [intPart, decPart] = value.toFixed(decimals).split('.');
  const withThousands = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return decPart ? `${withThousands},${decPart}` : withThousands;
}
