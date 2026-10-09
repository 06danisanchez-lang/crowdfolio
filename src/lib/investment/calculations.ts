import { Investment, InvestmentScheduleEntry, Payment } from '@/types/investment';
import { toDateOnlyString } from '@/lib/dateOnly';

/**
 * Calcula la duración en años de una inversión
 */
export function getInvestmentDurationYears(
  investmentDate: string,
  expectedEndDate?: string
): number {
  const start = new Date(investmentDate);
  const end = expectedEndDate ? new Date(expectedEndDate) : new Date();
  const diffMs = end.getTime() - start.getTime();
  return Math.max(diffMs / (1000 * 60 * 60 * 24 * 365.25), 0);
}

/**
 * Calcula el rendimiento total en € basado en rendimiento anual y duración
 * Usa interés simple por defecto
 */
export function calculateTotalReturnAmount(
  amount: number,
  annualReturnPercent: number,
  durationYears: number,
  useCompound: boolean = false
): number {
  if (useCompound) {
    return amount * (Math.pow(1 + annualReturnPercent / 100, durationYears) - 1);
  }
  return amount * (annualReturnPercent / 100) * durationYears;
}

/**
 * Calcula el rendimiento total esperado en porcentaje
 */
export function calculateTotalReturnPercent(
  annualReturnPercent: number,
  durationYears: number
): number {
  return annualReturnPercent * durationYears;
}

const MS_PER_YEAR = 1000 * 60 * 60 * 24 * 365.25;
const MS_PER_DAY = 1000 * 60 * 60 * 24;

type DelayFields = Pick<Investment, 'expectedEndDate' | 'originalEndDate' | 'wasExtended'>;

/**
 * Vencimiento prometido al invertir, antes de prórrogas o retrasos.
 * originalEndDate solo existe si la fecha se ha movido; si no, es expectedEndDate.
 */
export function getOriginalEndDate(investment: DelayFields): string | undefined {
  return investment.originalEndDate || investment.expectedEndDate || undefined;
}

/**
 * Hasta qué fecha genera rentabilidad la inversión, según lo que dijo el usuario
 * al mover el vencimiento:
 * - Prórroga (wasExtended): el contrato sigue con el mismo tipo hasta la nueva fecha.
 * - Retraso: cobrará lo prometido, pero más tarde; no se suponen intereses extra.
 *   Si la plataforma paga intereses de demora, se registran como cobros y la TAE
 *   real al cerrar los recoge.
 */
export function getAccrualEndDate(investment: DelayFields): string | undefined {
  const expected = investment.expectedEndDate || undefined;
  if (investment.originalEndDate && !investment.wasExtended) {
    if (!expected) return investment.originalEndDate;
    return investment.originalEndDate < expected ? investment.originalEndDate : expected;
  }
  return expected;
}

/** true si el vencimiento se ha movido por un retraso (no una prórroga). */
export function isDelayedWithoutExtraInterest(investment: DelayFields): boolean {
  const accrualEnd = getAccrualEndDate(investment);
  return !!accrualEnd && !!investment.expectedEndDate && accrualEnd < investment.expectedEndDate;
}

/**
 * Calcula el rendimiento total esperado de una inversión usando interés simple.
 * SOLO VÁLIDO para inversiones tipo 'bullet'.
 * Para periodic_fixed / amortizing, usar calculateExpectedReturnFromSchedule.
 */
export function calculateInvestmentTotalReturn(investment: Investment): number {
  const durationYears = getInvestmentDurationYears(
    investment.investmentDate,
    getAccrualEndDate(investment)
  );
  return calculateTotalReturnAmount(
    investment.amount,
    investment.expectedReturn,
    durationYears
  );
}

/**
 * Calcula el porcentaje total esperado de una inversión usando interés simple.
 * SOLO VÁLIDO para inversiones tipo 'bullet'.
 * Para periodic_fixed / amortizing, usar calculateExpectedReturnFromSchedule.
 */
