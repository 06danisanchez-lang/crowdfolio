import { SPAIN_TAX_BRACKETS, TaxBracket } from '@/types/tax';

/**
 * Calculate progressive tax for Spanish savings income (rentas del ahorro)
 * Uses 2025 tax brackets (Ley 7/2024)
 */
export function calculateProgressiveTax(taxableBase: number): number {
  if (taxableBase <= 0) return 0;
  
  let remainingBase = taxableBase;
  let totalTax = 0;
  
  for (const bracket of SPAIN_TAX_BRACKETS) {
    if (remainingBase <= 0) break;
    
    const bracketSize = bracket.max - bracket.min;
    const taxableInBracket = Math.min(remainingBase, bracketSize);
    
    totalTax += taxableInBracket * bracket.rate;
    remainingBase -= taxableInBracket;
  }
  
  return Math.round(totalTax * 100) / 100;
}

/**
 * Calculate withholding tax for a specific income amount
 * In Spain, dividends and interest have a flat 19% withholding
 */
export function calculateWithholding(amount: number): number {
  return Math.round(amount * 0.19 * 100) / 100;
}

/**
 * Get the marginal tax rate for a given taxable base
 */
export function getMarginalRate(taxableBase: number): number {
  for (const bracket of SPAIN_TAX_BRACKETS) {
    if (taxableBase <= bracket.max) {
      return bracket.rate;
    }
  }
  return SPAIN_TAX_BRACKETS[SPAIN_TAX_BRACKETS.length - 1].rate;
}

/**
 * Calculate effective tax rate
 */
export function calculateEffectiveRate(taxableBase: number, totalTax: number): number {
  if (taxableBase <= 0) return 0;
  return Math.round((totalTax / taxableBase) * 10000) / 100;
}

/**
 * Get tax bracket breakdown for visualization
 */
export function getTaxBreakdown(taxableBase: number): { bracket: TaxBracket; amount: number; tax: number }[] {
  if (taxableBase <= 0) return [];
  
  const breakdown: { bracket: TaxBracket; amount: number; tax: number }[] = [];
  let remainingBase = taxableBase;
  
  for (const bracket of SPAIN_TAX_BRACKETS) {
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
 * Format currency for display
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
export function formatPercentage(value: number): string {
  return `${value.toFixed(2)}%`;
}
