import type { ForeignIncomeSummary } from '@/lib/currency/fx';
import type { MissingWithholdingSummary } from '@/lib/tax/withholding';

// Rendimientos del capital mobiliario (art. 26.1.a LIRPF): solo son deducibles
// los gastos de administración y depósito de valores negociables. Asesoría,
// desplazamientos o herramientas de seguimiento no lo son, y por eso ya no se
// ofrecen (oct 2026). Las comisiones de plataforma están pendientes de confirmar
// con el asesor fiscal: se dejan, con aviso.
export type TaxExpenseCategory =
  | 'custody'
  | 'platform_fees'
  | 'other';

export interface TaxExpense {
  id: string;
  userId: string;
  year: number;
  category: TaxExpenseCategory;
  description: string;
  amount: number;
  date: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaxSummary {
  year: number;
  // RCM — Rendimientos del Capital Mobiliario
  grossIncome: number;
  interestIncome: number;
  dividendIncome: number;
  principalReturns: number;
  withholdingsApplied: number;
  deductibleExpenses: number;
  // Las pérdidas por impago (art. 14.2.k LIRPF) se declaran en la base imponible
  // GENERAL, no en la del ahorro — nunca afectan a baseImponibleRCMAjustada ni a
  // taxableBase/estimatedTax. Ver useTaxSummary.ts (defaultLossSummary,
  // computeDefaultLossSummary) y TaxBucketsCard.tsx (Fase 5).
  baseImponibleRCMAjustada: number; // = grossIncome (sin ninguna compensación con GPP)
  // Base y cuota
  taxableBase: number;              // baseImponibleRCMAjustada − deductibleExpenses
  estimatedTax: number;
  effectiveRate: number;
  // Equity liquidacion sin retención — declaración manual requerida
  liquidacionSinRetencion: EnrichedPayment[];
  // Cobros de plataformas españolas sin retención registrada (ver lib/tax/withholding.ts)
  incomeWithoutWithholding: MissingWithholdingSummary;
  /** Rentas de inversiones en otra divisa y retención en origen (art. 80 LIRPF). */
  foreignIncome?: ForeignIncomeSummary;
}

export interface EnrichedPayment {
  id: string;
  date: string;
  amount: number;
  type: string;
  withholdingApplied: number;
  investmentId: string;
  investmentName: string;
  platform: string;
  equityType?: string;
}

export interface TaxBracket {
  min: number;
  max: number;
  rate: number;
}

export const TAX_EXPENSE_CATEGORIES: { value: TaxExpenseCategory; label: string }[] = [
  { value: 'custody', label: 'Administración y depósito' },
  { value: 'platform_fees', label: 'Comisiones de plataforma (a confirmar)' },
  { value: 'other', label: 'Otros gastos de administración' },
];

/** Aviso que se muestra al elegir una categoría cuya deducibilidad no está clara. */
export const TAX_EXPENSE_CATEGORY_WARNINGS: Partial<Record<TaxExpenseCategory, string>> = {
  platform_fees:
    'Hacienda solo admite como gasto los de administración y depósito. Algunas comisiones de plataforma pueden no serlo: confírmalo con tu asesor antes de restarlas.',
  other:
    'Solo es deducible si es un gasto de administración o depósito. Asesoría, desplazamientos o herramientas de seguimiento no lo son.',
};

// Spanish savings income tax brackets — 2025 (Ley 7/2024)
export const SPAIN_TAX_BRACKETS: TaxBracket[] = [
  { min: 0, max: 6000, rate: 0.19 },
  { min: 6000, max: 50000, rate: 0.21 },
  { min: 50000, max: 200000, rate: 0.23 },
  { min: 200000, max: 300000, rate: 0.27 },
  { min: 300000, max: Infinity, rate: 0.30 },
];
