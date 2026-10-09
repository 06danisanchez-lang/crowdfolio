import type {
  Investment, DraftInvestment, Payment, Platform, InvestmentStatus, IncomeModel,
  PaymentFrequency, PrincipalReturnType, EquityType, CloseReasonType,
  LossInsolvencyStatus, LossEnforcementInitiator, InvestmentFxFields, ExchangeRateSource,
} from '@/types/investment';

// Fila cruda tal cual la devuelve `supabase.from('investments').select('*')`.
export interface RawInvestmentRow {
  id: string;
  platform: string | null;
  custom_platform_name: string | null;
  project_name: string | null;
  amount: number | null;
  investment_date: string | null;
  expected_end_date: string | null;
  expected_return: number | null;
  income_model: string | null;
  payment_frequency: string | null;
  first_payment_date: string | null;
  principal_return_type: string | null;
  status: string;
  notes: string | null;
  source_url: string | null;
  defaulted_at: string | null;
  amount_recovered: number | null;
  equity_type: string | null;
  actual_end_date: string | null;
  close_reason: string | null;
  was_extended: boolean | null;
  original_end_date?: string | null;
  loss_insolvency_status: string | null;
  loss_insolvency_concluded_date: string | null;
  loss_quita_amount: number | null;
  loss_quita_date: string | null;
  loss_enforcement_started: boolean | null;
  loss_enforcement_date: string | null;
  loss_enforcement_initiator: string | null;
  loss_assessed_at: string | null;
  loss_rules_version: number | null;
  // Divisa (opcionales: filas y tests antiguos no las traen)
  currency?: string | null;
  original_amount?: number | null;
  exchange_rate?: number | null;
  exchange_rate_date?: string | null;
  exchange_rate_source?: string | null;
  created_at: string;
  updated_at: string;
  user_id: string;
}

/**
 * Fila cruda de Postgres (snake_case) → DraftInvestment (camelCase, todo
 * opcional). Usado por useInvestments.ts al leer `investments`.
 */
export function mapRawInvestmentRow(
  inv: RawInvestmentRow,
  payments: Payment[],
  statusOverride?: InvestmentStatus,
): DraftInvestment {
  return {
    id: inv.id,
    platform: (inv.platform as Platform) || undefined,
    customPlatformName: inv.custom_platform_name || undefined,
    projectName: inv.project_name || undefined,
    amount: inv.amount != null ? Number(inv.amount) : undefined,
    investmentDate: inv.investment_date || undefined,
    expectedEndDate: inv.expected_end_date || undefined,
    expectedReturn: inv.expected_return != null ? Number(inv.expected_return) : undefined,
    incomeModel: (inv.income_model as IncomeModel) || undefined,
    paymentFrequency: (inv.payment_frequency as PaymentFrequency) || undefined,
    firstPaymentDate: inv.first_payment_date || undefined,
    principalReturnType: (inv.principal_return_type as PrincipalReturnType) || undefined,
    status: statusOverride ?? ((inv.status as InvestmentStatus) || 'active'),
    notes: inv.notes || undefined,
    sourceUrl: inv.source_url || undefined,
    defaultedAt: inv.defaulted_at || undefined,
    amountRecovered: inv.amount_recovered != null ? Number(inv.amount_recovered) : undefined,
    equityType: (inv.equity_type as EquityType) || undefined,
    actualEndDate: inv.actual_end_date || undefined,
    closeReason: (inv.close_reason as CloseReasonType) || undefined,
    wasExtended: inv.was_extended ?? false,
    originalEndDate: inv.original_end_date || undefined,
    lossInsolvencyStatus: (inv.loss_insolvency_status as LossInsolvencyStatus) || undefined,
    lossInsolvencyConcludedDate: inv.loss_insolvency_concluded_date || undefined,
    lossQuitaAmount: inv.loss_quita_amount != null ? Number(inv.loss_quita_amount) : undefined,
    lossQuitaDate: inv.loss_quita_date || undefined,
    lossEnforcementStarted: inv.loss_enforcement_started ?? undefined,
    lossEnforcementDate: inv.loss_enforcement_date || undefined,
    lossEnforcementInitiator: (inv.loss_enforcement_initiator as LossEnforcementInitiator) || undefined,
    lossAssessedAt: inv.loss_assessed_at || undefined,
    lossRulesVersion: inv.loss_rules_version ?? undefined,
    ...mapFxColumns(inv),
    createdAt: inv.created_at,
    updatedAt: inv.updated_at,
    payments,
  };
}

/**
 * DraftInvestment (campos opcionales, ya con tracking_ready comprobado por el
 * llamador vía isInvestmentComplete) → Investment (campos requeridos). Bug
 * corregido aquí: esta conversión omitía sourceUrl, defaultedAt,
 * amountRecovered y las 9 columnas loss_* — al ser todas opcionales en
 * Investment, TypeScript no lo marcaba como error, así que la ficha fiscal
 * (DefaultLossStatusCard) recibía lossAssessedAt undefined y mostraba
 * "not_assessed" aunque la BD tuviera la calificación fiscal ya guardada.
 */
