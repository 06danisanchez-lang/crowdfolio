import { PLATFORMS, Platform, PaymentType } from '@/types/investment';
import { FieldDef, normalizeText, SheetRow } from '@/lib/investment/importSheet';
import { DateOrder, matchPlatform, parseImportNumber, parseLooseDate } from '@/lib/investment/importRows';
import { isWithholdingApplicable, SPANISH_WITHHOLDING_RATE } from '@/lib/tax/withholding';
import { isForeignCurrency } from '@/lib/currency/fx';

/**
 * Importar cobros ya recibidos desde un Excel o CSV (el extracto de
 * movimientos de la plataforma o el control propio del usuario).
 *
 * Esto va al informe del IRPF, así que las reglas son estrictas:
 *  - Cada cobro se guarda en BRUTO, con la retención aparte.
 *  - El tipo (intereses, capital, dividendo, prima de emisión) solo se pone si
 *    el concepto lo dice claramente; si no, el usuario lo elige o no se importa.
 *  - Si el archivo no trae la retención, el usuario dice si los importes son
 *    brutos o netos; solo entonces se calcula el 19 % y queda anotado para
 *    cotejarlo con el certificado de la plataforma.
 *  - Nunca se crea una inversión desde un cobro, ni se cierra ninguna, ni se
 *    registra un impago: eso va por sus flujos (con su cuestionario fiscal).
 *  - Las ganancias patrimoniales (venta, liquidación) no se importan: van por
 *    el cierre de la inversión.
 */

// ─── Columnas ─────────────────────────────────────────────────────────────────

export type PaymentImportField =
  | 'date'
  | 'projectName'
  | 'platform'
  | 'amount'
  | 'concept'
  | 'interestAmount'
  | 'principalAmount'
  | 'withholding'
  | 'currency'
  | 'notes';

export const PAYMENT_IMPORT_FIELDS: FieldDef<PaymentImportField>[] = [
  {
    field: 'date',
    label: 'Fecha del cobro',
    synonyms: [
      'fecha', 'fecha de pago', 'fecha pago', 'fecha cobro', 'fecha de cobro', 'fecha valor', 'fecha operacion',
      'fecha movimiento', 'fecha del movimiento', 'date', 'fecha liquidacion', 'payment date', 'f valor', 'f operacion',
    ],
    exclude: ['inversion', 'venc', 'alta', 'inicio'],
  },
  {
    field: 'projectName',
    label: 'Proyecto',
    synonyms: [
      'proyecto', 'nombre proyecto', 'nombre del proyecto', 'inversion', 'prestamo', 'oportunidad', 'nombre',
      'project', 'loan', 'activo', 'inmueble', 'promocion', 'project name', 'loan id',
    ],
    exclude: ['importe', 'fecha', 'plataforma', 'concepto', 'tipo', 'retencion', 'cantidad'],
  },
  {
    field: 'platform',
    label: 'Plataforma',
    synonyms: ['plataforma', 'platform', 'portal'],
  },
  {
    field: 'amount',
    label: 'Importe (con concepto en otra columna)',
    synonyms: [
      'importe', 'cantidad', 'importe bruto', 'importe neto', 'monto', 'amount', 'cobrado', 'importe cobrado',
      'importe recibido', 'abono', 'importe eur', 'importe euros', 'importe del movimiento', 'cuantia',
    ],
    exclude: ['retencion', 'irpf', 'fecha', 'tipo', 'saldo', 'pendiente', 'invertido', 'interes', 'capital'],
  },
  {
    field: 'concept',
    label: 'Concepto o tipo de movimiento',
    synonyms: [
      'concepto', 'tipo', 'tipo de movimiento', 'tipo movimiento', 'descripcion', 'detalle', 'operacion',
      'movimiento', 'type', 'description', 'concept', 'tipo de pago', 'tipo de cobro', 'tipo cobro', 'transaction type',
    ],
    exclude: ['fecha', 'importe', 'interes'],
  },
  {
    field: 'interestAmount',
    label: 'Importe de intereses',
    synonyms: [
      'intereses', 'interes', 'intereses cobrados', 'intereses brutos', 'interes bruto', 'intereses netos',
      'interest', 'interest received', 'rendimiento', 'rendimientos', 'intereses recibidos',
    ],
    exclude: ['fecha', 'tipo de interes', 'retencion', 'pendiente', '%'],
  },
  {
    field: 'principalAmount',
    label: 'Importe de capital devuelto',
    synonyms: [
      'capital', 'capital devuelto', 'devolucion de capital', 'devolucion capital', 'amortizacion', 'principal',
      'principal received', 'capital recibido', 'capital amortizado', 'amortizado',
    ],
    exclude: ['fecha', 'pendiente', 'invertido', 'vivo'],
  },
  {
    field: 'withholding',
    label: 'Retención',
    synonyms: ['retencion', 'retenciones', 'irpf', 'retencion irpf', 'retencion fiscal', 'withholding', 'withholding tax', 'impuesto'],
    exclude: ['fecha', '%', 'tipo'],
  },
  {
    field: 'currency',
    label: 'Divisa',
    synonyms: ['divisa', 'moneda', 'currency'],
  },
  {
    field: 'notes',
    label: 'Notas',
    synonyms: ['notas', 'nota', 'comentarios', 'comentario', 'observaciones', 'notes'],
  },
];

