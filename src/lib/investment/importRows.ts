import { addMonths } from 'date-fns';
import { buildMaturityFromForm } from './maturityChange';
import {
  PLATFORMS, Platform, IncomeModel, PaymentFrequency, PrincipalReturnType, InvestmentStatus,
} from '@/types/investment';
import { parseImportDate } from '@/lib/investment/parseImportDate';
import { parseSpanishNumber } from '@/lib/investment/parseSpanishNumber';
import { fromDateOnlyString, toDateOnlyString } from '@/lib/dateOnly';
import { normalizeText, SheetRow } from './importSheet';

/**
 * De una fila importada (CSV/XLSX) a una inversión.
 *
 * Solo se guarda lo que se entiende sin dudas. Lo dudoso (un número que puede
 * leerse de dos formas, una fecha que no existe, un tipo de rendimiento que no
 * reconocemos) se deja VACÍO y la inversión queda como borrador para que el
 * usuario lo complete; el valor original va a las notas para que lo tenga a
 * mano. Nunca se rellena con un valor inventado (0 €, la fecha de hoy…): no se
 * distinguiría de un dato real y la fecha cuenta para el IRPF.
 *
 * Los valores «para todo el archivo» (plataforma, tipo, frecuencia) los elige
 * el usuario en la pantalla de importación: son datos suyos, no supuestos.
 */

export type RawRow = Record<string, string>;

/** Inversión tal como se va a guardar. Los null son datos que faltan. */
export interface ImportedInvestment {
  platform: Platform;
  customPlatformName?: string;
  projectName: string;
  amount: number | null;
  investmentDate: string | null;
  expectedEndDate?: string;
  originalEndDate?: string | null;
  interestEndDate?: string | null;
  wasExtended?: boolean;
  expectedReturn: number | null;
  incomeModel: IncomeModel | null;
  paymentFrequency?: PaymentFrequency;
  principalReturnType?: PrincipalReturnType;
  status: Extract<InvestmentStatus, 'active' | 'draft'>;
  notes?: string;
}

export interface ImportCandidate {
  rowNumber: number;
  investment: ImportedInvestment;
  complete: boolean;
  /** Claves de traducción `investments.field.*` de lo que falta. */
  missing: string[];
  /** Avisos de la fila (p. ej. un valor que no se ha entendido). */
  warnings: string[];
  /** Ya existe en la cartera. */
  duplicate: boolean;
  /** El archivo dice que está finalizada (devuelta, cobrada, cerrada…). */
  finished: boolean;
  /** Su vencimiento ya ha pasado. */
  pastDue: boolean;
}

export type DateOrder = 'dmy' | 'mdy';

export interface BuildOptions {
  /** Plataforma para las filas que no la indican. */
  defaultPlatform?: { platform: Platform; customPlatformName?: string } | null;
  /** Tipo de rendimiento para las filas que no lo indican (o no se entiende). */
  defaultIncomeModel?: IncomeModel | null;
  /** Frecuencia para las periódicas o amortizables que no la indican. */
  defaultFrequency?: PaymentFrequency | null;
  /** Orden de las fechas escritas como texto. Por defecto día/mes (España). */
  dateOrder?: DateOrder;
  /** Nombres de plataformas «Otra» que ya usa el usuario: se reutiliza su forma de escribirlas. */
  knownCustomPlatforms?: string[];
  /**
   * La columna de rentabilidad viene en tanto por uno (0,09 = 9 %): todas sus
   * cifras están entre 0 y 1. Ver detectFractionReturns.
   */
  returnsAsFraction?: boolean;
  /** Hoy, 'YYYY-MM-DD' (para las pruebas). */
  today?: string;
}

// ─── Valores reconocidos ─────────────────────────────────────────────────────

