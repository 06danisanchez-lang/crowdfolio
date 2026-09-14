/**
 * Fase 5 — piezas puras del cálculo fiscal para inversiones extranjeras.
 * useTaxSummary.ts es el único consumidor; aquí no hay estado ni I/O.
 *
 * Todo pasa por convertToEur (src/lib/tax/currency.ts) — este archivo no
 * reimplementa ninguna fórmula de conversión, solo decide QUÉ convertir y
 * QUÉ excluir.
 */
import { convertToEur } from './currency';
import {
  getInvestmentDataRequirements,
  RequirementsInvestment,
  RequirementsPayment,
  PlatformFxMeta,
} from '@/lib/investment/completeness';

export interface ExcludedForeignInvestment {
  investmentId: string;
  projectName: string;
  reasons: string[];
}

/**
 * Importe bruto en EUR de UN pago, con la misma convención en todo el
 * proyecto: si el pago no está en divisa extranjera, `amount` ya es EUR
 * (comportamiento de siempre, sin tocar). Si lo está, la única fuente de
 * verdad es `amountEur` — nunca se asume `amount` a ciegas para un pago
 * extranjero, aunque en la práctica Fase 3 garantiza que coincidan.
 * Devuelve null si no se puede resolver (pago extranjero sin amountEur).
 */
export function resolvePaymentGrossEur(payment: {
  amount: number;
  originalCurrency?: string | null;
  amountEur?: number | null;
}): number | null {
  if (!payment.originalCurrency || payment.originalCurrency === 'EUR') return payment.amount;
  return payment.amountEur ?? null;
}

/** Mismo criterio que resolvePaymentGrossEur, para el principal de la inversión. */
export function resolvePrincipalGrossEur(investment: {
  amount: number;
  currency?: string | null;
  amountEur?: number | null;
}): number | null {
  if (!investment.currency || investment.currency === 'EUR') return investment.amount;
  return investment.amountEur ?? null;
}

/**
 * Inversiones a excluir del informe fiscal definitivo: cualquiera con al
 * menos un `fiscal_blocker` (Fase 4 — tipo de cambio o retención sin base
 * coherente). Se excluye la inversión ENTERA, no solo el pago que falla.
 */
export function getExcludedForeignInvestments(
  investments: Array<RequirementsInvestment & { id: string; projectName: string; platform?: string | null }>,
  paymentsByInvestment: Map<string, RequirementsPayment[]>,
  resolvePlatform: (platformValue: string | null | undefined) => PlatformFxMeta | undefined,
): ExcludedForeignInvestment[] {
  const excluded: ExcludedForeignInvestment[] = [];
  for (const inv of investments) {
    const platform = resolvePlatform(inv.platform);
    const requirements = getInvestmentDataRequirements(inv, paymentsByInvestment.get(inv.id) ?? [], platform);
    const blockers = requirements.filter(r => r.severity === 'fiscal_blocker');
    if (blockers.length > 0) {
      excluded.push({ investmentId: inv.id, projectName: inv.projectName, reasons: blockers.map(b => b.message) });
    }
  }
  return excluded;
}

/**
 * Dato (a) del art. 80 LIRPF: retención efectiva en origen, convertida a EUR.
 * Fiable — se calcula solo con datos que la app ya tiene. Se llama SOLO con
 * pagos ya no-excluidos (los de inversiones con fiscal_blocker no deberían
 * llegar aquí; si llegan sin exchangeRate se ignoran, no se estiman).
 */
export function getForeignWithholdingTotalEur(payments: Array<{
  foreignWithholdingAmount?: number | null;
  foreignWithholdingCurrency?: string | null;
  exchangeRate?: number | null;
}>): number {
  return payments.reduce((sum, p) => {
    if (!p.foreignWithholdingAmount || p.foreignWithholdingAmount <= 0) return sum;
    const currency = p.foreignWithholdingCurrency;
    if (!currency || currency === 'EUR') return sum + p.foreignWithholdingAmount;
    if (!p.exchangeRate) return sum; // dato inconsistente que ya debería haber excluido la inversión
    return sum + convertToEur(p.foreignWithholdingAmount, p.exchangeRate);
  }, 0);
}

/**
 * Nota en lenguaje llano para el bloque de doble imposición. NO suena a
 * limitación de Crowdfolio: la retención es un dato tuyo real y fiable: lo
 * que no podemos ver es el resto de tu declaración, y por eso el cálculo
 * final depende de eso, no de un fallo nuestro.
 */
export function buildDoubleTaxationNote(foreignWithholdingTotalEur: number): string {
  if (foreignWithholdingTotalEur <= 0) return '';
  const formatted = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(foreignWithholdingTotalEur);
  return `Te retuvieron ${formatted} en origen. Podrás deducir este importe en tu declaración hasta el límite legal, pero el cálculo exacto depende del resto de tus rentas, que no están en Crowdfolio — coméntalo con tu asesor o Hacienda.`;
}
