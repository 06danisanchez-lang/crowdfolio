/**
 * Centralized completeness logic for investments.
 * Single source of truth used by useInvestments, useIncompleteCount, useTaxSummary.
 */

export interface CompletionStatus {
  isComplete: boolean;        // portfolio_ready
  isForecastReady: boolean;   // portfolio_ready + expectedReturn
  missingFields: string[];    // translation keys
}

interface CompletenessInput {
  platform?: string | null;
  projectName?: string | null;
  amount?: number | null;
  investmentDate?: string | null;
  expectedReturn?: number | null;
  status?: string | null;
}

export function getInvestmentCompletionStatus(inv: CompletenessInput): CompletionStatus {
  const missingFields: string[] = [];

  // Drafts are never complete — they must be explicitly completed
  if (inv.status === 'draft') {
    missingFields.push('investments.field.draftStatus');
    return { isComplete: false, isForecastReady: false, missingFields };
  }

  if (!inv.platform) missingFields.push('investments.field.platform');
  if (!inv.projectName) missingFields.push('investments.field.projectName');
  if (inv.amount == null || inv.amount <= 0) missingFields.push('investments.field.amount');
  if (!inv.investmentDate) missingFields.push('investments.field.investmentDate');

  const isComplete = missingFields.length === 0;
  const isForecastReady = isComplete && inv.expectedReturn != null;

  return { isComplete, isForecastReady, missingFields };
}

export function isInvestmentComplete(inv: CompletenessInput): boolean {
  return getInvestmentCompletionStatus(inv).isComplete;
}