export const PAYMENT_FIELD_LABEL: Record<PaymentImportField, string> = Object.fromEntries(
  PAYMENT_IMPORT_FIELDS.map(f => [f.field, f.label]),
) as Record<PaymentImportField, string>;

// ─── Concepto → tipo ──────────────────────────────────────────────────────────

/** Tipos que se pueden importar. La ganancia patrimonial va por el cierre de la inversión. */
export type ImportablePaymentType = Extract<PaymentType, 'interest' | 'principal' | 'dividend' | 'capital_return'>;

export const PAYMENT_TYPE_LABEL: Record<ImportablePaymentType, string> = {
  interest: 'Intereses',
  principal: 'Devolución de capital',
  dividend: 'Dividendo',
  capital_return: 'Devolución de prima de emisión',
};

export type ConceptKind = ImportablePaymentType | 'withholding' | 'ignore' | 'mixed' | null;

const has = (text: string, words: string[]) => words.some(w => ` ${text} `.includes(` ${w} `) || (w.includes(' ') && text.includes(w)));

const WITHHOLDING_WORDS = ['retencion', 'retenciones', 'irpf', 'withholding', 'impuesto', 'tax'];
const CAPITAL_RETURN_WORDS = ['prima de emision', 'devolucion de prima', 'prima emision'];
const PRINCIPAL_WORDS = [
  'devolucion de capital', 'devolucion del capital', 'devolucion capital', 'amortizacion', 'amortizacion de capital',
  'reembolso', 'principal', 'capital devuelto', 'devolucion de la inversion', 'devolucion inversion', 'repayment',
  'capital', 'amortizado', 'principal received',
];
const INTEREST_WORDS = ['interes', 'intereses', 'cupon', 'cupones', 'rendimiento', 'rendimientos', 'remuneracion', 'interest', 'demora'];
const DIVIDEND_WORDS = ['dividendo', 'dividendos', 'dividend', 'reparto de beneficios'];
/** Movimientos que no son cobros: aportaciones, ingresos y retiradas de dinero, comisiones. */
const IGNORE_WORDS = [
  'inversion', 'invertir', 'invertido', 'deposito', 'ingreso de fondos', 'recarga', 'retirada', 'reintegro',
  'transferencia', 'comision', 'comisiones', 'reserva', 'compra', 'aportacion', 'deposit', 'withdrawal', 'fee',
  'investment',
];

/**
 * Qué es un movimiento según su concepto. null = no está claro (lo decide el
 * usuario). 'mixed' = mezcla capital e intereses en un solo importe (una cuota
 * de amortización): no se puede repartir sin más datos.
 */
