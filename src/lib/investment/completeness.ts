/**
 * Centralized completeness logic for investments.
 * Single source of truth used by useInvestments, useIncompleteCount, useTaxSummary.
 *
 * Levels:
 *   draft           — only projectName required
 *   portfolio_ready  — platform + projectName + amount + investmentDate + incomeModel + status ≠ draft
 *   forecast_ready   — portfolio_ready + (bullet: expectedReturn + expectedEndDate)
 *                                       (periodic/amortizing: expectedReturn + expectedEndDate + paymentFrequency + hasSchedule)
 *                                       (variable_or_unknown: NEVER)
 */

export interface CompletionStatus {
  isPortfolioReady: boolean;
  isForecastReady: boolean;
  missingFields: string[];
  /** @deprecated alias for isPortfolioReady — kept for backward compat */
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

  // Drafts are never portfolio-ready
  if (inv.status === 'draft') {
    missingFields.push('investments.field.draftStatus');
    return { isPortfolioReady: false, isForecastReady: false, isComplete: false, missingFields };
  }

  // Portfolio-ready checks
  if (!inv.platform) missingFields.push('investments.field.platform');
  if (!inv.projectName) missingFields.push('investments.field.projectName');
  if (inv.amount == null || inv.amount <= 0) missingFields.push('investments.field.amount');
  if (!inv.investmentDate) missingFields.push('investments.field.investmentDate');
  if (!inv.incomeModel) missingFields.push('investments.field.incomeModel');

  const isPortfolioReady = missingFields.length === 0;

  // Forecast-ready checks (only if portfolio-ready)
  let isForecastReady = false;
  if (isPortfolioReady) {
    const model = inv.incomeModel;
    if (model === 'variable_or_unknown') {
      // Never forecast-ready
      isForecastReady = false;
    } else if (model === 'bullet') {
      isForecastReady = inv.expectedReturn != null && !!inv.expectedEndDate;
    } else if (model === 'periodic_fixed' || model === 'amortizing') {
      isForecastReady =
        inv.expectedReturn != null &&
        !!inv.expectedEndDate &&
        !!inv.paymentFrequency &&
        !!inv.hasSchedule;
    }
  }

  return {
    isPortfolioReady,
    isForecastReady,
    isComplete: isPortfolioReady,
    missingFields,
  };
}

/** Backward-compatible alias — returns true if portfolio_ready */
export function isInvestmentComplete(inv: CompletenessInput): boolean {
  return getInvestmentCompletionStatus(inv).isPortfolioReady;
}
