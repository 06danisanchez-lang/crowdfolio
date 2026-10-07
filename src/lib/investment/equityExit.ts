import type { CloseReasonType, EquityType, Investment, Payment } from '@/types/investment';

/**
 * Cierre de una inversión equity (participación en el capital de una sociedad).
 *
 * Qué se guarda al cerrar, a partir del importe total que el usuario ha recibido:
 *  - Un pago 'principal' por la parte que devuelve capital aportado (no es renta).
 *  - Si hay beneficio, un pago con el beneficio, de un tipo que depende de cómo
 *    lo ha pagado la sociedad (ver getEquityExitTreatment).
 *  - Si hay pérdida, ningún pago adicional: la pérdida es una pérdida
 *    patrimonial que Crowdfolio no calcula todavía; se muestra en la pestaña
 *    fiscal como operación a declarar manualmente (manualGppOperations.ts).
 *
 * Calificación fiscal del beneficio:
 *  - 'plusvalia' / 'rentas' cerradas por la plataforma: la sociedad reparte el
 *    beneficio como dividendo (normalmente con retención del 19 %) → RCM,
 *    art. 25.1.a LIRPF. Se guarda como 'dividend'.
 *  - 'liquidacion' (cuota de liquidación de la sociedad, art. 37.1.e LIRPF) o
 *    venta en mercado secundario (art. 37.1.b): ganancia patrimonial → base del
 *    ahorro, pero NO es RCM. Se guarda como 'capital_gain', que el motor fiscal
 *    excluye del RCM y lista para declarar manualmente.
 *
 * Nunca se guarda un dividendo negativo: no existe un RCM negativo por
 * dividendos, y meterlo en el RCM restaría la pérdida de los intereses.
 */

export type EquityExitTreatment = 'rcm_dividend' | 'gpp_manual';

export function getEquityExitTreatment(
  equityType: EquityType | undefined | null,
  closeReason: CloseReasonType | undefined | null,
): EquityExitTreatment {
  if (closeReason === 'sold') return 'gpp_manual';
  if (equityType === 'liquidacion') return 'gpp_manual';
  return 'rcm_dividend';
}

const round2 = (v: number) => Math.round(v * 100) / 100;

/** Capital aportado que sigue pendiente de devolver: importe invertido menos
 * las devoluciones de prima de emisión ya cobradas (equity 'rentas'). */
export function getEquityNetCapital(investment: Pick<Investment, 'amount' | 'payments'>): number {
  const capitalReturned = (investment.payments ?? [])
    .filter(p => p.type === 'capital_return')
    .reduce((sum, p) => sum + p.amount, 0);
  return round2(investment.amount - capitalReturned);
}

export interface EquityExitPlan {
  netCapital: number;
  amountReceived: number;
  /** Positivo = beneficio, negativo = pérdida. */
  result: number;
  /** Calificación del resultado. 'none' si el resultado es 0. Una pérdida
   * siempre es 'gpp_manual', sea cual sea el tipo de equity. */
  treatment: EquityExitTreatment | 'none';
  payments: Omit<Payment, 'id'>[];
}

export function buildEquityExitPlan(params: {
  investment: Pick<Investment, 'amount' | 'payments' | 'equityType'>;
  amountReceived: number;
  date: string;
  closeReason?: CloseReasonType | null;
}): EquityExitPlan {
  const { investment, date, closeReason } = params;
  if (!Number.isFinite(params.amountReceived) || params.amountReceived < 0) {
    throw new Error('El importe recibido debe ser un número mayor o igual que 0.');
  }
  const amountReceived = round2(params.amountReceived);
  const netCapital = getEquityNetCapital(investment);
  const result = round2(amountReceived - netCapital);

  const payments: Omit<Payment, 'id'>[] = [];
  const capitalPart = round2(Math.min(amountReceived, Math.max(netCapital, 0)));
  if (capitalPart > 0) {
    payments.push({ date, amount: capitalPart, type: 'principal', notes: 'Devolución de capital al cierre' });
  }

  let treatment: EquityExitPlan['treatment'] = 'none';
  if (result > 0) {
    treatment = getEquityExitTreatment(investment.equityType, closeReason);
    payments.push({
      date,
      amount: result,
      type: treatment === 'rcm_dividend' ? 'dividend' : 'capital_gain',
      notes: treatment === 'rcm_dividend' ? 'Beneficio al cierre (dividendo)' : 'Ganancia patrimonial al cierre',
    });
  } else if (result < 0) {
    treatment = 'gpp_manual';
  }

  return { netCapital, amountReceived, result, treatment, payments };
}