const INCOME_MODEL_WORDS: Record<string, IncomeModel> = {
  'bullet': 'bullet', 'pago unico': 'bullet', 'pago unico al vencimiento': 'bullet',
  'al vencimiento': 'bullet', 'intereses al vencimiento': 'bullet', 'prestamo bullet': 'bullet',
  'periodic fixed': 'periodic_fixed', 'periodic_fixed': 'periodic_fixed',
  'rendimiento periodico fijo': 'periodic_fixed', 'cupones periodicos': 'periodic_fixed',
  'intereses periodicos': 'periodic_fixed', 'periodico': 'periodic_fixed', 'cupon': 'periodic_fixed',
  'cupones': 'periodic_fixed',
  'amortizing': 'amortizing', 'amortizacion': 'amortizing', 'amortizacion progresiva': 'amortizing',
  'amortizable': 'amortizing', 'prestamo amortizable': 'amortizing', 'frances': 'amortizing',
  'equity': 'equity', 'equity participativo': 'equity', 'participativo': 'equity',
  'acciones': 'equity', 'participaciones': 'equity',
  'variable': 'variable_or_unknown', 'variable or unknown': 'variable_or_unknown',
  'variable o desconocido': 'variable_or_unknown', 'variable_or_unknown': 'variable_or_unknown',
};

const FREQUENCY_WORDS: Record<string, PaymentFrequency> = {
  'monthly': 'monthly', 'mensual': 'monthly', 'mes': 'monthly', 'mensualmente': 'monthly',
  'quarterly': 'quarterly', 'trimestral': 'quarterly', 'trimestre': 'quarterly', 'trimestralmente': 'quarterly',
  'semiannual': 'semiannual', 'semestral': 'semiannual', 'semestre': 'semiannual', 'semestralmente': 'semiannual',
  'annual': 'annual', 'anual': 'annual', 'ano': 'annual', 'anualmente': 'annual',
};

const PRINCIPAL_WORDS: Record<string, PrincipalReturnType> = {
  'at maturity': 'at_maturity', 'at_maturity': 'at_maturity', 'al vencimiento': 'at_maturity',
  'amortizing': 'amortizing', 'amortizacion progresiva': 'amortizing', 'amortizacion': 'amortizing',
  'unknown': 'unknown', 'desconocido': 'unknown',
};

/** Estados del archivo que significan que la inversión ya terminó. */
const FINISHED_STEMS = [
  'finaliz', 'cerrad', 'devuelt', 'complet', 'cobrad', 'amortizad', 'vendid', 'liquidad', 'terminad',
  'reembols', 'repaid', 'finish', 'closed', 'matured',
];
/** Estados que indican impago: se importa, pero el impago se registra en la ficha (cuestionario fiscal). */
const DEFAULT_STEMS = ['impago', 'default', 'fallid', 'moros', 'incumpl', 'concurso', 'ejecucion judicial'];

function lookup<T>(table: Record<string, T>, raw: string | undefined): T | undefined {
  const key = normalizeText(raw ?? '');
  if (!key) return undefined;
  if (table[key]) return table[key];
  // También el valor interno tal cual ('periodic_fixed').
  const plain = (raw ?? '').trim().toLowerCase();
  return table[plain];
}

/**
 * Plataforma por nombre. Una que no está en el catálogo queda como «Otra» con
 * su nombre (escrito igual que en las inversiones que el usuario ya tiene).
 */
export function matchPlatform(
  raw: string | undefined,
  knownCustom: string[] = [],
): { platform: Platform; customPlatformName?: string } | null {
  const text = (raw ?? '').trim();
  if (!text) return null;
  const n = normalizeText(text);
  const known = PLATFORMS.find(p => p.value !== 'other' && (normalizeText(p.label) === n || p.value === n || n.startsWith(`${p.value} `)));
  if (known) return { platform: known.value };
  if (n === 'otra' || n === 'other' || n === 'otras') return null;
  const existing = knownCustom.find(c => normalizeText(c) === n);
  return { platform: 'other', customPlatformName: existing ?? text };
}

/** Divisa de la plataforma (Crowdcube opera en libras). */
function platformCurrency(platform: Platform): string {
  return PLATFORMS.find(p => p.value === platform)?.defaultCurrency ?? 'EUR';
}

// ─── Números y fechas ────────────────────────────────────────────────────────

/**
 * Número de un archivo importado: formato español ("1.500,50"), con o sin
 * «€», «EUR», «%» o espacios. El que exporta Crowdfolio ("1500.5") también.
 * null si está vacío o es ambiguo.
 */
