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
  amountInvested: number;
  amountRecovered: number;
  loss: number;              // negative: amountRecovered - amountInvested
  defaultedAt?: string;
  expectedEndDate?: string;
  qualifiesForDeduction: boolean;
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
  // GPP — Ganancias y Pérdidas Patrimoniales (art. 14.2.k LIRPF)
  totalGPPLosses: number;           // suma de pérdidas elegibles (negativo o 0)
  compensacionGPPRCM: number;       // pérdida GPP compensada contra RCM (límite 25%)
  perdidasGPPPendientes: number;    // pérdida no compensada, arrastrable 4 años
  baseImponibleRCMAjustada: number; // grossIncome − compensacionGPPRCM
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
