interface PrincipalPayment {
  type: string;
  amount: number;
  date: string;
}

/**
 * Suma el principal ya devuelto de una inversión — pagos `type: 'principal'`, tanto
 * amortización normal (antes de cualquier impago) como recuperaciones parciales
 * registradas después. Es la única fuente de verdad para "cuánto capital ha vuelto":
 * no se lee `investments.amount_recovered` (caché desnormalizada que puede quedar
 * desincronizada — ver auditoría Fase 0). Se usa tanto en el cálculo fiscal
 * (`useTaxSummary.ts`) como en la columna "Beneficio" de `InvestmentList.tsx`, para
 * que ambos números salgan siempre de la misma fuente.
 *
 * `beforeDate` (opcional, para Fase 2): si se pasa, solo suma pagos con
 * `date < beforeDate` — para separar "recuperado antes del hecho imputable" (reduce
 * la pérdida) de "recuperado después" (ganancia patrimonial del ejercicio de cobro).
 * Sin `beforeDate`, suma todo el histórico.
 */
export function getPrincipalReturned(
  payments: PrincipalPayment[],
  beforeDate?: string,
): number {
  return payments
    .filter(p => p.type === 'principal' && (beforeDate === undefined || p.date < beforeDate))
    .reduce((sum, p) => sum + p.amount, 0);
}
