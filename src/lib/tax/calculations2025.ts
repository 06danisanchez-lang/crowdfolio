import { SPAIN_TAX_BRACKETS_2025, TaxCalculationResult } from '@/types/taxCalculation';
import { TaxBracket } from '@/types/tax';

/**
 * Calculate progressive tax for Spanish savings income (rentas del ahorro)
 * Uses 2025 tax brackets including the new 27% and 30% brackets
 */
export function calculateProgressiveTax2025(taxableBase: number): number {
  if (taxableBase <= 0) return 0;
  
  let remainingBase = taxableBase;
  let totalTax = 0;
  
  for (const bracket of SPAIN_TAX_BRACKETS_2025) {
    if (remainingBase <= 0) break;
    
    const bracketSize = bracket.max - bracket.min;
    const taxableInBracket = Math.min(remainingBase, bracketSize);
    
    totalTax += taxableInBracket * bracket.rate;
    remainingBase -= taxableInBracket;
  }
  
  return Math.round(totalTax * 100) / 100;
}

/**
 * Get the marginal tax rate for a given taxable base (2025)
 */
export function getMarginalRate2025(taxableBase: number): number {
  for (const bracket of SPAIN_TAX_BRACKETS_2025) {
    if (taxableBase <= bracket.max) {
      return bracket.rate;
    }
  }
  return SPAIN_TAX_BRACKETS_2025[SPAIN_TAX_BRACKETS_2025.length - 1].rate;
}

/**
 * Calculate effective tax rate
 */
export function calculateEffectiveRate(taxableBase: number, totalTax: number): number {
  if (taxableBase <= 0) return 0;
  return Math.round((totalTax / taxableBase) * 10000) / 100;
}

/**
 * Get tax bracket breakdown for visualization (2025)
 */
export function getTaxBreakdown2025(taxableBase: number): { bracket: TaxBracket; amount: number; tax: number }[] {
  if (taxableBase <= 0) return [];
  
  const breakdown: { bracket: TaxBracket; amount: number; tax: number }[] = [];
  let remainingBase = taxableBase;
  
  for (const bracket of SPAIN_TAX_BRACKETS_2025) {
    if (remainingBase <= 0) break;
    
    const bracketSize = bracket.max - bracket.min;
    const taxableInBracket = Math.min(remainingBase, bracketSize);
    
    breakdown.push({
      bracket,
      amount: taxableInBracket,
      tax: Math.round(taxableInBracket * bracket.rate * 100) / 100,
    });
    
    remainingBase -= taxableInBracket;
  }
  
  return breakdown;
}

/**
 * Calculate cross-bucket compensation (25% rule)
 * If one bucket is negative and another positive, compensate up to 25% of the positive
 */
export function calculateCrossBucketCompensation(
  rcmBalance: number,
  gppBalance: number
): {
  compensatedAmount: number;
  direction: 'RCM_TO_GPP' | 'GPP_TO_RCM' | 'NONE';
  maxAllowed: number;
  newRcmBalance: number;
  newGppBalance: number;
} {
  // If both positive or both negative, no cross compensation
  if ((rcmBalance >= 0 && gppBalance >= 0) || (rcmBalance <= 0 && gppBalance <= 0)) {
    return {
      compensatedAmount: 0,
      direction: 'NONE',
      maxAllowed: 0,
      newRcmBalance: rcmBalance,
      newGppBalance: gppBalance,
    };
  }
  
  // RCM negative, GPP positive: compensate RCM losses with up to 25% of GPP gains
  if (rcmBalance < 0 && gppBalance > 0) {
    const maxCompensation = gppBalance * 0.25;
    const compensatedAmount = Math.min(Math.abs(rcmBalance), maxCompensation);
    
    return {
      compensatedAmount,
      direction: 'GPP_TO_RCM',
      maxAllowed: maxCompensation,
      newRcmBalance: rcmBalance + compensatedAmount,
      newGppBalance: gppBalance - compensatedAmount,
    };
  }
  
  // GPP negative, RCM positive: compensate GPP losses with up to 25% of RCM gains
  if (gppBalance < 0 && rcmBalance > 0) {
    const maxCompensation = rcmBalance * 0.25;
    const compensatedAmount = Math.min(Math.abs(gppBalance), maxCompensation);
    
    return {
      compensatedAmount,
      direction: 'RCM_TO_GPP',
      maxAllowed: maxCompensation,
      newRcmBalance: rcmBalance - compensatedAmount,
      newGppBalance: gppBalance + compensatedAmount,
    };
  }
  
  return {
    compensatedAmount: 0,
    direction: 'NONE',
    maxAllowed: 0,
    newRcmBalance: rcmBalance,
    newGppBalance: gppBalance,
  };
}

/**
 * Calculate double taxation deduction for foreign income
 * Deduction = MIN(Foreign_Withholding, Foreign_Base × User_Effective_Rate)
 */
export function calculateDoubleTaxationDeduction(
  foreignIncome: number,
  foreignWithholdings: number,
  userEffectiveRate: number
): number {
  if (foreignIncome <= 0 || foreignWithholdings <= 0) return 0;
  
  const maxDeduction = foreignIncome * userEffectiveRate;
  return Math.min(foreignWithholdings, maxDeduction);
}

/**
 * Format currency for display (Spanish locale)
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Format percentage for display
 */
export function formatPercentage(value: number, decimals: number = 2): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Check if Modelo 720 declaration is required
 * Required when foreign assets exceed 50,000€
 */
export function isModelo720Required(foreignAssetsValue: number): boolean {
  return foreignAssetsValue > 50000;
}

/**
 * Get default withholding rate for a country
 */
export function getDefaultWithholdingRate(countryCode: string): number {
  const rates: Record<string, number> = {
    ES: 0.19,
    EE: 0,
    LT: 0,
    LV: 0,
    PT: 0.28,
    FR: 0.30,
    DE: 0.26375,
    IT: 0.26,
    NL: 0.15,
    UK: 0,
    CH: 0.35,
  };
  return rates[countryCode] ?? 0;
}