export function classifyConcept(raw: string | undefined): ConceptKind {
  const text = normalizeText(raw ?? '');
  if (!text) return null;
  if (has(text, WITHHOLDING_WORDS)) return 'withholding';
  // Aportaciones que nombran el capital («ampliación de capital», «suscripción»): no son cobros.
  if (has(text, ['ampliacion de capital', 'suscripcion', 'inversion en', 'nueva inversion'])) return 'ignore';
  if (has(text, CAPITAL_RETURN_WORDS)) return 'capital_return';
  const principal = has(text, PRINCIPAL_WORDS);
  const interest = has(text, INTEREST_WORDS);
  const dividend = has(text, DIVIDEND_WORDS);
  if ((principal && interest) || (principal && dividend) || has(text, ['cuota'])) return 'mixed';
  if (dividend) return 'dividend';
  if (interest) return 'interest';
  if (principal) return 'principal';
  if (has(text, IGNORE_WORDS)) return 'ignore';
  return null;
}

// ─── Lectura de líneas ────────────────────────────────────────────────────────

type PlatformInfo = { platform: Platform; customPlatformName?: string };

/** Un cobro leído del archivo, antes de decidir inversión, tipo y retención. */
export interface PaymentLine {
  /** Fila del archivo. Una fila con intereses y capital en columnas separadas da dos líneas. */
  rowNumber: number;
  sourceName: string;
  platform: PlatformInfo | null;
  date: string | null;
  /** Importe tal como viene en el archivo (positivo). */
  amount: number | null;
  /** null = sin clasificar. */
  type: ImportablePaymentType | null;
  concept: string;
  /** El concepto mezcla capital e intereses (cuota). */
  mixed: boolean;
  /** Retención del archivo (columna o línea aparte). null = el archivo no la dice. */
  withholding: number | null;
  /** Divisa indicada en el archivo, si no es el euro. */
  currency?: string;
  notes?: string;
  warnings: string[];
}

export interface ReadResult {
  lines: PaymentLine[];
  /** Filas que no son cobros (aportaciones, retiradas, comisiones, importes negativos). */
  ignoredRows: number[];
  /** Filas de retención que no se han podido asociar a un único cobro. */
  orphanWithholdingRows: number[];
  /** El archivo dice la retención (columna o líneas de retención). */
  withholdingKnown: boolean;
}

export function nameKey(platform: PlatformInfo | null, sourceName: string): string {
  const p = platform ? (platform.platform === 'other' ? `other:${normalizeText(platform.customPlatformName ?? '')}` : platform.platform) : '';
  return `${p}|${normalizeText(sourceName)}`;
}

