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
 * usuario lo complete. Nunca se rellena con un valor inventado (0 €, la fecha
 * de hoy…): no se distinguiría de un dato real y la fecha cuenta para el IRPF.
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
  /** Ya existe en la cartera (misma plataforma, nombre, importe y fecha). */
  duplicate: boolean;
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

function lookup<T>(table: Record<string, T>, raw: string | undefined): T | undefined {
  const key = normalizeText(raw ?? '');
  if (!key) return undefined;
  if (table[key]) return table[key];
  // También el valor interno tal cual ('periodic_fixed').
  const plain = (raw ?? '').trim().toLowerCase();
  return table[plain];
}

/** Plataforma por nombre. Una que no está en el catálogo queda como «Otra» con su nombre. */
export function matchPlatform(raw: string | undefined): { platform: Platform; customPlatformName?: string } | null {
  const text = (raw ?? '').trim();
  if (!text) return null;
  const n = normalizeText(text);
  const known = PLATFORMS.find(p => p.value !== 'other' && (normalizeText(p.label) === n || p.value === n || n.startsWith(`${p.value} `)));
  if (known) return { platform: known.value };
  if (n === 'otra' || n === 'other') return null;
  return { platform: 'other', customPlatformName: text };
}

/** Plataformas cuyo importe no viene en euros: el importe se tiene que revisar a mano. */
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

/** Como parseImportDate, y además «01/02/24» (año de dos cifras = 20xx). */
function parseLooseDate(raw: string | undefined): string | null {
  const s = (raw ?? '').trim();
  const short = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2})$/.exec(s);
  if (short) return parseImportDate(`${short[1]}/${short[2]}/20${short[3]}`);
  return parseImportDate(s);
}

const DATE_FIELDS = ['investmentDate', 'expectedEndDate', 'originalEndDate'] as const;

/**
 * Fechas escritas mes/día (Excel en inglés): si en una columna alguna fecha
 * solo tiene sentido como mes/día (13/25/2024 no existe, 01/25/2024 sí) y
 * ninguna como día/mes, la columna entera es mes/día y se le da la vuelta.
 * Si hay de las dos, se queda como día/mes y las que no existen se quedan vacías.
 */
export function fixUsDateColumns(rows: SheetRow[]): SheetRow[] {
  const out = rows.map(r => ({ ...r, raw: { ...r.raw } }));
  for (const field of DATE_FIELDS) {
    let firstOver12 = false;
    let secondOver12 = false;
    for (const r of out) {
      const m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/.exec(r.raw[field] ?? '');
      if (!m) continue;
      if (Number(m[1]) > 12) firstOver12 = true;
      if (Number(m[2]) > 12) secondOver12 = true;
    }
    if (secondOver12 && !firstOver12) {
      for (const r of out) {
        const v = r.raw[field];
        const m = v ? /^(\d{1,2})([/.-])(\d{1,2})\2(\d{2}|\d{4})$/.exec(v) : null;
        if (m) r.raw[field] = `${m[3]}/${m[1]}/${m[4]}`;
      }
    }
  }
  return out;
}

// ─── Fila → inversión ────────────────────────────────────────────────────────

interface BuildOptions {
  /** Plataforma elegida para todo el archivo (si no hay columna de plataforma o la celda está vacía). */
  defaultPlatform?: { platform: Platform; customPlatformName?: string } | null;
}