export function parseImportNumber(raw: string | undefined): number | null {
  const cleaned = (raw ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/€|eur(os)?|%/gi, '')
    .replace(/\s+/g, '')
    .trim();
  if (!cleaned) return null;
  const parsed = parseSpanishNumber(cleaned);
  if (parsed.error || parsed.value === null || !Number.isFinite(parsed.value)) return null;
  return parsed.value;
}

const TEXT_DATE = /^(\d{1,2})([/.-])(\d{1,2})\2(\d{2}|\d{4})$/;

/**
 * Fecha de texto o de celda → 'YYYY-MM-DD'. Día/mes por defecto; mes/día si
 * el usuario lo ha elegido. Año de dos cifras = 20xx.
 */
export function parseLooseDate(raw: string | undefined, order: DateOrder): string | null {
  const s = (raw ?? '').trim();
  const m = TEXT_DATE.exec(s);
  if (m) {
    const [day, month] = order === 'mdy' ? [m[3], m[1]] : [m[1], m[3]];
    const year = m[4].length === 2 ? `20${m[4]}` : m[4];
    return parseImportDate(`${day}/${month}/${year}`);
  }
  return parseImportDate(s);
}

const DATE_FIELDS = ['investmentDate', 'expectedEndDate', 'originalEndDate'] as const;

/**
 * ¿Están las fechas de texto escritas mes/día (Excel en inglés)? Solo se
 * sugiere 'mdy' si alguna fecha solo existe leída así (01/25/2024) y ninguna
 * solo existe leída día/mes (25/01/2024). El usuario lo confirma en pantalla:
 * una sola errata no debe girar todas las fechas sin que se entere.
 */
export function detectDateOrder(
  rows: SheetRow[],
  fields: readonly string[] = DATE_FIELDS,
): { suggested: DateOrder; ambiguous: boolean } {
  let firstOver12 = false;
  let secondOver12 = false;
  for (const r of rows) {
    for (const field of fields) {
      const m = TEXT_DATE.exec((r.raw[field] ?? '').trim());
      if (!m) continue;
      if (Number(m[1]) > 12) firstOver12 = true;
      if (Number(m[3]) > 12) secondOver12 = true;
    }
  }
  if (secondOver12 && !firstOver12) return { suggested: 'mdy', ambiguous: true };
  return { suggested: 'dmy', ambiguous: secondOver12 && firstOver12 };
}

/**
 * ¿La rentabilidad viene en tanto por uno? Pasa cuando el formato % de la
 * celda se ha perdido (al pegar datos, o en un CSV): un 9 % llega como 0,09.
 * Solo si TODAS las cifras de la columna están entre 0 y 0,30: una cartera entera
 * al 0,09 % no existe. Si se mezclan (9,5 y 0,09), no se toca nada y las
 * dudosas se quedan vacías.
 */
export function detectFractionReturns(rows: SheetRow[]): boolean {
  let count = 0;
  for (const r of rows) {
    const raw = r.raw.expectedReturn;
    if (!raw || raw.includes('%')) { if (raw) return false; continue; }
    const v = parseImportNumber(raw);
    if (v === null) continue;
    if (v === 0) continue;
    // Hasta 0,30 (30 %): más es increíble en este sector y «0,5» puede ser un 0,5 %.
    if (v < 0 || v > 0.3) return false;
    count++;
  }
  return count > 0;
}

// ─── Fila → inversión ────────────────────────────────────────────────────────

const MAX_AMOUNT = 10_000_000;
const MIN_DATE = '2000-01-01';

type BuiltRow = Omit<ImportCandidate, 'rowNumber' | 'duplicate'>;

