/**
 * Lectura de una hoja de cálculo cualquiera (la del usuario, no la nuestra):
 * dónde está la fila de cabeceras, qué columna es cada dato y cómo se pasan
 * las filas a `RawRow` (ver importRows.ts, que decide qué datos son claros).
 *
 * Reglas:
 *  - Las columnas se reconocen por su título, con una lista amplia de
 *    sinónimos en español e inglés. El usuario puede corregir la propuesta
 *    antes de importar: aquí solo se sugiere.
 *  - Una columna que no se reconoce se ignora. Nunca se deduce un dato a partir
 *    del contenido de una columna sin título reconocible.
 */

export type ImportField =
  | 'platform'
  | 'projectName'
  | 'amount'
  | 'currency'
  | 'investmentDate'
  | 'expectedEndDate'
  | 'originalEndDate'
  | 'termMonths'
  | 'expectedReturn'
  | 'incomeModel'
  | 'paymentFrequency'
  | 'principalReturnType'
  | 'status'
  | 'notes';

/** Una celda por columna; null = la columna no se importa. */
export type ColumnMapping<F extends string = ImportField> = (F | null)[];

export type Grid = string[][];

export interface FieldDef<F extends string = ImportField> {
  field: F;
  label: string;
  /** Títulos de columna que significan este dato (ya normalizados). */
  synonyms: string[];
  /** Si el título contiene alguna de estas palabras, NO es este dato. */
  exclude?: string[];
}

export const IMPORT_FIELDS: FieldDef<ImportField>[] = [
  {
    field: 'platform',
    label: 'Plataforma',
    synonyms: ['plataforma', 'platform', 'portal', 'plataforma de inversion'],
  },
  {
    field: 'projectName',
    label: 'Nombre del proyecto',
    synonyms: [
      'proyecto', 'nombre', 'nombre proyecto', 'nombre del proyecto', 'project', 'project name',
      'oportunidad', 'prestamo', 'inmueble', 'activo', 'operacion', 'promocion', 'descripcion',
      'nombre de la inversion', 'inversion nombre', 'loan', 'name',
    ],
    exclude: ['plataforma', 'promotor'],
  },
  {
    field: 'amount',
    label: 'Importe invertido',
    synonyms: [
      'importe', 'importe invertido', 'monto', 'cantidad', 'cantidad invertida', 'inversion',
      'invertido', 'capital', 'capital invertido', 'nominal', 'amount', 'invested', 'amount invested',
      'aportacion', 'importe inversion', 'importe de la inversion', 'total invertido', 'participacion',
    ],
    exclude: [
      'pendiente', 'devuelto', 'cobrado', 'recibido', 'amortizado', 'interes', 'intereses',
      'beneficio', 'ganancia', 'rentab', 'fecha', 'objetivo', 'proyecto total', 'minimo', 'retencion',
      'plataforma', 'nombre', 'tipo',
    ],
  },
  {
    field: 'currency',
    label: 'Divisa',
    synonyms: ['divisa', 'moneda', 'currency'],
  },
  {
    field: 'investmentDate',
    label: 'Fecha de inversión',
    synonyms: [
      'fecha', 'fecha inversion', 'fecha de inversion', 'fecha compra', 'fecha de compra', 'fecha alta',
      'fecha inicio', 'inicio', 'fecha de inicio', 'fecha suscripcion', 'fecha firma', 'date',
      'investment date', 'fecha invertido', 'fecha aportacion', 'f inversion', 'f compra', 'f alta',
      'f inicio', 'fecha inv', 'f inv',
    ],
    exclude: ['venc', 'fin', 'cobro', 'pago', 'devol', 'salida', 'prevista', 'estimad', 'prometid', 'cierre', 'maturity', 'end'],
  },
  {
    field: 'expectedEndDate',
    label: 'Fecha de vencimiento',
    synonyms: [
      'vencimiento', 'fecha vencimiento', 'fecha de vencimiento', 'fecha fin', 'fin', 'fecha de fin',
      'fecha finalizacion', 'fecha devolucion', 'maturity', 'maturity date', 'end date', 'fecha salida',
      'salida estimada', 'fecha estimada de salida', 'vencimiento estimado', 'fecha prevista de devolucion',
      'f vencimiento', 'f venc', 'fecha venc', 'venc', 'f fin',
    ],
    exclude: ['prometid', 'original', 'plazo', 'meses', 'dias'],
  },
  {
    field: 'originalEndDate',
    label: 'Vencimiento prometido (si se ha retrasado)',
    synonyms: ['vencimiento prometido', 'fecha vencimiento prometido', 'vencimiento original', 'fecha original'],
  },
  {
    field: 'termMonths',
    label: 'Plazo en meses',
    synonyms: ['plazo', 'plazo meses', 'duracion', 'duracion meses', 'meses', 'term', 'plazo en meses', 'plazo estimado'],
    exclude: ['dia', 'dias', 'ano', 'anos', 'year', 'days', 'fecha'],
  },
  {
    field: 'expectedReturn',
    label: 'Rentabilidad anual (%)',
    synonyms: [
      'rentabilidad', 'rentabilidad anual', 'rentabilidad esperada', 'rentabilidad anual esperada',
      'rendimiento esperado', 'rendimiento', 'interes', 'interes anual', 'tipo de interes', 'tipo interes',
      'tir', 'tae', 'tin', 'interest rate', 'return', 'yield', 'rentabilidad estimada', 'rentabilidad objetivo',
      'rentabilidad anual estimada', 'rentabilidad prevista',
    ],
    exclude: ['total', 'cobrad', 'recibid', 'importe', 'eur', 'real', 'acumulad'],
  },
  {
    field: 'incomeModel',
    label: 'Tipo de rendimiento',
    synonyms: [
      'tipo', 'tipo de rendimiento', 'modelo', 'modelo de rendimiento', 'modelo rendimiento',
      'tipo inversion', 'tipo de inversion', 'tipo de producto', 'producto', 'modalidad', 'income model',
      'incomemodel', 'tipologia',
    ],
    exclude: ['interes', 'inmueble', 'activo', 'devolucion', 'principal'],
  },
  {
    field: 'paymentFrequency',
    label: 'Frecuencia de cobro',
    synonyms: [
      'frecuencia', 'frecuencia de pago', 'frecuencia pago', 'frecuencia de cobro', 'periodicidad',
      'pago de intereses', 'pago intereses', 'cobro intereses', 'cobro de intereses', 'frecuencia intereses', 'paymentfrequency', 'payment frequency',
    ],
  },
  {
    field: 'principalReturnType',
    label: 'Devolución del capital',
    synonyms: [
      'devolucion capital', 'devolucion del capital', 'tipo devolucion principal', 'principalreturntype',
      'devolucion principal',
    ],
  },
  {
    field: 'status',
    label: 'Estado (activa, finalizada…)',
    synonyms: ['estado', 'situacion', 'status', 'estado de la inversion', 'estado inversion', 'estado del proyecto'],
    exclude: ['fecha'],
  },
  {
    field: 'notes',
    label: 'Notas',
    synonyms: ['notas', 'nota', 'comentarios', 'comentario', 'observaciones', 'notes'],
  },
];

