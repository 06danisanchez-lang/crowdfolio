import { getSavingsBrackets, TaxBracket } from '@/types/tax';

/**
 * Cuota de la base del ahorro con la escala progresiva del ejercicio `year`
 * (sin año: la vigente). Ver getSavingsBrackets.
 */
export function calculateProgressiveTax(taxableBase: number, year?: number): number {
  if (taxableBase <= 0) return 0;
  const brackets = getSavingsBrackets(year);
  
  let remainingBase = taxableBase;
  let totalTax = 0;
  
  for (const bracket of brackets) {
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
export function getMarginalRate(taxableBase: number, year?: number): number {
  const brackets = getSavingsBrackets(year);
  for (const bracket of brackets) {
    if (taxableBase <= bracket.max) {
      return bracket.rate;
    }
  }
  return brackets[brackets.length - 1].rate;
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
export function getTaxBreakdown(taxableBase: number, year?: number): { bracket: TaxBracket; amount: number; tax: number }[] {
  if (taxableBase <= 0) return [];
  
  const breakdown: { bracket: TaxBracket; amount: number; tax: number }[] = [];
  let remainingBase = taxableBase;
  
  for (const bracket of getSavingsBrackets(year)) {
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
  // Intl.NumberFormat muestra "-0,00 €" para -0 (p.ej. -gastos cuando
  // gastos === 0) — normaliza a 0 antes de formatear. `value === 0` es true
  // para +0 y -0 por igual en JS, así que esto nunca afecta a negativos reales.
  const normalized = value === 0 ? 0 : value;
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(normalized);
}

/**
 * Format percentage for display
 */
export function formatPercentage(value: number): string {
  const normalized = value === 0 ? 0 : value;
  return `${new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(normalized)} %`;
}