export function buildInvestmentFromRow(raw: RawRow, opts: BuildOptions = {}): BuiltRow {
  const today = opts.today ?? toDateOnlyString(new Date());
  const order = opts.dateOrder ?? 'dmy';
  const warnings: string[] = [];
  const notesExtra: string[] = [];
  /** Valores del archivo que no se han podido usar: van a las notas. */
  const unread: string[] = [];
  const notUnderstood = (label: string, value: string, warning: string) => {
    warnings.push(warning);
    unread.push(`${label} «${value}»`);
  };

  // Plataforma
  const fromCell = matchPlatform(raw.platform, opts.knownCustomPlatforms);
  const platformInfo = fromCell ?? opts.defaultPlatform ?? null;

  // Nombre
  const projectName = (raw.projectName ?? '').trim();

  // Importe: solo en euros. Si el archivo o la plataforma dicen otra divisa,
  // se deja vacío (hay que poner el tipo de cambio en el formulario).
  let amount = parseImportNumber(raw.amount);
  if (raw.amount && amount === null) {
    notUnderstood('importe', raw.amount, `Importe «${raw.amount}» no reconocido`);
  } else if (amount !== null && (amount <= 0 || amount >= MAX_AMOUNT)) {
    notUnderstood('importe', raw.amount, `Importe «${raw.amount}» fuera de lo normal: revísalo`);
    amount = null;
  }
  const currencyCell = normalizeText(raw.currency ?? '');
  const fileCurrency = currencyCell && !['eur', 'euro', 'euros', 'e'].includes(currencyCell) ? raw.currency!.trim().toUpperCase() : null;
  const foreignCurrency = fileCurrency ?? (platformInfo && platformCurrency(platformInfo.platform) !== 'EUR' ? platformCurrency(platformInfo.platform) : null);
  if (amount !== null && foreignCurrency) {
    notesExtra.push(`Importe en el archivo: ${raw.amount} ${foreignCurrency}`);
    warnings.push(`Importe en ${foreignCurrency}: complétalo con el tipo de cambio`);
    amount = null;
  }

  // Fecha de inversión: ni futura ni absurda (un 0 en Excel es 1900).
  let investmentDate = parseLooseDate(raw.investmentDate, order);
  if (raw.investmentDate && !investmentDate) {
    notUnderstood('fecha de inversión', raw.investmentDate, `Fecha de inversión «${raw.investmentDate}» no reconocida`);
  } else if (investmentDate && (investmentDate > today || investmentDate < MIN_DATE)) {
    notUnderstood('fecha de inversión', raw.investmentDate, `Fecha de inversión «${raw.investmentDate}» dudosa: revísala`);
    investmentDate = null;
  }

  // Vencimiento
  let expectedEndDate = parseLooseDate(raw.expectedEndDate, order) ?? undefined;
  if (raw.expectedEndDate && !expectedEndDate) {
    notUnderstood('vencimiento', raw.expectedEndDate, `Vencimiento «${raw.expectedEndDate}» no reconocido`);
  }
  // Sin fecha de vencimiento pero con plazo en meses: fecha de inversión + plazo.
  if (!expectedEndDate && investmentDate && raw.termMonths) {
    const months = parseImportNumber(raw.termMonths);
    if (months !== null && Number.isInteger(months) && months > 0 && months <= 360) {
      expectedEndDate = toDateOnlyString(addMonths(fromDateOnlyString(investmentDate), months));
    }
  }
  if (expectedEndDate && investmentDate && expectedEndDate <= investmentDate) {
    notUnderstood('vencimiento', raw.expectedEndDate || raw.termMonths || '', 'El vencimiento es anterior a la fecha de inversión');
    expectedEndDate = undefined;
  }
  // Vencimiento prometido (opcional): si es anterior al actual, la inversión
  // llega retrasada. Sin más datos se trata como retraso (no se suponen
  // intereses extra); el usuario puede cambiarlo a prórroga al editarla.
  const promised = parseLooseDate(raw.originalEndDate, order) ?? undefined;
  const maturity = buildMaturityFromForm(null, { expectedEndDate, promisedEndDate: promised, kind: 'delayed' });

  // Rentabilidad anual en %. Entre 0 y 1 (sin ser 0) es ambiguo: puede ser
  // 0,08 % o un 8 % escrito como 0,08. Se deja vacío.
  let parsedReturn = parseImportNumber(raw.expectedReturn);
  if (parsedReturn !== null && opts.returnsAsFraction && !raw.expectedReturn.includes('%')) {
    parsedReturn = Math.round(parsedReturn * 100 * 1e6) / 1e6;
  }
  let expectedReturn: number | null = parsedReturn;
  if (parsedReturn !== null && (parsedReturn < 0 || parsedReturn > 100 || (parsedReturn > 0 && parsedReturn < 1))) {
    notUnderstood('rentabilidad', raw.expectedReturn, `Rentabilidad «${raw.expectedReturn}» dudosa: revísala`);
    expectedReturn = null;
  } else if (raw.expectedReturn && parsedReturn === null) {
    notUnderstood('rentabilidad', raw.expectedReturn, `Rentabilidad «${raw.expectedReturn}» no reconocida`);
  }

  // Tipo de rendimiento: el de la fila; si la celda está vacía, el elegido para
  // el archivo. Si la fila dice algo que no entendemos («Préstamo») no se pisa
  // con el del archivo: el usuario lo decide en esa inversión.
  let incomeModel = lookup(INCOME_MODEL_WORDS, raw.incomeModel) ?? null;
  if (raw.incomeModel && !incomeModel) {
    notUnderstood('tipo', raw.incomeModel, `Tipo «${raw.incomeModel}» no reconocido`);
  }
  if (!incomeModel && !raw.incomeModel && opts.defaultIncomeModel) incomeModel = opts.defaultIncomeModel;

  // Frecuencia: solo tiene sentido en periódicas y amortizables.
  const needsFrequency = incomeModel === 'periodic_fixed' || incomeModel === 'amortizing';
  let paymentFrequency = lookup(FREQUENCY_WORDS, raw.paymentFrequency);
  if (raw.paymentFrequency && !paymentFrequency) {
    notUnderstood('frecuencia', raw.paymentFrequency, `Frecuencia «${raw.paymentFrequency}» no reconocida`);
  }
  if (!paymentFrequency && !raw.paymentFrequency && needsFrequency && opts.defaultFrequency) paymentFrequency = opts.defaultFrequency;

  const principalReturnType = lookup(PRINCIPAL_WORDS, raw.principalReturnType);

  // Estado según el archivo
  const statusText = normalizeText(raw.status ?? '');
  const finished = !!statusText && FINISHED_STEMS.some(s => statusText.includes(s));
  if (statusText && DEFAULT_STEMS.some(s => statusText.includes(s))) {
    warnings.push('En el archivo figura como impago: regístralo desde la ficha');
    notesExtra.push(`Estado en el archivo: ${raw.status!.trim()}`);
  }

  if (unread.length > 0) notesExtra.push(`Del archivo, sin leer: ${unread.join(', ')}`);
  const notes = [raw.notes?.trim(), ...notesExtra].filter(Boolean).join(' · ') || undefined;

  // Lo que falta para que sea una inversión activa (mismas reglas que completeness.ts)
  const missing: string[] = [];
  if (!platformInfo) missing.push('investments.field.platform');
  if (!projectName) missing.push('investments.field.projectName');
  if (amount === null) missing.push('investments.field.amount');
  if (!investmentDate) missing.push('investments.field.investmentDate');
  if (!incomeModel) missing.push('investments.field.incomeModel');
  if (expectedReturn === null) missing.push('investments.field.expectedReturn');
  if (!expectedEndDate) missing.push('investments.field.expectedEndDate');
  if (needsFrequency && !paymentFrequency) missing.push('investments.field.paymentFrequency');
  // Equity: el tipo de retorno (plusvalía, rentas o liquidación) decide qué
  // cobros tributan; no viene en ningún Excel, así que siempre lo elige el usuario.
  if (incomeModel === 'equity') missing.push('investments.field.equityType');
  const complete = missing.length === 0;

  return {
    complete,
    missing,
    warnings,
    finished,
    pastDue: !!expectedEndDate && expectedEndDate < today,
    investment: {
      platform: platformInfo?.platform ?? 'other',
      customPlatformName: platformInfo?.customPlatformName,
      projectName,
      amount,
      investmentDate,
      expectedEndDate,
      ...maturity,
      expectedReturn,
      incomeModel,
      paymentFrequency: needsFrequency ? paymentFrequency : undefined,
      principalReturnType,
      status: complete ? 'active' : 'draft',
      notes,
    },
  };
}