export const FIELD_LABEL: Record<ImportField, string> = Object.fromEntries(
  IMPORT_FIELDS.map(f => [f.field, f.label]),
) as Record<ImportField, string>;

/** minúsculas, sin tildes, sin signos: "Fecha de Inversión (dd/mm)" → "fecha de inversion dd mm". */
export function normalizeText(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function containsWords(haystack: string, needle: string): boolean {
  return ` ${haystack} `.includes(` ${needle} `);
}

/** Puntuación de un título para un dato: 0 = no es ese dato. */
function scoreHeader<F extends string>(header: string, def: FieldDef<F>): number {
  const h = normalizeText(header);
  if (!h) return 0;
  if (def.exclude?.some(x => h.includes(x)) && !def.synonyms.includes(h)) return 0;
  let best = 0;
  for (const syn of def.synonyms) {
    if (h === syn) return 1000 + syn.length;
    if (containsWords(h, syn)) best = Math.max(best, syn.length);
  }
  return best;
}

/**
 * Propone qué dato es cada columna. Cada dato se asigna como mucho a una
 * columna (la de título más parecido).
 */
export function guessMapping<F extends string = ImportField>(
  headers: string[],
  defs: FieldDef<F>[] = IMPORT_FIELDS as unknown as FieldDef<F>[],
): ColumnMapping<F> {
  const best: { field: F | null; score: number }[] = headers.map(h => {
    let top: { field: F | null; score: number } = { field: null, score: 0 };
    for (const def of defs) {
      const score = scoreHeader(h, def);
      if (score > top.score) top = { field: def.field, score };
    }
    return top;
  });

  const mapping: ColumnMapping<F> = headers.map(() => null);
  const taken = new Map<F, number>();
  best.forEach(({ field, score }, col) => {
    if (score === 0 || field === null) return;
    const other = taken.get(field);
    if (other === undefined) {
      taken.set(field, col);
      mapping[col] = field;
    } else if (score > best[other].score) {
      mapping[other] = null;
      taken.set(field, col);
      mapping[col] = field;
    }
  });
  return mapping;
}

function countRecognized<F extends string>(row: string[], defs: FieldDef<F>[]): number {
  return guessMapping(row, defs).filter(Boolean).length;
}

/**
 * Fila de cabeceras: entre las 20 primeras, la que tiene más títulos
 * reconocibles (muchos Excel llevan un título o el logo de la plataforma
 * encima de la tabla). Si ninguna tiene al menos dos, la primera no vacía.
 */
export function detectHeaderRow<F extends string = ImportField>(
  grid: Grid,
  defs: FieldDef<F>[] = IMPORT_FIELDS as unknown as FieldDef<F>[],
): number {
  let bestRow = -1;
  let bestScore = 1;
  for (let r = 0; r < Math.min(grid.length, 20); r++) {
    const score = countRecognized(grid[r], defs);
    if (score > bestScore) { bestScore = score; bestRow = r; }
  }
  if (bestRow >= 0) return bestRow;
  const firstNonEmpty = grid.findIndex(row => row.some(c => c.trim()));
  return firstNonEmpty >= 0 ? firstNonEmpty : 0;
}

export interface SheetRow {
  /** Número de fila tal como lo ve el usuario en Excel (1 = primera). */
  rowNumber: number;
  raw: Record<string, string>;
}

// Solo la celda entera: «Total Living» es un nombre de proyecto válido.
const TOTAL_ROW = /^(total|totales|suma|subtotal|total general|total invertido|total cartera)$/;

/** Filas de datos (bajo la cabecera) con los datos que el usuario ha asignado. */
export function gridToRows<F extends string>(grid: Grid, headerRow: number, mapping: ColumnMapping<F>): SheetRow[] {
  const rows: SheetRow[] = [];
  for (let r = headerRow + 1; r < grid.length; r++) {
    const cells = grid[r];
    const raw: Record<string, string> = {};
    mapping.forEach((field, col) => {
      if (field) raw[field] = (cells[col] ?? '').trim();
    });
    const values = Object.values(raw).filter(Boolean);
    if (values.length === 0) continue;
    // Filas de totales al pie de la tabla.
    const firstCell = normalizeText(cells.find(c => c.trim()) ?? '');
    const nameCell = normalizeText(raw.projectName ?? '');
    if (TOTAL_ROW.test(firstCell) || TOTAL_ROW.test(nameCell)) continue;
    rows.push({ rowNumber: r + 1, raw });
  }
  return rows;
}

// ─── CSV ──────────────────────────────────────────────────────────────────────

/**
 * Bytes de un CSV → texto. Excel en español guarda los CSV en Windows-1252,
 * no en UTF-8: leído como UTF-8, «Inversión» sale «Inversi�n» y ni las
 * cabeceras ni los nombres de proyecto se leen bien.
 */
export function decodeCsvBytes(bytes: ArrayBuffer): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder('windows-1252').decode(bytes);
  }
}

/** Separador: el Excel en español guarda los CSV con «;». */
function detectDelimiter(text: string): string {
  const firstLines = text.split(/\r?\n/).slice(0, 10).join('\n');
  const counts = [';', ',', '\t'].map(d => ({ d, n: firstLines.split(d).length - 1 }));
  counts.sort((a, b) => b.n - a.n);
  return counts[0].n > 0 ? counts[0].d : ',';
}

/** CSV → filas de celdas. Admite comillas, comillas dobles escapadas y saltos de línea dentro de comillas. */
export function parseCsvGrid(text: string): Grid {
  const src = text.replace(/^\uFEFF/, '');
  const delimiter = detectDelimiter(src);
  const grid: Grid = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') { cell += '"'; i++; }
        else inQuotes = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      row.push(cell.trim()); cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(cell.trim()); cell = '';
      grid.push(row); row = [];
    } else {
      cell += ch;
    }
  }
  if (cell !== '' || row.length > 0) { row.push(cell.trim()); grid.push(row); }
  return grid.filter(r => r.some(c => c !== ''));
}