export function draftToInvestment(raw: DraftInvestment): Investment {
  return {
    id: raw.id,
    platform: raw.platform as Platform,
    customPlatformName: raw.customPlatformName,
    projectName: raw.projectName as string,
    amount: raw.amount as number,
    investmentDate: raw.investmentDate as string,
    expectedEndDate: raw.expectedEndDate,
    expectedReturn: raw.expectedReturn as number,
    incomeModel: raw.incomeModel as IncomeModel,
    paymentFrequency: raw.paymentFrequency || undefined,
    firstPaymentDate: raw.firstPaymentDate,
    principalReturnType: raw.principalReturnType || undefined,
    equityType: raw.equityType,
    status: raw.status,
    payments: raw.payments,
    notes: raw.notes,
    sourceUrl: raw.sourceUrl,
    defaultedAt: raw.defaultedAt,
    amountRecovered: raw.amountRecovered,
    actualEndDate: raw.actualEndDate,
    closeReason: raw.closeReason,
    wasExtended: raw.wasExtended,
    originalEndDate: raw.originalEndDate,
    lossInsolvencyStatus: raw.lossInsolvencyStatus,
    lossInsolvencyConcludedDate: raw.lossInsolvencyConcludedDate,
    lossQuitaAmount: raw.lossQuitaAmount,
    lossQuitaDate: raw.lossQuitaDate,
    lossEnforcementStarted: raw.lossEnforcementStarted,
    lossEnforcementDate: raw.lossEnforcementDate,
    lossEnforcementInitiator: raw.lossEnforcementInitiator,
    lossAssessedAt: raw.lossAssessedAt,
    lossRulesVersion: raw.lossRulesVersion,
    currency: raw.currency,
    originalAmount: raw.originalAmount,
    exchangeRate: raw.exchangeRate,
    exchangeRateDate: raw.exchangeRateDate,
    exchangeRateSource: raw.exchangeRateSource,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

/** Columnas de divisa de `investments` → campos camelCase. EUR si no hay divisa. */
export function mapFxColumns(inv: {
  currency?: string | null;
  original_amount?: number | string | null;
  exchange_rate?: number | string | null;
  exchange_rate_date?: string | null;
  exchange_rate_source?: string | null;
}): InvestmentFxFields {
  const currency = inv.currency || 'EUR';
  if (currency === 'EUR') return { currency };
  return {
    currency,
    originalAmount: inv.original_amount != null ? Number(inv.original_amount) : undefined,
    exchangeRate: inv.exchange_rate != null ? Number(inv.exchange_rate) : undefined,
    exchangeRateDate: inv.exchange_rate_date || undefined,
    exchangeRateSource: (inv.exchange_rate_source as ExchangeRateSource) || undefined,
  };
}

/** Columnas de divisa de una inversión para insert/update. En euros, todas a NULL. */
export function fxFieldsToColumns(fx: InvestmentFxFields, amountEur: number | null | undefined) {
  const foreign = !!fx.currency && fx.currency !== 'EUR';
  return {
    currency: foreign ? fx.currency! : 'EUR',
    original_amount: foreign ? fx.originalAmount ?? null : null,
    original_currency: foreign ? fx.currency! : null,
    exchange_rate: foreign ? fx.exchangeRate ?? null : null,
    exchange_rate_date: foreign ? fx.exchangeRateDate ?? null : null,
    exchange_rate_source: foreign ? fx.exchangeRateSource ?? null : null,
    amount_eur: foreign ? amountEur ?? null : null,
  };
}

/** Fila de `payments` (select '*') → Payment, con los campos de divisa. */
export function mapPaymentRow(p: Record<string, unknown>): Payment {
  const num = (v: unknown) => (v != null ? Number(v) : undefined);
  return {
    id: p.id as string,
    date: p.date as string,
    amount: Number(p.amount),
    type: p.type as Payment['type'],
    notes: (p.notes as string) || undefined,
    withholdingApplied: p.withholding_applied != null ? Number(p.withholding_applied) : 0,
    originalAmount: num(p.original_amount),
    originalCurrency: (p.original_currency as string) || undefined,
    exchangeRate: num(p.exchange_rate),
    exchangeRateDate: (p.exchange_rate_date as string) || undefined,
    exchangeRateSource: (p.exchange_rate_source as ExchangeRateSource) || undefined,
    amountEur: num(p.amount_eur),
    foreignWithholdingAmount: num(p.foreign_withholding_amount),
    foreignWithholdingCurrency: (p.foreign_withholding_currency as string) || undefined,
  };
}

/** Payment → columnas de divisa para insert. Cobro en euros: todas a NULL. */
export function paymentFxColumns(p: Omit<Payment, 'id'>) {
  return {
    original_amount: p.originalAmount ?? null,
    original_currency: p.originalCurrency ?? null,
    exchange_rate: p.exchangeRate ?? null,
    exchange_rate_date: p.exchangeRateDate ?? null,
    exchange_rate_source: p.exchangeRateSource ?? null,
    amount_eur: p.originalCurrency ? (p.amountEur ?? p.amount) : null,
    foreign_withholding_amount: p.foreignWithholdingAmount ?? null,
    foreign_withholding_currency: p.foreignWithholdingAmount ? (p.foreignWithholdingCurrency ?? null) : null,
  };
}
