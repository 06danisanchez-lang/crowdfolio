export type Platform = 
  | 'urbanitae'
  | 'housers'
  | 'estateguru'
  | 'crowdcube'
  | 'brickstarter'
  | 'wecity'
  | 'other';

export type View = 'dashboard' | 'investments' | 'future-investments' | 'tax' | 'settings' | 'profile' | 'admin';

export type InvestmentStatus = 'draft' | 'active' | 'pending' | 'completed' | 'defaulted';

export type IncomeModel = 'bullet' | 'periodic_fixed' | 'amortizing' | 'variable_or_unknown';

export type PaymentFrequency = 'monthly' | 'quarterly' | 'semiannual' | 'annual';

export type PrincipalReturnType = 'at_maturity' | 'amortizing' | 'unknown';

export interface Payment {
  id: string;
  date: string;
  amount: number;
  type: 'dividend' | 'principal' | 'interest';
  notes?: string;
}

export interface Investment {
  id: string;
  platform: Platform;
  customPlatformName?: string;
  projectName: string;
  amount: number;
  investmentDate: string;
  expectedEndDate?: string;
  expectedReturn: number; // percentage
  incomeModel: IncomeModel;
  paymentFrequency?: PaymentFrequency;
  principalReturnType?: PrincipalReturnType;
  status: InvestmentStatus;
  payments: Payment[];
  notes?: string;
  sourceUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvestmentSummary {
  totalInvested: number;
  totalReturns: number;
  accruedReturns: number;
  activeInvestments: number;
  completedInvestments: number;
  averageReturn: number;
  byPlatform: Record<Platform, { invested: number; returns: number; count: number }>;
  byStatus: Record<InvestmentStatus, number>;
  activeSummary: {
    capital: number;
    estimatedTotal: number;
    accruedProfit: number;
    remainingProfit: number;
    count: number;
    withEndDateCount: number;
  };
  historicalSummary: {
    totalInvested: number;
    totalCollected: number;
    realizedProfit: number;
    completedCount: number;
  };
}

export const PLATFORMS: { value: Platform; label: string; color: string }[] = [
  { value: 'urbanitae', label: 'Urbanitae', color: 'platform-urbanitae' },
  { value: 'housers', label: 'Housers', color: 'platform-housers' },
  { value: 'estateguru', label: 'Estateguru', color: 'platform-estateguru' },
  { value: 'crowdcube', label: 'Crowdcube', color: 'platform-crowdcube' },
  { value: 'brickstarter', label: 'Brickstarter', color: 'platform-brickstarter' },
  { value: 'wecity', label: 'Wecity', color: 'platform-wecity' },
  { value: 'other', label: 'Otra', color: 'platform-other' },
];

export interface DraftInvestment {
  id: string;
  platform?: Platform | null;
  customPlatformName?: string;
  projectName?: string | null;
  amount?: number | null;
  investmentDate?: string | null;
  expectedEndDate?: string;
  expectedReturn?: number | null;
  incomeModel?: IncomeModel | null;
  paymentFrequency?: PaymentFrequency | null;
  principalReturnType?: PrincipalReturnType | null;
  status: InvestmentStatus;
  payments: Payment[];
  notes?: string;
  sourceUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvestmentScheduleEntry {
  id?: string;
  investmentId: string;
  expectedDate: string;
  expectedAmount: number;
  type: 'interest' | 'principal' | 'mixed';
  status?: 'pending' | 'matched' | 'missed' | 'skipped';
  matchedPaymentId?: string | null;
}

export const STATUS_OPTIONS: { value: InvestmentStatus; label: string; color: string }[] = [
  { value: 'draft', label: 'Borrador', color: 'status-draft' },
  { value: 'active', label: 'Activo', color: 'status-active' },
  { value: 'pending', label: 'Pendiente', color: 'status-pending' },
  { value: 'completed', label: 'Completado', color: 'status-completed' },
  { value: 'defaulted', label: 'Impago', color: 'status-defaulted' },
];

export const INCOME_MODEL_OPTIONS: { value: IncomeModel; labelKey: string }[] = [
  { value: 'bullet', labelKey: 'investments.incomeModel.bullet' },
  { value: 'periodic_fixed', labelKey: 'investments.incomeModel.periodicFixed' },
  { value: 'amortizing', labelKey: 'investments.incomeModel.amortizing' },
  { value: 'variable_or_unknown', labelKey: 'investments.incomeModel.variableOrUnknown' },
];

export const PAYMENT_FREQUENCY_OPTIONS: { value: PaymentFrequency; labelKey: string }[] = [
  { value: 'monthly', labelKey: 'investments.frequency.monthly' },
  { value: 'quarterly', labelKey: 'investments.frequency.quarterly' },
  { value: 'semiannual', labelKey: 'investments.frequency.semiannual' },
  { value: 'annual', labelKey: 'investments.frequency.annual' },
];

export const PRINCIPAL_RETURN_TYPE_OPTIONS: { value: PrincipalReturnType; labelKey: string }[] = [
  { value: 'at_maturity', labelKey: 'investments.principalReturn.atMaturity' },
  { value: 'amortizing', labelKey: 'investments.principalReturn.amortizing' },
  { value: 'unknown', labelKey: 'investments.principalReturn.unknown' },
];