export function calculateInvestmentTotalReturnPercent(investment: Investment): number {
  const durationYears = getInvestmentDurationYears(
    investment.investmentDate,
    getAccrualEndDate(investment)
  );
  return calculateTotalReturnPercent(investment.expectedReturn, durationYears);
}

/**
 * Calcula el rendimiento esperado total para inversiones periodic_fixed o amortizing,
 * basándose en el schedule real (investment_schedule).
 *
 * - periodic_fixed: suma de expected_amount donde type === 'interest'
 *   (los pagos de principal no son rendimiento, solo devolución del capital)
 *
 * - amortizing: suma total de expected_amount - amount
 *   (cada cuota de amortización francesa incluye principal + interés,
 *    así que el rendimiento total es la suma de todas las cuotas menos el capital invertido)
 */
export function calculateExpectedReturnFromSchedule(
  schedule: InvestmentScheduleEntry[],
  amount: number,
  incomeModel: 'periodic_fixed' | 'amortizing'
): number {
  if (incomeModel === 'periodic_fixed') {
    return schedule
      .filter(e => e.type === 'interest')
      .reduce((sum, e) => sum + e.expectedAmount, 0);
  }

  // amortizing: total payments - principal = net return
  const totalPayments = schedule.reduce((sum, e) => sum + e.expectedAmount, 0);
  return totalPayments - amount;
}

/**
 * Rendimiento total esperado (proyección) de una inversión, en €. Mismo criterio que ya
 * usaba InvestmentDetail para "Rentabilidad Total": schedule real (investment_schedule)
 * para periodic_fixed/amortizing si ya existe, fórmula de interés simple para el resto
 * (bullet, equity, y fallback si aún no hay schedule cargado). variable_or_unknown no
 * proyecta nada (0) — importe variable/desconocido, sin base para estimar.
 *
 * Se usa tanto en la ficha de detalle como en la columna "Beneficio" de InvestmentList
 * (estados active/pending) — extraído aquí para no duplicar la lógica en ambos sitios.
 */
export function calculateExpectedTotalReturn(
  investment: Investment,
  schedule: InvestmentScheduleEntry[]
): number {
  if (
    (investment.incomeModel === 'periodic_fixed' || investment.incomeModel === 'amortizing') &&
    schedule.length > 0
  ) {
    return calculateExpectedReturnFromSchedule(schedule, investment.amount, investment.incomeModel);
  }
  if (investment.incomeModel === 'variable_or_unknown') {
    return 0;
  }
  return calculateInvestmentTotalReturn(investment);
}

/**
 * Suma el importe bruto (sin retención) de los pagos de renta (interest/dividend) de una
 * inversión — excluye capital_return (prima de emisión equity rentas, no es rendimiento)
 * y principal (devolución de capital, no rendimiento).
 *
 * OJO: esto NO es el cálculo fiscal (ver useTaxSummary.ts) — ese además excluye
 * inversiones extranjeras con datos incompletos y resuelve divisa/retención. Aquí se usa
 * siempre payment.amount tal cual (ya está en EUR por convención del proyecto), pensado
 * para el "beneficio real" que se muestra en el listado de inversiones (completed).
 */
export function sumIncomePayments(payments: Payment[]): number {
  return payments
    .filter(p => p.type === 'interest' || p.type === 'dividend')
    .reduce((sum, p) => sum + p.amount, 0);
}

/**
 * "Beneficio real" de una inversión completada (columna Beneficio del listado).
 * - Préstamos: rentas cobradas (sumIncomePayments).
 * - Equity: todo lo cobrado (capital, prima de emisión, dividendos, ganancia)
 *   menos lo invertido. Así una pérdida al cierre se ve como negativa en vez de
 *   como 0 € (el cierre no registra la pérdida como pago; ver equityExit.ts).
 *   Solo cartera: no es el cálculo fiscal.
 */
export function calculateRealizedProfit(investment: Pick<Investment, 'incomeModel' | 'amount' | 'payments'>): number {
  const payments = investment.payments ?? [];
  if (investment.incomeModel === 'equity') {
    const totalReceived = payments.reduce((sum, p) => sum + p.amount, 0);
    return Math.round((totalReceived - investment.amount) * 100) / 100;
  }
  return sumIncomePayments(payments);
}

