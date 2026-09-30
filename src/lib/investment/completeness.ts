/**
 * Centralized completeness logic for investments.
 * Single source of truth used by useInvestments, useIncompleteCount, useTaxSummary.
 *
 * Levels:
 *   draft            — only projectName required
 *   tracking_ready   — platform + projectName + amount>0 + investmentDate
 *                      + incomeModel + expectedReturn + expectedEndDate
 *                      + status ≠ draft
 *   forecast_ready   — tracking_ready + (bullet: nothing extra)
 *                                      + (periodic/amortizing: paymentFrequency + hasSchedule)
 *                                      + (variable_or_unknown: NEVER)
 */

export interface CompletionStatus {
  isTrackingReady: boolean;
  isForecastReady: boolean;
  missingFields: string[];
  /** @deprecated alias for isTrackingReady — kept for backward compat */
  isPortfolioReady: boolean;
  /** @deprecated alias for isTrackingReady — kept for backward compat */
  isComplete: boolean;
}

interface CompletenessInput {
  platform?: string | null;
  projectName?: string | null;
  amount?: number | null;
  investmentDate?: string | null;
  expectedReturn?: number | null;
  expectedEndDate?: string | null;
  incomeModel?: string | null;
  paymentFrequency?: string | null;
  hasSchedule?: boolean;
  status?: string | null;
}

export function getInvestmentCompletionStatus(inv: CompletenessInput): CompletionStatus {
  const missingFields: string[] = [];

  // Drafts are never tracking-ready
  if (inv.status === 'draft') {
    missingFields.push('investments.field.draftStatus');
    return { isTrackingReady: false, isForecastReady: false, isPortfolioReady: false, isComplete: false, missingFields };
  }

  // Tracking-ready checks
  if (!inv.platform) missingFields.push('investments.field.platform');
  if (!inv.projectName) missingFields.push('investments.field.projectName');
  if (inv.amount == null || inv.amount <= 0) missingFields.push('investments.field.amount');
  if (!inv.investmentDate) missingFields.push('investments.field.investmentDate');
  if (!inv.incomeModel) missingFields.push('investments.field.incomeModel');
  if (inv.expectedReturn == null) missingFields.push('investments.field.expectedReturn');
  if (!inv.expectedEndDate) missingFields.push('investments.field.expectedEndDate');

  // periodic_fixed / amortizing additionally require paymentFrequency — un
  // dato real que el usuario siempre puede rellenar. `hasSchedule` NO va
  // aquí: es un valor DERIVADO (generateSchedule sobre los datos del
  // formulario), no un campo que el usuario pueda "arreglar" si sale a false
  // — legítimamente puede quedar en false cuando el plazo de la inversión es
  // más corto que un periodo completo de la frecuencia elegida, un caso
  // válido (se corrige aparte generando un tramo corto prorrateado, ver
  // scheduleGenerator.ts). Antes de que esto se corrigiera (Fase 7), estaba
  // aquí y bloqueaba para siempre la creación de esas inversiones como
  // activas, con un campo pendiente ("Calendario de cobros") que no existe
  // en el formulario. Solo afecta a isForecastReady, como para
  // variable_or_unknown (que tampoco es nunca forecast-ready y es
  // perfectamente trackable).
  const model = inv.incomeModel;
  if (model === 'periodic_fixed' || model === 'amortizing') {
    if (!inv.paymentFrequency) missingFields.push('investments.field.paymentFrequency');
  }

  const isTrackingReady = missingFields.length === 0;

  // Forecast-ready checks (only if tracking-ready)
  let isForecastReady = false;
  if (isTrackingReady) {
    if (model === 'variable_or_unknown') {
      isForecastReady = false;
    } else if (model === 'bullet') {
      isForecastReady = true;
    } else if (model === 'periodic_fixed' || model === 'amortizing') {
      isForecastReady = !!inv.hasSchedule;
    }
  }

  return {
    isTrackingReady,
    isForecastReady,
    isPortfolioReady: isTrackingReady,
    isComplete: isTrackingReady,
    missingFields,
  };
}

/** Backward-compatible alias — returns true if tracking_ready */
export function isInvestmentComplete(inv: CompletenessInput): boolean {
  return getInvestmentCompletionStatus(inv).isTrackingReady;
}
