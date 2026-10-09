/**
 * Schedule generator for investment cashflows.
 *
 * Phase 1 — frontend generation. To be migrated to edge function in Phase 2
 * for data consistency guarantees.
 */

import { IncomeModel, PaymentFrequency, PrincipalReturnType, EquityType, InvestmentScheduleEntry } from '@/types/investment';
import { toDateOnlyString } from '@/lib/dateOnly';

interface ScheduleInput {
  id: string;
  amount: number;
  expectedReturn: number; // annual percentage
  incomeModel: IncomeModel;
  paymentFrequency?: PaymentFrequency | null;
  principalReturnType?: PrincipalReturnType | null;
  equityType?: EquityType | null;
  investmentDate: string;
  expectedEndDate: string;
  /** Fecha real del primer cobro, si se conoce (solo periodic_fixed/amortizing).
   * Si no se indica, se estima como investmentDate + 1 periodo (comportamiento
   * de siempre). */
  firstPaymentDate?: string | null;
}

const DAYS_IN_YEAR = 365;

function getPeriodsPerYear(freq: PaymentFrequency): number {
  switch (freq) {
    case 'monthly': return 12;
    case 'quarterly': return 4;
    case 'semiannual': return 2;
    case 'annual': return 1;
  }
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  const targetMonth = d.getMonth() + months;
  d.setDate(1); // anchor to 1st to avoid month overflow during setMonth
  d.setMonth(targetMonth);
  // Clamp day to the last day of the target month
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(date.getDate(), lastDay));
  return d;
}

function getMonthsPerPeriod(freq: PaymentFrequency): number {
  switch (freq) {
    case 'monthly': return 1;
    case 'quarterly': return 3;
    case 'semiannual': return 6;
    case 'annual': return 12;
  }
}

function toDateStr(d: Date): string {
  return toDateOnlyString(d);
}

/** Días naturales entre dos fechas (comparando por componentes de calendario,
 * no por el Date crudo, para no arrastrar horas locales). */
function daysBetween(a: Date, b: Date): number {
  const ua = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const ub = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((ub - ua) / 86_400_000);
}

const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

interface Period {
  date: Date;
  /** Días reales desde el cobro/fecha anterior. */
  days: number;
  /** true si `days` coincide exactamente con un periodo nominal completo
   * desde la fecha anterior — false para un tramo más corto (o más largo)
   * que un periodo, típicamente el primero (si hay "fecha del primer cobro"
   * que no coincide con investmentDate + 1 periodo) o el último (si el
   * vencimiento no cae en un múltiplo exacto del periodo). */
  isRegular: boolean;
}

/**
 * Genera los tramos de cobro entre investmentDate y expectedEndDate — el
 * primero en firstPaymentDate si se indica (si no, investmentDate + 1
 * periodo), cada uno siguiente sumando un periodo más, y SIEMPRE termina
 * exactamente en expectedEndDate (añadido aparte si el último periodo
 * regular no cae justo ahí). Cualquier tramo cuya duración real no coincida
 * con un periodo completo (el primero, si firstPaymentDate no encaja, o el
 * último, si el vencimiento no es múltiplo exacto del periodo) se marca
 * `isRegular: false` para que el llamador prorratee sus intereses por días.
 */
function buildPeriods(
  investmentDate: Date,
  firstPaymentDate: Date | null,
  expectedEndDate: Date,
  monthsPerPeriod: number,
): Period[] {
  const periods: Period[] = [];
  let prev = investmentDate;
  let current = firstPaymentDate ?? addMonths(investmentDate, monthsPerPeriod);

  while (toDateStr(current) <= toDateStr(expectedEndDate)) {
    const days = daysBetween(prev, current);
    const nominalDays = daysBetween(prev, addMonths(prev, monthsPerPeriod));
    periods.push({ date: current, days, isRegular: days === nominalDays });
    prev = current;
    current = addMonths(current, monthsPerPeriod);
  }

  const lastDate = periods.length > 0 ? periods[periods.length - 1].date : null;
  if (!lastDate || toDateStr(lastDate) !== toDateStr(expectedEndDate)) {
    const days = daysBetween(prev, expectedEndDate);
    const nominalDays = daysBetween(prev, addMonths(prev, monthsPerPeriod));
    periods.push({ date: expectedEndDate, days, isRegular: days === nominalDays });
  }

  return periods;
}

