import type {
  Investment, DraftInvestment, Payment, Platform, InvestmentStatus, IncomeModel,
  PaymentFrequency, PrincipalReturnType, EquityType, CloseReasonType,
  LossInsolvencyStatus, LossEnforcementInitiator,
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
  loss_insolvency_status: string | null;
  loss_insolvency_concluded_date: string | null;
  loss_quita_amount: number | null;
  loss_quita_date: string | null;
  loss_enforcement_started: boolean | null;
  loss_enforcement_date: string | null;
  loss_enforcement_initiator: string | null;
  loss_assessed_at: string | null;
  loss_rules_version: number | null;
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
    lossInsolvencyStatus: (inv.loss_insolvency_status as LossInsolvencyStatus) || undefined,
    lossInsolvencyConcludedDate: inv.loss_insolvency_concluded_date || undefined,
    lossQuitaAmount: inv.loss_quita_amount != null ? Number(inv.loss_quita_amount) : undefined,
    lossQuitaDate: inv.loss_quita_date || undefined,
    lossEnforcementStarted: inv.loss_enforcement_started ?? undefined,
    lossEnforcementDate: inv.loss_enforcement_date || undefined,
    lossEnforcementInitiator: (inv.loss_enforcement_initiator as LossEnforcementInitiator) || undefined,
    lossAssessedAt: inv.loss_assessed_at || undefined,
    lossRulesVersion: inv.loss_rules_version ?? undefined,
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
    lossInsolvencyStatus: raw.lossInsolvencyStatus,
    lossInsolvencyConcludedDate: raw.lossInsolvencyConcludedDate,
    lossQuitaAmount: raw.lossQuitaAmount,
    lossQuitaDate: raw.lossQuitaDate,
    lossEnforcementStarted: raw.lossEnforcementStarted,
    lossEnforcementDate: raw.lossEnforcementDate,
    lossEnforcementInitiator: raw.lossEnforcementInitiator,
    lossAssessedAt: raw.lossAssessedAt,
    lossRulesVersion: raw.lossRulesVersion,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}