export function buildInvestmentFromRow(raw: RawRow, opts: BuildOptions = {}): Omit<ImportCandidate, 'rowNumber' | 'duplicate'> {
  const warnings: string[] = [];
  const notesExtra: string[] = [];

  // Plataforma
  const fromCell = matchPlatform(raw.platform);
  const platformInfo = fromCell ?? opts.defaultPlatform ?? null;

  // Nombre
  const projectName = (raw.projectName ?? '').trim();

  // Importe: solo en euros. Si el archivo o la plataforma dicen otra divisa,
  // se deja vacío (hay que poner el tipo de cambio en el formulario).
  let amount = parseImportNumber(raw.amount);
  if (raw.amount && amount === null) warnings.push(`Importe «${raw.amount}» no reconocido`);
  if (amount !== null && amount <= 0) amount = null;
  const currencyCell = normalizeText(raw.currency ?? '');
  const fileCurrency = currencyCell && !['eur', 'euro', 'euros', 'e'].includes(currencyCell) ? raw.currency!.trim().toUpperCase() : null;
  const foreignCurrency = fileCurrency ?? (platformInfo && platformCurrency(platformInfo.platform) !== 'EUR' ? platformCurrency(platformInfo.platform) : null);
  if (amount !== null && foreignCurrency) {
    notesExtra.push(`Importe en el archivo: ${raw.amount} ${foreignCurrency}`);
    warnings.push(`Importe en ${foreignCurrency}: complétalo con el tipo de cambio`);
    amount = null;
  }

  // Fechas
  const investmentDate = parseLooseDate(raw.investmentDate);
  if (raw.investmentDate && !investmentDate) warnings.push(`Fecha de inversión «${raw.investmentDate}» no reconocida`);
  let expectedEndDate = parseLooseDate(raw.expectedEndDate) ?? undefined;
  if (raw.expectedEndDate && !expectedEndDate) warnings.push(`Vencimiento «${raw.expectedEndDate}» no reconocido`);
  // Sin fecha de vencimiento pero con plazo en meses: fecha de inversión + plazo.
  if (!expectedEndDate && investmentDate && raw.termMonths) {
    const months = parseImportNumber(raw.termMonths);
    if (months !== null && Number.isInteger(months) && months > 0 && months <= 360) {
      expectedEndDate = toDateOnlyString(addMonths(fromDateOnlyString(investmentDate), months));
    }
  }
  if (expectedEndDate && investmentDate && expectedEndDate <= investmentDate) {
    warnings.push('El vencimiento es anterior a la fecha de inversión');
    expectedEndDate = undefined;
  }
  // Vencimiento prometido (opcional): si es anterior al actual, la inversión
  // llega retrasada. Sin más datos se trata como retraso (no se suponen
  // intereses extra); el usuario puede cambiarlo a prórroga al editarla.
  const promised = parseLooseDate(raw.originalEndDate) ?? undefined;
  const maturity = buildMaturityFromForm(null, { expectedEndDate, promisedEndDate: promised, kind: 'delayed' });

  // Rentabilidad anual en %. Entre 0 y 1 (sin ser 0) es ambiguo: puede ser
  // 0,08 % o un 8 % escrito como 0,08. Se deja vacío.
  const parsedReturn = parseImportNumber(raw.expectedReturn);
  let expectedReturn: number | null = parsedReturn;
  if (parsedReturn !== null && (parsedReturn < 0 || parsedReturn > 100 || (parsedReturn > 0 && parsedReturn < 1))) {
    warnings.push(`Rentabilidad «${raw.expectedReturn}» dudosa: revísala`);
    expectedReturn = null;
  } else if (raw.expectedReturn && parsedReturn === null) {
    warnings.push(`Rentabilidad «${raw.expectedReturn}» no reconocida`);
  }

  // Tipo de rendimiento, frecuencia y devolución del capital
  const incomeModel = lookup(INCOME_MODEL_WORDS, raw.incomeModel) ?? null;
  if (raw.incomeModel && !incomeModel) warnings.push(`Tipo «${raw.incomeModel}» no reconocido`);
  const paymentFrequency = lookup(FREQUENCY_WORDS, raw.paymentFrequency);
  if (raw.paymentFrequency && !paymentFrequency) warnings.push(`Frecuencia «${raw.paymentFrequency}» no reconocida`);
  const principalReturnType = lookup(PRINCIPAL_WORDS, raw.principalReturnType);

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
  if ((incomeModel === 'periodic_fixed' || incomeModel === 'amortizing') && !paymentFrequency) {
    missing.push('investments.field.paymentFrequency');
  }
  // Equity: el tipo de retorno (plusvalía, rentas o liquidación) decide qué
  // cobros tributan; no viene en ningún Excel, así que siempre lo elige el usuario.
  if (incomeModel === 'equity') missing.push('investments.field.equityType');
  const complete = missing.length === 0;

  return {
    complete,
    missing,
    warnings,
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
      paymentFrequency,
      principalReturnType,
      status: complete ? 'active' : 'draft',
      notes,
    },
  };
}

// ─── Archivo completo ────────────────────────────────────────────────────────

/** Lo mínimo que hace falta de una inversión ya guardada para detectar repetidas. */
export interface ExistingInvestmentKey {
  platform?: string | null;
  customPlatformName?: string | null;
  projectName?: string | null;
  amount?: number | null;
  investmentDate?: string | null;
}

function duplicateKey(inv: ExistingInvestmentKey): string | null {
  if (!inv.projectName || inv.amount == null || !inv.investmentDate) return null;
  const platform = inv.platform === 'other' ? `other:${normalizeText(inv.customPlatformName ?? '')}` : inv.platform;
  return [platform, normalizeText(inv.projectName), Number(inv.amount).toFixed(2), inv.investmentDate.slice(0, 10)].join('|');
}

/**
 * Todas las filas del archivo. Las que no tienen nombre de proyecto no se
 * importan (sin nombre no hay forma de reconocerlas luego en la lista).
 */
export function buildImportCandidates(
  rows: SheetRow[],
  existing: ExistingInvestmentKey[],
  opts: BuildOptions = {},
): { candidates: ImportCandidate[]; withoutName: number[] } {
  const existingKeys = new Set(existing.map(duplicateKey).filter(Boolean) as string[]);
  const candidates: ImportCandidate[] = [];
  const withoutName: number[] = [];
  for (const row of fixUsDateColumns(rows)) {
    const built = buildInvestmentFromRow(row.raw, opts);
    if (!built.investment.projectName) { withoutName.push(row.rowNumber); continue; }
    // Fila de ejemplo de la plantilla que el usuario no ha borrado.
    if (normalizeText(built.investment.projectName).startsWith('ejemplo ')) continue;
    const key = duplicateKey(built.investment);
    candidates.push({ ...built, rowNumber: row.rowNumber, duplicate: key !== null && existingKeys.has(key) });
  }
  return { candidates, withoutName };
}
