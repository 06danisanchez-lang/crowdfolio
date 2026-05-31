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

export interface TaxSummary {
  year: number;
  grossIncome: number;
  interestIncome: number;
  dividendIncome: number;
  principalReturns: number;
  withholdingsApplied: number;
  deductibleExpenses: number;
  taxableBase: number;
  estimatedTax: number;
  effectiveRate: number;
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
