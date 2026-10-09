export type Platform = 
  | 'urbanitae'
  | 'housers'
  | 'estateguru'
  | 'crowdcube'
  | 'brickstarter'
  | 'wecity'
  | 'other';

export type View = 'dashboard' | 'investments' | 'payments' | 'future-investments' | 'tax' | 'settings' | 'profile' | 'admin';

export type InvestmentStatus = 'draft' | 'active' | 'pending' | 'completed' | 'defaulted';

export type CloseReasonType = 'on_time' | 'early' | 'extended' | 'sold';

export type IncomeModel = 'bullet' | 'periodic_fixed' | 'amortizing' | 'variable_or_unknown' | 'equity';

export type EquityType = 'plusvalia' | 'rentas' | 'liquidacion';

export type PaymentFrequency = 'monthly' | 'quarterly' | 'semiannual' | 'annual';

export type PrincipalReturnType = 'at_maturity' | 'amortizing' | 'unknown';

// Calificación fiscal de la pérdida por impago (art. 14.2.k LIRPF) — Fase 2/3.
// Ver src/lib/tax/defaultLoss.ts (motor) y src/lib/tax/answersToLossColumns.ts
// (cuestionario → estas columnas).
export type LossInsolvencyStatus = 'none' | 'open' | 'concluded_unpaid' | 'unknown';
export type LossEnforcementInitiator = 'user' | 'platform';

/**
 * - interest: intereses de préstamo (RCM).
 * - dividend: dividendos o beneficio repartido como dividendo (RCM).
 * - principal: devolución de capital aportado (no es renta).
 * - capital_return: devolución de prima de emisión, equity 'rentas' (no es renta).
 * - capital_gain: ganancia patrimonial al cerrar un equity por liquidación de la
 *   sociedad o venta (base del ahorro, NO es RCM). Crowdfolio no la integra en el
 *   cálculo: la lista para declararla manualmente. Ver lib/investment/equityExit.ts.
 */
export type PaymentType = 'dividend' | 'principal' | 'interest' | 'capital_return' | 'capital_gain';

export interface Payment {
  id: string;
  date: string;
  amount: number;
  type: PaymentType;
  notes?: string;
  /** Retención a cuenta del IRPF practicada por la plataforma, en euros.
   * Solo intereses y dividendos (ver lib/tax/withholding.ts). */
  withholdingApplied?: number;
  // ── Cobros de inversiones en otra divisa (ver lib/currency/fx.ts) ──
  // `amount` es SIEMPRE el importe en euros: originalAmount × exchangeRate.
  /** Importe cobrado en la divisa de la inversión. */
  originalAmount?: number;
  /** ISO 4217 de originalAmount. Vacío = cobro en euros. */
  originalCurrency?: string;
  /** Euros por 1 unidad de originalCurrency, del día del cobro. */
  exchangeRate?: number;
  /** Fecha del tipo de cambio (la del BCE puede ser anterior si el cobro cae en festivo). */
  exchangeRateDate?: string;
  exchangeRateSource?: ExchangeRateSource;
  /** = amount cuando el cobro es en otra divisa. */
  amountEur?: number;
  /** Retención practicada en el país de la plataforma, en su divisa. */
  foreignWithholdingAmount?: number;
  foreignWithholdingCurrency?: string;
}

/** 'ecb' = tipo de referencia del BCE propuesto por la app; 'manual' = escrito por el usuario. */
export type ExchangeRateSource = 'ecb' | 'manual';

/** Campos de divisa de una inversión. `amount` sigue siendo SIEMPRE euros. */
export interface InvestmentFxFields {
  /** ISO 4217. Vacío o 'EUR' = inversión en euros. */
  currency?: string;
  /** Importe invertido en `currency`. */
  originalAmount?: number;
  /** Euros por 1 unidad de `currency`, del día de la inversión. */
  exchangeRate?: number;
  exchangeRateDate?: string;
  exchangeRateSource?: ExchangeRateSource;
}