// ─── Repetidas ───────────────────────────────────────────────────────────────

/** Lo mínimo que hace falta de una inversión ya guardada para detectar repetidas. */
export interface ExistingInvestmentKey {
  platform?: string | null;
  customPlatformName?: string | null;
  projectName?: string | null;
  amount?: number | null;
  investmentDate?: string | null;
}

function platformKey(platform: string | null | undefined, custom: string | null | undefined): string {
  return platform === 'other' ? `other:${normalizeText(custom ?? '')}` : (platform ?? '');
}

/**
 * ¿Es la misma inversión? Misma plataforma y nombre, y ni el importe ni la
 * fecha se contradicen. Si a una de las dos le falta el importe o la fecha
 * (un borrador de una importación anterior), basta con lo que tienen las dos:
 * así volver a subir el mismo archivo no duplica los borradores.
 */
function isSameInvestment(a: ImportedInvestment, b: ExistingInvestmentKey): boolean {
  const amountB = b.amount != null && b.amount > 0 ? Number(b.amount) : null;
  if (a.amount != null && amountB != null && Math.abs(a.amount - amountB) > 0.005) return false;
  const dateB = b.investmentDate ? b.investmentDate.slice(0, 10) : null;
  if (a.investmentDate && dateB && a.investmentDate !== dateB) return false;
  return true;
}

