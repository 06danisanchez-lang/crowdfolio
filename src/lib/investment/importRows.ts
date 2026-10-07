import { Investment, PLATFORMS, Platform, IncomeModel, PaymentFrequency, PrincipalReturnType } from '@/types/investment';
import { parseImportDate } from '@/lib/investment/parseImportDate';
import { parseSpanishNumber } from '@/lib/investment/parseSpanishNumber';
import { toDateOnlyString } from '@/lib/dateOnly';

/**
 * Construcción de inversiones a partir de filas de CSV/XLSX importadas.
 * Separado de ImportExport.tsx para poder testearlo y para que el
 * componente solo exporte componentes (fast refresh).
 */

export type RawRow = Record<string, string>;

// ─── Validation & Investment builder ─────────────────────────────────────────

const VALID_INCOME_MODELS = ['bullet', 'periodic_fixed', 'amortizing', 'variable_or_unknown', 'equity'];
const VALID_FREQ = ['monthly', 'quarterly', 'semiannual', 'annual'];
const VALID_PRT = ['at_maturity', 'amortizing', 'unknown'];

function isImportComplete(
  platform: string,
  projectName: string,
  amount: number | null,
  investmentDate: string | null,
  incomeModel: IncomeModel | null,
  expectedReturn: number | null,
  expectedEndDate: string | undefined,
  paymentFrequency: PaymentFrequency | undefined,
): boolean {
  if (!platform || !projectName.trim()) return false;
  if (amount == null || isNaN(amount) || amount <= 0) return false;
  if (!investmentDate) return false;
  if (!incomeModel) return false;
  if (expectedReturn == null || isNaN(expectedReturn)) return false;
  if (!expectedEndDate) return false;
  if ((incomeModel === 'periodic_fixed' || incomeModel === 'amortizing') && !paymentFrequency) return false;
  return true;
}

/** Número de un archivo importado. Acepta formato español ("1.500,50") y el
 * que exporta Crowdfolio ("1500.5"). null si está vacío o no se reconoce. */
function parseImportNumber(raw: string | undefined): number | null {
  const parsed = parseSpanishNumber(raw ?? '');
  if (parsed.error || parsed.value === null || !Number.isFinite(parsed.value)) return null;
  return parsed.value;
}

export function buildInvestmentFromRow(raw: RawRow): [Investment, boolean] {
  // platform
  const platformRaw = (raw.platform || '').toLowerCase().trim();
  const matched = PLATFORMS.find(p => p.label.toLowerCase() === platformRaw || p.value === platformRaw);
  const platform = (matched?.value ?? 'other') as Platform;
  const customPlatformName = platform === 'other' && raw.platform?.trim() ? raw.platform.trim() : undefined;

  // projectName
  const projectName = (raw.projectName || '').trim();

  // amount — no silent default; null signals missing. Formato español
  // ("1.500,50"): antes "1.500" se leía como 1,5 €.
  const amount = parseImportNumber(raw.amount);

  // Fechas — 'YYYY-MM-DD' o dd/mm/yyyy, sin pasar por UTC (ver parseImportDate).
  // No se rellena con hoy: sin fecha válida la inversión queda como borrador.
  const investmentDate = parseImportDate(raw.investmentDate);
  const expectedEndDate = parseImportDate(raw.expectedEndDate) ?? undefined;

  // expectedReturn — no silent default; fuera de 0-100 % se trata como inválido
  // (igual que el formulario).
  const parsedReturn = parseImportNumber(raw.expectedReturn);
  const expectedReturn = parsedReturn != null && parsedReturn >= 0 && parsedReturn <= 100 ? parsedReturn : null;

  // incomeModel — only valid values, invalid → null
  const incomeModelRaw = (raw.incomeModel || '').toLowerCase().trim();
  const incomeModel = VALID_INCOME_MODELS.includes(incomeModelRaw) ? (incomeModelRaw as IncomeModel) : null;

  // paymentFrequency
  const freqRaw = (raw.paymentFrequency || '').toLowerCase().trim();
  const paymentFrequency = VALID_FREQ.includes(freqRaw) ? (freqRaw as PaymentFrequency) : undefined;

  // principalReturnType
  const prtRaw = (raw.principalReturnType || '').toLowerCase().trim();
  const principalReturnType = VALID_PRT.includes(prtRaw) ? (prtRaw as PrincipalReturnType) : undefined;

  // notes
  const notes = raw.notes?.trim() || undefined;

  const complete = isImportComplete(
    platform, projectName, amount, investmentDate,
    incomeModel, expectedReturn, expectedEndDate, paymentFrequency,
  );

  const investment: Investment = {
    id: crypto.randomUUID(),
    platform,
    customPlatformName,
    projectName: projectName || 'Sin nombre',
    // For drafts, store 0/placeholder — status='draft' signals incompleteness
    amount: (amount != null && !isNaN(amount) && amount > 0) ? amount : 0,
    investmentDate: investmentDate ?? toDateOnlyString(new Date()),
    expectedEndDate,
    expectedReturn: (expectedReturn != null && !isNaN(expectedReturn)) ? expectedReturn : 0,
    incomeModel: incomeModel ?? 'variable_or_unknown',
    paymentFrequency,
    principalReturnType,
    status: complete ? 'active' : 'draft',
    notes,
    payments: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return [investment, complete];
}