export function calculateAccruedReturn(
  inv: Investment,
  schedule: InvestmentScheduleEntry[],
  today: Date = new Date()
): number {
  if (inv.incomeModel === 'variable_or_unknown') return 0;

  if (inv.incomeModel === 'equity') {
    if (inv.equityType === 'rentas') {
      // Real cobrado: suma de pagos tipo dividend o capital_return
      return (inv.payments ?? [])
        .filter(p => p.type === 'dividend' || p.type === 'capital_return')
        .reduce((sum, p) => sum + p.amount, 0);
    }
    // plusvalia y liquidacion: interés simple proporcional (mismo que bullet)
  }

  const todayStr = toDateOnlyString(today);

  if (inv.incomeModel === 'periodic_fixed' || inv.incomeModel === 'amortizing') {
    return schedule
      .filter(e => e.type === 'interest' && e.expectedDate <= todayStr)
      .reduce((sum, e) => {
        if (e.matchedPaymentId && inv.payments) {
          const real = inv.payments.find(p => p.id === e.matchedPaymentId);
          return sum + (real ? real.amount : e.expectedAmount);
        }
        return sum + e.expectedAmount;
      }, 0);
  }

  // bullet, equity plusvalia/liquidacion: interés simple proporcional, hasta la
  // fecha en que deja de generar rentabilidad (la original si es un retraso).
  const start = new Date(inv.investmentDate);
  const accrualEnd = getAccrualEndDate(inv);
  const end = today < new Date(accrualEnd ?? today) ? today : new Date(accrualEnd!);
  const yearsElapsed = Math.max((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365.25), 0);
  return inv.amount * (inv.expectedReturn / 100) * yearsElapsed;
}

export function calculateRemainingReturn(
  inv: Investment,
  schedule: InvestmentScheduleEntry[],
  today: Date = new Date()
): number {
  if (inv.incomeModel === 'variable_or_unknown') return 0;
  // rentas equity: importes variables, sin proyección futura
  if (inv.incomeModel === 'equity' && inv.equityType === 'rentas') return 0;

  const total = inv.incomeModel === 'periodic_fixed' || inv.incomeModel === 'amortizing'
    ? calculateExpectedReturnFromSchedule(schedule, inv.amount, inv.incomeModel)
    : calculateInvestmentTotalReturn(inv); // bullet y equity plusvalia/liquidacion
  const accrued = calculateAccruedReturn(inv, schedule, today);
  return Math.max(total - accrued, 0);
}

/**
 * Días de retraso respecto al vencimiento prometido al invertir (getOriginalEndDate),
 * aunque luego se haya movido por prórroga o retraso.
 * - Completada con actualEndDate: actualEndDate - vencimiento original.
 * - Activa/pendiente: la fecha más tardía entre hoy y el vencimiento actual, menos el
 *   original. Así una inversión retrasada al 1 de julio cuenta ya todo el retraso
 *   previsto, y si vuelve a pasarse la fecha el retraso sigue creciendo cada día.
 * Positivo = retraso, negativo o cero = a tiempo / anticipado.
 */
export function getDelayDays(investment: Investment, today: Date = new Date()): number {
  const original = getOriginalEndDate(investment);
  if (!original) return 0;
  const originalDate = new Date(original);

  if (investment.status === 'completed' && investment.actualEndDate) {
    const actual = new Date(investment.actualEndDate);
    return Math.round((actual.getTime() - originalDate.getTime()) / MS_PER_DAY);
  }

  if (investment.status === 'active' || investment.status === 'pending') {
    const current = investment.expectedEndDate ? new Date(investment.expectedEndDate) : originalDate;
    const latest = today > current ? today : current;
    return Math.round((latest.getTime() - originalDate.getTime()) / MS_PER_DAY);
  }

  return 0;
}