export interface Investment extends InvestmentFxFields {
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
  /** Fecha real del primer cobro, si se conoce (solo periodic_fixed/amortizing).
   * Sin ella, el calendario estima el primero como investmentDate + 1 periodo. */
  firstPaymentDate?: string | null;
  principalReturnType?: PrincipalReturnType;
  status: InvestmentStatus;
  payments: Payment[];
  notes?: string;
  sourceUrl?: string;
  defaultedAt?: string;
  amountRecovered?: number;
  equityType?: EquityType;
  actualEndDate?: string | null;
  closeReason?: CloseReasonType | null;
  wasExtended?: boolean;
  /** Vencimiento prometido al invertir. Solo existe si la fecha se ha movido por
   * prórroga o retraso; si no, vale expectedEndDate. Ver getOriginalEndDate(). */
  originalEndDate?: string | null;
  lossInsolvencyStatus?: LossInsolvencyStatus | null;
  lossInsolvencyConcludedDate?: string | null;
  lossQuitaAmount?: number | null;
  lossQuitaDate?: string | null;
  lossEnforcementStarted?: boolean | null;
  lossEnforcementDate?: string | null;
  lossEnforcementInitiator?: LossEnforcementInitiator | null;
  lossAssessedAt?: string | null;
  lossRulesVersion?: number | null;
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

/**
 * Catálogo de plataformas. `defaultCurrency` es la divisa que el formulario
 * propone al elegir la plataforma en una inversión nueva; el usuario la puede
 * cambiar. 'other' no propone nada (euros salvo que se elija otra).
 * - urbanitae, housers, brickstarter, wecity: España, EUR.
 * - estateguru: Estonia, EUR.
 * - crowdcube: Reino Unido, capta en libras (GBP).
 */
export const PLATFORMS: { value: Platform; label: string; color: string; country?: string; defaultCurrency?: string }[] = [
  { value: 'urbanitae', label: 'Urbanitae', color: 'platform-urbanitae', country: 'ES', defaultCurrency: 'EUR' },
  { value: 'housers', label: 'Housers', color: 'platform-housers', country: 'ES', defaultCurrency: 'EUR' },
  { value: 'estateguru', label: 'Estateguru', color: 'platform-estateguru', country: 'EE', defaultCurrency: 'EUR' },
  { value: 'crowdcube', label: 'Crowdcube', color: 'platform-crowdcube', country: 'GB', defaultCurrency: 'GBP' },
  { value: 'brickstarter', label: 'Brickstarter', color: 'platform-brickstarter', country: 'ES', defaultCurrency: 'EUR' },
  { value: 'wecity', label: 'Wecity', color: 'platform-wecity', country: 'ES', defaultCurrency: 'EUR' },
  { value: 'other', label: 'Otra', color: 'platform-other' },
];

export interface DraftInvestment extends InvestmentFxFields {
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
  firstPaymentDate?: string | null;
  principalReturnType?: PrincipalReturnType | null;
  status: InvestmentStatus;
  payments: Payment[];
  notes?: string;
  sourceUrl?: string;
  defaultedAt?: string;
  amountRecovered?: number;
  equityType?: EquityType;
  actualEndDate?: string | null;
  closeReason?: CloseReasonType | null;
  wasExtended?: boolean;
  /** Vencimiento prometido al invertir. Solo existe si la fecha se ha movido por
   * prórroga o retraso; si no, vale expectedEndDate. Ver getOriginalEndDate(). */
  originalEndDate?: string | null;
  lossInsolvencyStatus?: LossInsolvencyStatus | null;
  lossInsolvencyConcludedDate?: string | null;
  lossQuitaAmount?: number | null;
  lossQuitaDate?: string | null;
  lossEnforcementStarted?: boolean | null;
  lossEnforcementDate?: string | null;
  lossEnforcementInitiator?: LossEnforcementInitiator | null;
  lossAssessedAt?: string | null;
  lossRulesVersion?: number | null;
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
  { value: 'equity', labelKey: 'investments.incomeModel.equity' },
];

export const EQUITY_TYPE_OPTIONS: { value: EquityType; labelKey: string; hintKey: string }[] = [
  { value: 'plusvalia', labelKey: 'investments.equityType.plusvalia', hintKey: 'investments.equityType.hint.plusvalia' },
  { value: 'rentas', labelKey: 'investments.equityType.rentas', hintKey: 'investments.equityType.hint.rentas' },
  { value: 'liquidacion', labelKey: 'investments.equityType.liquidacion', hintKey: 'investments.equityType.hint.liquidacion' },
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