export function readPaymentLines(
  rows: SheetRow[],
  opts: { dateOrder?: DateOrder; defaultPlatform?: PlatformInfo | null } = {},
): ReadResult {
  const order = opts.dateOrder ?? 'dmy';
  const lines: PaymentLine[] = [];
  const ignoredRows: number[] = [];
  const withholdingRows: { rowNumber: number; key: string; date: string | null; amount: number }[] = [];
  const hasWithholdingColumn = rows.some(r => 'withholding' in r.raw);

  for (const { rowNumber, raw } of rows) {
    const platform = matchPlatform(raw.platform) ?? opts.defaultPlatform ?? null;
    const sourceName = (raw.projectName ?? '').trim();
    const date = parseLooseDate(raw.date, order);
    const warnings: string[] = [];
    if (raw.date && !date) warnings.push(`Fecha «${raw.date}» no reconocida`);
    const currencyText = normalizeText(raw.currency ?? '');
    const currency = currencyText && !['eur', 'euro', 'euros', 'e'].includes(currencyText) ? raw.currency!.trim().toUpperCase() : undefined;
    const columnWithholding = raw.withholding ? parseImportNumber(raw.withholding.replace('-', '')) : null;
    if (raw.withholding && columnWithholding === null) warnings.push(`Retención «${raw.withholding}» no reconocida`);
    const base = { rowNumber, sourceName, platform, date, concept: (raw.concept ?? '').trim(), currency, notes: raw.notes?.trim() || undefined };

    // Formato ancho: intereses y capital en columnas separadas.
    if (raw.interestAmount !== undefined || raw.principalAmount !== undefined) {
      const interest = parseImportNumber(raw.interestAmount);
      const principal = parseImportNumber(raw.principalAmount);
      if (raw.interestAmount && interest === null) warnings.push(`Intereses «${raw.interestAmount}» no reconocidos`);
      if (raw.principalAmount && principal === null) warnings.push(`Capital «${raw.principalAmount}» no reconocido`);
      let produced = false;
      if (interest !== null && interest > 0) {
        lines.push({
          ...base, amount: interest, type: 'interest', mixed: false, warnings: [...warnings],
          withholding: hasWithholdingColumn ? (columnWithholding ?? 0) : null,
        });
        produced = true;
      }
      if (principal !== null && principal > 0) {
        lines.push({ ...base, amount: principal, type: 'principal', mixed: false, warnings: [...warnings], withholding: 0 });
        produced = true;
      }
      if (!produced && !raw.amount) { ignoredRows.push(rowNumber); }
      if (!raw.amount) continue;
    }

    const kind = classifyConcept(raw.concept);
    const signed = raw.amount ? parseImportNumber(raw.amount.replace(/^-/, '')) : null;
    const negative = /^\s*-/.test(raw.amount ?? '');
    if (raw.amount && signed === null) warnings.push(`Importe «${raw.amount}» no reconocido`);

    if (kind === 'withholding') {
      if (signed !== null && signed > 0) {
        withholdingRows.push({ rowNumber, key: nameKey(platform, sourceName), date, amount: signed });
      }
      continue;
    }
    if (kind === 'ignore' || negative || (signed !== null && signed === 0)) {
      ignoredRows.push(rowNumber);
      continue;
    }
    lines.push({
      ...base,
      amount: signed,
      type: kind === 'mixed' ? null : kind,
      mixed: kind === 'mixed',
      withholding: hasWithholdingColumn ? (columnWithholding ?? 0) : null,
      warnings,
    });
  }

  // Retenciones en línea aparte: al cobro de intereses o dividendos (o sin
  // clasificar) del mismo proyecto y día. Si hay más de uno, no se adivina.
  const orphanWithholdingRows: number[] = [];
  for (const w of withholdingRows) {
    const targets = lines.filter(l =>
      nameKey(l.platform, l.sourceName) === w.key && l.date === w.date &&
      (l.type === null || (l.type && isWithholdingApplicable(l.type))),
    );
    if (targets.length === 1) targets[0].withholding = (targets[0].withholding ?? 0) + w.amount;
    else orphanWithholdingRows.push(w.rowNumber);
  }
  const withholdingKnown = hasWithholdingColumn || withholdingRows.length > 0;
  if (withholdingKnown) for (const l of lines) if (l.withholding === null) l.withholding = 0;

  return { lines, ignoredRows, orphanWithholdingRows, withholdingKnown };
}

// ─── Inversiones de destino ───────────────────────────────────────────────────

export interface TargetInvestment {
  id: string;
  platform?: Platform | null;
  customPlatformName?: string | null;
  projectName?: string | null;
  investmentDate?: string | null;
  incomeModel?: string | null;
  status: string;
  currency?: string | null;
  payments: { date: string; amount: number; type: PaymentType }[];
}

export type MatchQuality = 'exact' | 'similar';

function samePlatform(info: PlatformInfo | null, t: TargetInvestment): boolean {
  if (!info) return true;
  if (info.platform !== t.platform) return false;
  if (info.platform === 'other') return normalizeText(info.customPlatformName ?? '') === normalizeText(t.customPlatformName ?? '');
  return true;
}