/**
 * TAE real de una inversión completada, basada en la duración real
 * (investmentDate -> actualEndDate) y el beneficio neto realmente cobrado
 * (total de payments menos el capital invertido). Interés simple anualizado,
 * mismo criterio que calculateTotalReturnPercent.
 */
export function calculateRealTAE(investment: Investment, payments: Payment[]): number {
  if (!investment.actualEndDate || investment.amount <= 0) return investment.expectedReturn;

  const start = new Date(investment.investmentDate);
  const end = new Date(investment.actualEndDate);
  const years = Math.max((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365.25), 0);
  if (years <= 0) return investment.expectedReturn;

  const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0);
  const profit = totalCollected - investment.amount;

  return (profit / investment.amount / years) * 100;
}

/**
 * TAE estimada "a hoy" para inversiones activas/pendientes que ya van con retraso
 * (hoy > expectedEndDate). Se basa exclusivamente en pagos reales cobrados hasta hoy
 * (dividend, interest, capital_return — excluye principal, que es devolución de capital,
 * no rendimiento) sobre la duración real transcurrida. Es una estimación provisional,
 * no una proyección con expectedReturn.
 */
export function calculateEstimatedTAEToday(
  investment: Investment,
  payments: Payment[],
  today: Date = new Date()
): number {
  if (investment.amount <= 0) return investment.expectedReturn;

  const start = new Date(investment.investmentDate);
  const years = Math.max((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365.25), 0);
  if (years <= 0) return investment.expectedReturn;

  const todayStr = toDateOnlyString(today);
  const yieldCollected = payments
    .filter(p => p.date <= todayStr && (p.type === 'dividend' || p.type === 'interest' || p.type === 'capital_return'))
    .reduce((sum, p) => sum + p.amount, 0);

  return (yieldCollected / investment.amount / years) * 100;
}

/**
 * TAE de una inversión activa/pendiente teniendo en cuenta el retraso: lo prometido
 * (generado hasta getAccrualEndDate) repartido entre el tiempo hasta que se cobre,
 * que es el vencimiento actual o, si ya ha pasado, hoy.
 *
 * Ejemplo: 10 % anual a 12 meses que se retrasa a 18 meses sin intereses extra →
 * 10 % × 12/18 = 6,7 %. En una prórroga (el contrato sigue al mismo tipo) no baja
 * hasta que se pase la nueva fecha.
 *
 * Si la inversión sigue pagando intereses durante el retraso, lo cobrado puede dar
 * una TAE mayor (calculateEstimatedTAEToday); se usa la mayor de las dos.
 */
export function calculateDelayAdjustedTAE(
  investment: Investment,
  payments: Payment[],
  today: Date = new Date(),
): number {
  const accrualEnd = getAccrualEndDate(investment);
  if (!accrualEnd || !investment.expectedEndDate) return investment.expectedReturn;

  const start = new Date(investment.investmentDate).getTime();
  const current = new Date(investment.expectedEndDate);
  const payout = today > current ? today : current;
  const promisedYears = (new Date(accrualEnd).getTime() - start) / MS_PER_YEAR;
  const realYears = (payout.getTime() - start) / MS_PER_YEAR;
  if (promisedYears <= 0 || realYears <= 0 || promisedYears >= realYears) return investment.expectedReturn;

  const diluted = investment.expectedReturn * (promisedYears / realYears);
  const fromCollected = calculateEstimatedTAEToday(investment, payments, today);
  return Math.max(diluted, fromCollected);
}

/**
 * TAE más rigurosa disponible para una inversión:
 * - Completada con actualEndDate -> TAE real (duración y cobros reales)
 * - Activa/pendiente -> TAE ajustada por retraso (igual a la prometida si va a tiempo)
 */
export function getEffectiveTAE(investment: Investment, payments: Payment[], today: Date = new Date()): number {
  if (investment.status === 'completed' && investment.actualEndDate) {
    return calculateRealTAE(investment, payments);
  }

  if (investment.status === 'active' || investment.status === 'pending') {
    return calculateDelayAdjustedTAE(investment, payments, today);
  }

  return investment.expectedReturn;
}