export function generateSchedule(input: ScheduleInput): InvestmentScheduleEntry[] {
  const { incomeModel, paymentFrequency, principalReturnType, equityType, amount, expectedReturn, investmentDate, expectedEndDate, firstPaymentDate, id } = input;

  // bullet and variable_or_unknown: no schedule entries
  if (incomeModel === 'bullet' || incomeModel === 'variable_or_unknown') {
    return [];
  }

  // equity: only 'rentas' generates a schedule (quarterly interest stubs + final principal)
  if (incomeModel === 'equity') {
    if (equityType !== 'rentas' || !expectedEndDate) return [];
    const start = new Date(investmentDate);
    const end = new Date(expectedEndDate);
    const entries: InvestmentScheduleEntry[] = [];
    let current = addMonths(start, 3);
    // Comparar por string de fecha, no por el Date crudo: addMonths() arrastra
    // la hora local de origen (artefacto de parsear investmentDate como
    // medianoche UTC) y, al cruzar un cambio de hora, esa hora puede quedar
    // por delante de `end` aunque sea el mismo día calendario — se perdería
    // la última cuota. Ver auditoría de fechas / scheduleGenerator.test.ts.
    while (toDateStr(current) < toDateStr(end)) {
      entries.push({
        investmentId: id,
        expectedDate: toDateStr(current),
        expectedAmount: 0,
        type: 'interest',
        status: 'pending',
      });
      current = addMonths(current, 3);
    }
    entries.push({
      investmentId: id,
      expectedDate: toDateStr(end),
      expectedAmount: 0,
      type: 'principal',
      status: 'pending',
    });
    return entries;
  }

  if (!paymentFrequency || !expectedEndDate) {
    return [];
  }

  const start = new Date(investmentDate);
  const end = new Date(expectedEndDate);
  const firstPaymentDateObj = firstPaymentDate ? new Date(firstPaymentDate) : null;
  const periodsPerYear = getPeriodsPerYear(paymentFrequency);
  const monthsPerPeriod = getMonthsPerPeriod(paymentFrequency);
  const ratePerPeriod = (expectedReturn / 100) / periodsPerYear;
  const annualRate = expectedReturn / 100;

  const periods = buildPeriods(start, firstPaymentDateObj, end, monthsPerPeriod);
  if (periods.length === 0) return [];

  const entries: InvestmentScheduleEntry[] = [];

  if (incomeModel === 'periodic_fixed') {
    // El capital nunca se amortiza en los tramos intermedios (se devuelve
    // entero al vencimiento), así que el interés de CUALQUIER tramo — regular
    // o no — se calcula siempre sobre el importe COMPLETO. Los tramos
    // irregulares (primero o último) se prorratean por días/365 sobre el
    // tipo ANUAL, en vez de usar el tipo por periodo.
    for (const p of periods) {
      const interest = p.isRegular
        ? round2(amount * ratePerPeriod)
        : round2(amount * annualRate * (p.days / DAYS_IN_YEAR));
      entries.push({
        investmentId: id,
        expectedDate: toDateStr(p.date),
        expectedAmount: interest,
        type: 'interest',
        status: 'pending',
      });
    }

    // Principal return — siempre en expectedEndDate, íntegro
    const prt = principalReturnType || 'at_maturity';
    if (prt === 'at_maturity' || prt === 'unknown') {
      entries.push({
        investmentId: id,
        expectedDate: toDateStr(end),
        expectedAmount: amount,
        type: 'principal',
        status: 'pending',
      });
    }
    // If amortizing principal_return_type, we'd need more complex logic — Phase 2
  } else if (incomeModel === 'amortizing') {
    // Amortización francesa (cuota constante) sobre periods.length periodos —
    // incluye el tramo final aunque sea más corto que un periodo, así que la
    // cuota constante ya se dimensiona contando con él. Ese último tramo (y
    // el primero, si "fecha del primer cobro" no encaja con un periodo
    // completo) paga los intereses prorrateados por días sobre el capital
    // pendiente en vez de la cuota constante — y el ÚLTIMO tramo salda
    // SIEMPRE el 100% del capital que quede, para que la suma del capital de
    // todas las cuotas sea exactamente el importe invertido, sin importar el
    // redondeo acumulado en las cuotas intermedias (suma telescópica).
    const n = periods.length;
    let constantPayment: number;
    if (ratePerPeriod === 0) {
      constantPayment = round2(amount / n);
    } else {
      const annuity = amount * (ratePerPeriod * Math.pow(1 + ratePerPeriod, n)) / (Math.pow(1 + ratePerPeriod, n) - 1);
      constantPayment = round2(annuity);
    }

    let balance = amount;
    periods.forEach((p, idx) => {
      const isLast = idx === n - 1;
      const interest = p.isRegular
        ? round2(balance * ratePerPeriod)
        : round2(balance * annualRate * (p.days / DAYS_IN_YEAR));

      let principal: number;
      let totalAmount: number;
      if (isLast) {
        principal = balance;
        totalAmount = round2(principal + interest);
      } else {
        totalAmount = constantPayment;
        principal = round2(totalAmount - interest);
      }

      entries.push({
        investmentId: id,
        expectedDate: toDateStr(p.date),
        expectedAmount: totalAmount,
        type: 'mixed',
        status: 'pending',
      });
      balance = round2(balance - principal);
    });
  }

  return entries;
}

/**
 * Calendario de una inversión cuyo vencimiento se ha movido por un RETRASO (no una
 * prórroga): los cobros son los prometidos (generados hasta accrualEndDate, el
 * vencimiento original), pero los del último día —el capital y la última cuota—
 * se esperan en la nueva fecha. Sin retraso, es el calendario normal.
 * Ver getAccrualEndDate en calculations.ts.
 */
export function generateScheduleWithDelay(
  input: ScheduleInput,
  accrualEndDate: string | undefined,
): InvestmentScheduleEntry[] {
  const newEnd = input.expectedEndDate;
  if (!accrualEndDate || !newEnd || accrualEndDate >= newEnd) {
    return generateSchedule(input);
  }
  const entries = generateSchedule({ ...input, expectedEndDate: accrualEndDate });
  return entries.map(e => (e.expectedDate === accrualEndDate ? { ...e, expectedDate: newEnd } : e));
}
