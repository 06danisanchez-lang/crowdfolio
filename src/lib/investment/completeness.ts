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

  const isTrackingReady = missingFields.length === 0;

  // Forecast-ready checks (only if tracking-ready)
  let isForecastReady = false;
  if (isTrackingReady) {
    const model = inv.incomeModel;
    if (model === 'variable_or_unknown') {
      isForecastReady = false;
    } else if (model === 'bullet') {
      // expectedReturn + expectedEndDate already guaranteed by tracking-ready
      isForecastReady = true;
    } else if (model === 'periodic_fixed' || model === 'amortizing') {
      isForecastReady = !!inv.paymentFrequency && !!inv.hasSchedule;
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