/**
 * Propuesta de inversión para cada proyecto del archivo: mismo nombre (y
 * plataforma, si el archivo la dice), o un nombre que contiene al otro si
 * solo hay una candidata. Dos inversiones con el mismo nombre (dos tickets en
 * un proyecto): no se elige ninguna, lo decide el usuario.
 */
export function suggestMatches(lines: PaymentLine[], targets: TargetInvestment[]): Record<string, { id: string; quality: MatchQuality }> {
  const result: Record<string, { id: string; quality: MatchQuality }> = {};
  const seen = new Set<string>();
  for (const line of lines) {
    const key = nameKey(line.platform, line.sourceName);
    if (seen.has(key)) continue;
    seen.add(key);
    const name = normalizeText(line.sourceName);
    if (!name) continue;
    const pool = targets.filter(t => samePlatform(line.platform, t) && t.projectName);
    const exact = pool.filter(t => normalizeText(t.projectName!) === name);
    if (exact.length === 1) { result[key] = { id: exact[0].id, quality: 'exact' }; continue; }
    if (exact.length > 1) continue;
    if (name.length < 4) continue;
    const similar = pool.filter(t => {
      const tn = normalizeText(t.projectName!);
      return tn.length >= 4 && (tn.includes(name) || name.includes(tn));
    });
    if (similar.length === 1) result[key] = { id: similar[0].id, quality: 'similar' };
  }
  return result;
}

// ─── Resolución: importe bruto, retención y comprobaciones ────────────────────

/** Cómo son los importes cuando el archivo SÍ dice la retención. */
export type AmountsAre = 'gross' | 'net';
/** Qué hacer cuando el archivo NO dice la retención (lo confirma el usuario). */
export type NoWithholdingMode = 'gross19' | 'net19' | 'none';

export interface ResolveOptions {
  targets: TargetInvestment[];
  /** nameKey → id de la inversión, o 'skip' para no importar ese proyecto. */
  investmentFor: Record<string, string>;
  /** índice de línea → tipo elegido a mano, o 'skip'. */
  typeOverrides: Record<number, ImportablePaymentType | 'skip'>;
  /** Tipo para las líneas sin clasificar. */
  defaultType: ImportablePaymentType | null;
  withholdingKnown: boolean;
  amountsAre: AmountsAre | null;
  noWithholdingMode: NoWithholdingMode | null;
  /** Hoy, 'YYYY-MM-DD'. */
  today: string;
}

export type ResolvedStatus =
  | 'ready'
  | 'needsInvestment'
  | 'needsType'
  | 'needsWithholding'
  | 'blocked'
  | 'skipped'
  | 'duplicate';

export interface ResolvedPayment {
  index: number;
  line: PaymentLine;
  investment: TargetInvestment | null;
  type: ImportablePaymentType | null;
  /** Importe bruto en euros. */
  gross: number | null;
  withholding: number | null;
  status: ResolvedStatus;
  /** Por qué no se importa, o qué falta. */
  reason?: string;
  notes?: string;
  warnings: string[];
}

const round2 = (v: number) => Math.round(v * 100) / 100;
const WITHHOLDING_NOTE = 'Retención calculada al 19 %: cotéjala con el certificado de la plataforma';

function isForeignPlatform(platform: Platform | null | undefined): boolean {
  const country = PLATFORMS.find(p => p.value === platform)?.country;
  return !!country && country !== 'ES';
}

