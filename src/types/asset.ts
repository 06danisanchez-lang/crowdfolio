// Asset types matching database enums
export type AssetType = 'LENDING' | 'EQUITY';
export type TransactionType = 'INTEREST' | 'DIVIDEND' | 'SALE' | 'LOSS';

export interface Asset {
  id: string;
  userId: string;
  platformName: string;
  projectName: string;
  countryCode: string;
  assetType: AssetType;
  acquisitionCost: number;
  investmentDate: string;
  expectedEndDate?: string;
  expectedReturn: number;
  status: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  assetId: string;
  date: string;
  type: TransactionType;
  grossAmount: number;
  withholdingAmount: number;
  currency: string;
  notes?: string;
  createdAt: string;
}

export interface TaxYear {
  id: string;
  userId: string;
  year: number;
  rcmLossesCarried: number;
  gppLossesCarried: number;
  createdAt: string;
  updatedAt: string;
}

// Database row types for Supabase
export interface AssetRow {
  id: string;
  user_id: string;
  platform_name: string;
  project_name: string;
  country_code: string;
  asset_type: AssetType;
  acquisition_cost: number;
  investment_date: string;
  expected_end_date: string | null;
  expected_return: number;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface TransactionRow {
  id: string;
  asset_id: string;
  date: string;
  type: TransactionType;
  gross_amount: number;
  withholding_amount: number;
  currency: string;
  notes: string | null;
  created_at: string;
}

export interface TaxYearRow {
  id: string;
  user_id: string;
  year: number;
  rcm_losses_carried: number;
  gpp_losses_carried: number;
  created_at: string;
  updated_at: string;
}

// Conversion functions
export function assetFromRow(row: AssetRow): Asset {
  return {
    id: row.id,
    userId: row.user_id,
    platformName: row.platform_name,
    projectName: row.project_name,
    countryCode: row.country_code,
    assetType: row.asset_type,
    acquisitionCost: Number(row.acquisition_cost),
    investmentDate: row.investment_date,
    expectedEndDate: row.expected_end_date || undefined,
    expectedReturn: Number(row.expected_return),
    status: row.status,
    notes: row.notes || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function transactionFromRow(row: TransactionRow): Transaction {
  return {
    id: row.id,
    assetId: row.asset_id,
    date: row.date,
    type: row.type,
    grossAmount: Number(row.gross_amount),
    withholdingAmount: Number(row.withholding_amount),
    currency: row.currency,
    notes: row.notes || undefined,
    createdAt: row.created_at,
  };
}

export function taxYearFromRow(row: TaxYearRow): TaxYear {
  return {
    id: row.id,
    userId: row.user_id,
    year: row.year,
    rcmLossesCarried: Number(row.rcm_losses_carried),
    gppLossesCarried: Number(row.gpp_losses_carried),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Asset type labels for UI
export const ASSET_TYPE_LABELS: Record<AssetType, { label: string; description: string }> = {
  LENDING: {
    label: 'Préstamo participativo',
    description: 'Crowdlending - Genera Rendimientos del Capital Mobiliario (intereses)',
  },
  EQUITY: {
    label: 'Participación en sociedad',
    description: 'Entrada en capital (acciones) - Genera dividendos y ganancias/pérdidas patrimoniales',
  },
};

// Transaction type labels for UI
export const TRANSACTION_TYPE_LABELS: Record<TransactionType, { label: string; description: string }> = {
  INTEREST: {
    label: 'Intereses',
    description: 'Rendimientos de préstamos participativos',
  },
  DIVIDEND: {
    label: 'Dividendos',
    description: 'Reparto de beneficios de participaciones',
  },
  SALE: {
    label: 'Venta',
    description: 'Transmisión de participaciones (ganancia o pérdida)',
  },
  LOSS: {
    label: 'Pérdida',
    description: 'Pérdida por impago o quiebra',
  },
};

// Common country codes for platforms
export const PLATFORM_COUNTRIES = [
  { code: 'ES', name: 'España', flag: '🇪🇸', defaultWithholding: 0.19 },
  { code: 'EE', name: 'Estonia', flag: '🇪🇪', defaultWithholding: 0 },
  { code: 'LT', name: 'Lituania', flag: '🇱🇹', defaultWithholding: 0 },
  { code: 'LV', name: 'Letonia', flag: '🇱🇻', defaultWithholding: 0 },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹', defaultWithholding: 0.28 },
  { code: 'FR', name: 'Francia', flag: '🇫🇷', defaultWithholding: 0.30 },
  { code: 'DE', name: 'Alemania', flag: '🇩🇪', defaultWithholding: 0.26375 },
  { code: 'IT', name: 'Italia', flag: '🇮🇹', defaultWithholding: 0.26 },
  { code: 'NL', name: 'Países Bajos', flag: '🇳🇱', defaultWithholding: 0.15 },
  { code: 'UK', name: 'Reino Unido', flag: '🇬🇧', defaultWithholding: 0 },
  { code: 'CH', name: 'Suiza', flag: '🇨🇭', defaultWithholding: 0.35 },
  { code: 'OTHER', name: 'Otro país', flag: '🌍', defaultWithholding: 0 },
];
