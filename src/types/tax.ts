export type TaxExpenseCategory = 
  | 'platform_fees'
  | 'advisory'
  | 'management'
  | 'travel'
  | 'other';

export interface TaxExpense {
  id: string;
  userId: string;
  year: number;
  category: TaxExpenseCategory;
  description: string;
  amount: number;
  date: string;
  investmentId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DefaultedInvestmentLoss {
  investmentId: string;
  projectName: string;
  platform: string;
  customPlatformName?: string;
  amountInvested: number;
  amountRecovered: number;   // suma de payments type 'principal' (getPrincipalReturned) — NO investments.amount_recovered
  loss: number;              // negative: amountRecovered - amountInvested
  defaultedAt?: string;
  expectedEndDate?: string;
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
  // Pérdidas de cartera por impago — Fase 1: el tratamiento fiscal real de estas
  // pérdidas depende de hechos formales (quita, conclusión de concurso, ejecución
  // judicial) que la app todavía no recoge. Por eso, mientras se implementa
  // correctamente (ver Fase 2/3), estos 4 campos NUNCA afectan a taxableBase ni a
  // estimatedTax: totalGPPLosses es solo el importe a mostrar en pantalla (sin
  // calificación fiscal), y los otros 3 son siempre 0.
  totalGPPLosses: number;           // suma de pérdidas de cartera por impago (negativo o 0) — solo display
  compensacionGPPRCM: number;       // siempre 0 (Fase 1)
  perdidasGPPPendientes: number;    // siempre 0 (Fase 1)
  baseImponibleRCMAjustada: number; // = grossIncome (sin compensación aplicada, Fase 1)
  // Base y cuota
  taxableBase: number;              // baseImponibleRCMAjustada − deductibleExpenses
  estimatedTax: number;
  effectiveRate: number;
  // Equity liquidacion sin retención — declaración manual requerida
  liquidacionSinRetencion: EnrichedPayment[];
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
  { value: 'platform_fees', label: 'Comisiones de plataforma' },
  { value: 'advisory', label: 'Gastos de asesoría' },
  { value: 'management', label: 'Gastos de gestión' },
  { value: 'travel', label: 'Gastos de desplazamiento' },
  { value: 'other', label: 'Otros gastos' },
];

// Spanish savings income tax brackets — 2025 (Ley 7/2024)
export const SPAIN_TAX_BRACKETS: TaxBracket[] = [
  { min: 0, max: 6000, rate: 0.19 },
  { min: 6000, max: 50000, rate: 0.21 },
  { min: 50000, max: 200000, rate: 0.23 },
  { min: 200000, max: 300000, rate: 0.27 },
  { min: 300000, max: Infinity, rate: 0.30 },
];