// ─── Archivo completo ────────────────────────────────────────────────────────

/**
 * Todas las filas del archivo. Las que no tienen nombre de proyecto no se
 * importan (sin nombre no hay forma de reconocerlas luego en la lista).
 */
export function buildImportCandidates(
  rows: SheetRow[],
  existing: ExistingInvestmentKey[],
  opts: BuildOptions = {},
): { candidates: ImportCandidate[]; withoutName: number[] } {
  const byName = new Map<string, ExistingInvestmentKey[]>();
  for (const ex of existing) {
    if (!ex.projectName) continue;
    const key = `${platformKey(ex.platform, ex.customPlatformName)}|${normalizeText(ex.projectName)}`;
    byName.set(key, [...(byName.get(key) ?? []), ex]);
  }
  const knownCustomPlatforms = opts.knownCustomPlatforms ?? Array.from(new Set(
    existing.filter(e => e.platform === 'other' && e.customPlatformName).map(e => e.customPlatformName!),
  ));

  const candidates: ImportCandidate[] = [];
  const withoutName: number[] = [];
  for (const row of rows) {
    const built = buildInvestmentFromRow(row.raw, { ...opts, knownCustomPlatforms });
    const inv = built.investment;
    if (!inv.projectName) { withoutName.push(row.rowNumber); continue; }
    // Fila de ejemplo de la plantilla que el usuario no ha borrado.
    if (normalizeText(inv.projectName).startsWith('ejemplo ')) continue;
    const sameName = byName.get(`${platformKey(inv.platform, inv.customPlatformName)}|${normalizeText(inv.projectName)}`) ?? [];
    const duplicate = sameName.some(ex => isSameInvestment(inv, ex));
    candidates.push({ ...built, rowNumber: row.rowNumber, duplicate });
  }
  return { candidates, withoutName };
}

export interface ImportSelection {
  /** Las que se van a guardar, en el orden del archivo. */
  accepted: ImportCandidate[];
  /** Fuera por el límite del plan gratuito. */
  overLimit: number;
  duplicates: number;
  finished: number;
  /** Vencidas que no constan como finalizadas. */
  pastDue: number;
}

/** Qué se importa según las casillas de la pantalla y el plan. */
export function selectForImport(
  candidates: ImportCandidate[],
  opts: { includeDuplicates: boolean; includeFinished: boolean; includePastDue: boolean; slots: number },
): ImportSelection {
  const eligible = candidates.filter(c =>
    (opts.includeDuplicates || !c.duplicate) &&
    (opts.includeFinished || !c.finished) &&
    (opts.includePastDue || c.finished || !c.pastDue),
  );
  const accepted = eligible.slice(0, Math.max(0, opts.slots));
  return {
    accepted,
    overLimit: eligible.length - accepted.length,
    duplicates: candidates.filter(c => c.duplicate).length,
    finished: candidates.filter(c => c.finished).length,
    pastDue: candidates.filter(c => c.pastDue && !c.finished).length,
  };
}
