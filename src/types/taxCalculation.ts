import { TaxBracket } from './tax';

// IRPF 2025 Spanish savings income tax brackets
export const SPAIN_TAX_BRACKETS_2025: TaxBracket[] = [
  { min: 0, max: 6000, rate: 0.19 },
  { min: 6000, max: 50000, rate: 0.21 },
  { min: 50000, max: 200000, rate: 0.23 },
  { min: 200000, max: 300000, rate: 0.27 },
  { min: 300000, max: Infinity, rate: 0.30 },
];

// Tax calculation result from edge function
export interface TaxCalculationResult {
  year: number;
  
  // RCM - Rendimientos del Capital Mobiliario
  rcm: {
    interestIncome: number;
    dividendIncome: number;
    deductibleExpenses: number;
    grossBalance: number;
    netBalance: number;
  };
  
  // GPP - Ganancias y Pérdidas Patrimoniales
  gpp: {
    gains: number;
    losses: number;
    grossBalance: number;
    netBalance: number;
  };
  
  // Compensation applied
  compensation: {
    intraBucketRCM: number;
    intraBucketGPP: number;
    crossBucketAmount: number;
    crossBucketDirection: 'RCM_TO_GPP' | 'GPP_TO_RCM' | 'NONE';
    maxCrossBucket: number; // 25% limit
  };
  
  // Losses carried forward
  lossesCarried: {
    fromPreviousYears: {
      rcm: number;
      gpp: number;
    };
    toNextYears: {
      rcm: number;
      gpp: number;
    };
  };
  
  // Tax calculation
  taxableBase: number;
  grossTax: number;
  
  // Double taxation deduction
  doubleTaxation: {
    foreignIncome: number;
    foreignWithholdings: number;
    effectiveRate: number;
    deduction: number;
  };
  
  // Withholdings
  totalWithholdings: {
    spanish: number;
    foreign: number;
    total: number;
  };
  
  // Final result
  netTax: number;
  result: number; // Positive = to pay, Negative = refund
  effectiveRate: number;
  
  // Breakdown by bracket
  bracketBreakdown: {
    bracket: TaxBracket;
    amount: number;
    tax: number;
  }[];
}

// Summary for dashboard cards
export interface TaxDashboardSummary {
  totalInvested: number;
  grossProfit: number;
  estimatedTax: number;
  withholdingsPaid: number;
  lendingAmount: number;
  equityAmount: number;
  foreignAmount: number;
}

// Alerts
export interface TaxAlert {
  type: 'MODELO_720' | 'WITHHOLDING_FOREIGN' | 'LOSSES_EXPIRING' | 'HIGH_TAX';
  severity: 'info' | 'warning' | 'error';
  title: string;
  message: string;
  threshold?: number;
  currentValue?: number;
}

// Transaction with asset info for display
export interface TransactionWithAsset {
  transaction: {
    id: string;
    assetId: string;
    date: string;
    type: 'INTEREST' | 'DIVIDEND' | 'SALE' | 'LOSS';
    grossAmount: number;
    withholdingAmount: number;
    currency: string;
    notes?: string;
  };
  asset: {
    id: string;
    platformName: string;
    projectName: string;
    countryCode: string;
    assetType: 'LENDING' | 'EQUITY';
    acquisitionCost: number;
  };
}