export function resolvePayments(lines: PaymentLine[], opts: ResolveOptions): ResolvedPayment[] {
  const byId = new Map(opts.targets.map(t => [t.id, t]));
  return lines.map((line, index) => {
    const warnings = [...line.warnings];
    const out = (status: ResolvedStatus, extra: Partial<ResolvedPayment> = {}): ResolvedPayment => ({
      index, line, investment: null, type: null, gross: null, withholding: null, status, warnings, ...extra,
    });

    const override = opts.typeOverrides[index];
    if (override === 'skip') return out('skipped', { reason: 'No se importa' });
    if (!line.date) return out('blocked', { reason: 'Sin fecha' });
    if (line.amount === null || line.amount <= 0) return out('blocked', { reason: 'Sin importe' });
    if (line.currency) return out('blocked', { reason: `Cobro en ${line.currency}: regístralo desde la ficha con su tipo de cambio` });

    const target = opts.investmentFor[nameKey(line.platform, line.sourceName)];
    if (target === 'skip') return out('skipped', { reason: 'Proyecto sin importar' });
    const investment = target ? byId.get(target) ?? null : null;
    if (!investment) return out('needsInvestment', { reason: 'Elige a qué inversión va' });

    if (investment.status === 'defaulted') {
      return out('blocked', { investment, reason: 'Inversión en impago: registra lo recuperado desde su ficha' });
    }
    if (isForeignCurrency(investment.currency)) {
      return out('blocked', { investment, reason: `Inversión en ${investment.currency}: regístralo desde la ficha con su tipo de cambio` });
    }
    if (line.date > opts.today) return out('blocked', { investment, reason: 'Fecha futura' });
    if (investment.investmentDate && line.date < investment.investmentDate) {
      return out('blocked', { investment, reason: 'Fecha anterior a la de la inversión' });
    }

    // Tipo: el del concepto; si no, el elegido a mano o para todo el archivo.
    let type: ImportablePaymentType | null = override ?? line.type ?? (line.mixed ? null : opts.defaultType);
    if (type && investment.incomeModel === 'equity' && type === 'interest') {
      // En equity no hay intereses: o es dividendo (tributa) o prima de emisión (no).
      if (!override) { type = null; warnings.push('Equity: elige si es dividendo o devolución de prima'); }
    }
    if (!type) {
      return out('needsType', {
        investment,
        reason: line.mixed ? 'Cuota que mezcla capital e intereses: elige el tipo o regístrala desde la ficha' : 'Elige el tipo de cobro',
      });
    }

    // Bruto y retención
    let gross = line.amount;
    let withholding = 0;
    const notes: string[] = line.notes ? [line.notes] : [];
    if (isWithholdingApplicable(type)) {
      if (opts.withholdingKnown) {
        if (!opts.amountsAre) return out('needsWithholding', { investment, type, reason: 'Indica si los importes son brutos o netos' });
        withholding = line.withholding ?? 0;
        gross = opts.amountsAre === 'gross' ? line.amount : round2(line.amount + withholding);
      } else {
        if (!opts.noWithholdingMode) return out('needsWithholding', { investment, type, reason: 'Indica si hubo retención' });
        const rate = opts.noWithholdingMode === 'none' || isForeignPlatform(investment.platform) ? 0 : SPANISH_WITHHOLDING_RATE;
        if (opts.noWithholdingMode === 'net19' && rate > 0) {
          gross = round2(line.amount / (1 - rate));
          withholding = round2(gross - line.amount);
        } else {
          gross = line.amount;
          withholding = round2(line.amount * rate);
        }
        if (rate > 0) {
          notes.push(WITHHOLDING_NOTE);
          if (investment.platform === 'other') warnings.push('Comprueba que la plataforma retiene el 19 %');
        }
      }
    } else if ((line.withholding ?? 0) > 0) {
      warnings.push('El capital devuelto no lleva retención: se ignora la del archivo');
    }
    if (withholding > gross) return out('blocked', { investment, type, reason: 'La retención es mayor que el importe' });

    // Repetido: mismo día, tipo e importe (bruto o el del archivo) que uno ya registrado.
    const duplicate = investment.payments.some(p =>
      p.date.slice(0, 10) === line.date && p.type === type &&
      (Math.abs(p.amount - gross) < 0.01 || Math.abs(p.amount - line.amount!) < 0.01),
    );
    if (duplicate) return out('duplicate', { investment, type, gross, withholding, reason: 'Ya registrado' });

    return out('ready', { investment, type, gross, withholding, notes: notes.join(' · ') || undefined });
  });
}
