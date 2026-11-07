import { addMonths } from 'date-fns';
import { toDateOnlyString } from '@/lib/dateOnly';
import { generateScheduleWithDelay } from '@/lib/investment/scheduleGenerator';
import { calculateSimpleInterestOnOutstanding, getAccrualEndDate } from '@/lib/investment/calculations';
import type {
  IncomeModel,
  InvestmentStatus,
  PaymentFrequency,
  PaymentType,
  Platform,
} from '@/types/investment';

/**
 * Cartera de ejemplo de la demo pública (/demo).
 *
 * Todo se calcula a partir de la fecha del día en que entra el visitante, para que
 * los estados cuadren siempre (una «retrasada» siempre lo está, el informe fiscal
 * siempre tiene cobros del año en curso y del anterior…).
 *
 * Los nombres de proyecto son INVENTADOS a propósito (letras griegas): no deben
 * parecer proyectos reales de ninguna plataforma.
 *
 * Los cobros salen del mismo calendario de cuotas que genera la app al dar de
 * alta una inversión (generateScheduleWithDelay), así cuotas y cobros cuadran.
 */

export const DEMO_WITHHOLDING_RATE = 0.19;

export interface DemoPayment {
  date: string;
  amount: number;
  type: PaymentType;
  withholding: number;
}

export interface DemoScheduleRow {
  expectedDate: string;
  expectedAmount: number;
  type: string;
  status: string;
}

export interface DemoInvestment {
  key: string;
  platform: Platform;
  projectName: string;
  amount: number;
  expectedReturn: number;
  incomeModel: IncomeModel;
  paymentFrequency: PaymentFrequency | null;
  principalReturnType: 'at_maturity';
  investmentDate: string;
  expectedEndDate: string;
  originalEndDate: string | null;
  interestEndDate: string | null;
  wasExtended: boolean;
  status: InvestmentStatus;
  actualEndDate: string | null;
  closeReason: 'on_time' | null;
  defaultedAt: string | null;
  loss: {
    insolvencyStatus: 'none';
    enforcementStarted: boolean;
    enforcementDate: string;
    enforcementInitiator: 'platform';
    assessedAt: string;
  } | null;
  notes: string;
  schedule: DemoScheduleRow[];
  payments: DemoPayment[];
}

export interface DemoFutureInvestment {
  platform: Platform;
  projectName: string;
  estimatedAmount: number;
  expectedReturn: number;
  estimatedOpenDate: string;
  estimatedEndDate: string;
  notes: string;
}

export interface DemoPortfolio {
  investments: DemoInvestment[];
  future: DemoFutureInvestment[];
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

const NOTE = 'Inversión de ejemplo de la demo.';

interface Spec {
  key: string;
  platform: Platform;
  projectName: string;
  amount: number;
  expectedReturn: number;
  incomeModel: 'bullet' | 'periodic_fixed';
  paymentFrequency?: PaymentFrequency;
  /** Meses respecto a hoy (negativo = pasado). */
  investedAt: number;
  promisedEndAt: number;
  /** Si la fecha se ha movido: nueva fecha (meses respecto a hoy) y si es prórroga o retraso. */
  movedTo?: { at: number; kind: 'extended' | 'delayed' };
  status: InvestmentStatus;
  /** Para un impago: desde cuándo (meses respecto a hoy). Las cuotas posteriores no se cobran. */
  defaultedAt?: number;
}

/** Día 1 del mes: ninguna fecha cae en un 29-31 que no existe y, desde el 1 de enero,
 * el año en curso ya tiene algún cobro (informe fiscal con datos). */
function monthsFrom(base: Date, months: number): string {
  const d = addMonths(new Date(base.getFullYear(), base.getMonth(), 1), months);
  return toDateOnlyString(d);
}

const SPECS: Spec[] = [
  // Cerrada el año pasado: intereses + devolución de capital (informe fiscal del año anterior).
  { key: 'alfa', platform: 'urbanitae', projectName: 'Residencial Alfa (Valencia)', amount: 5000, expectedReturn: 11,
    incomeModel: 'bullet', investedAt: -30, promisedEndAt: -12, status: 'completed' },
  // Cerrada este año.
  { key: 'zeta', platform: 'housers', projectName: 'Apartamentos Zeta (Valencia)', amount: 1500, expectedReturn: 7,
    incomeModel: 'bullet', investedAt: -18, promisedEndAt: -4, status: 'completed' },
  // Al corriente, intereses trimestrales.
  { key: 'beta', platform: 'wecity', projectName: 'Lofts Beta (Madrid)', amount: 3000, expectedReturn: 9,
    incomeModel: 'periodic_fixed', paymentFrequency: 'quarterly', investedAt: -20, promisedEndAt: 4, status: 'active' },
  // Al corriente, intereses mensuales.
  { key: 'gamma', platform: 'housers', projectName: 'Viviendas Gamma (Málaga)', amount: 2000, expectedReturn: 8,
    incomeModel: 'periodic_fixed', paymentFrequency: 'monthly', investedAt: -14, promisedEndAt: 10, status: 'active' },
  // Retraso en el cobro: cobrará lo prometido, más tarde → TAE ajustada más baja.
  { key: 'delta', platform: 'urbanitae', projectName: 'Promoción Delta (Sevilla)', amount: 4000, expectedReturn: 10,
    incomeModel: 'bullet', investedAt: -15, promisedEndAt: -3, movedTo: { at: 5, kind: 'delayed' }, status: 'active' },
  // Prórroga oficial: sigue generando intereses al mismo tipo.
  { key: 'epsilon', platform: 'wecity', projectName: 'Edificio Épsilon (Alicante)', amount: 2500, expectedReturn: 12,
    incomeModel: 'bullet', investedAt: -16, promisedEndAt: -2, movedTo: { at: 6, kind: 'extended' }, status: 'active' },
  // Vencida sin cobrar, pendiente de confirmar.
  { key: 'eta', platform: 'urbanitae', projectName: 'Residencial Eta (Barcelona)', amount: 3000, expectedReturn: 10,
    incomeModel: 'bullet', investedAt: -24, promisedEndAt: -1, status: 'pending' },
  // Impago: cobró los primeros trimestres y dejó de pagar.
  { key: 'theta', platform: 'wecity', projectName: 'Locales Theta (Zaragoza)', amount: 2000, expectedReturn: 11,
    incomeModel: 'periodic_fixed', paymentFrequency: 'quarterly', investedAt: -22, promisedEndAt: -4, status: 'defaulted',
    defaultedAt: -9 },
];

function buildInvestment(spec: Spec, today: Date): DemoInvestment {
  const todayStr = toDateOnlyString(today);
  const investmentDate = monthsFrom(today, spec.investedAt);
  const promisedEnd = monthsFrom(today, spec.promisedEndAt);
  const expectedEndDate = spec.movedTo ? monthsFrom(today, spec.movedTo.at) : promisedEnd;
  const originalEndDate = spec.movedTo ? promisedEnd : null;
  const interestEndDate = spec.movedTo?.kind === 'delayed' ? promisedEnd : null;
  const wasExtended = spec.movedTo?.kind === 'extended';

  const entries = generateScheduleWithDelay({
    id: spec.key,
    amount: spec.amount,
    expectedReturn: spec.expectedReturn,
    incomeModel: spec.incomeModel,
    paymentFrequency: spec.paymentFrequency ?? null,
    principalReturnType: 'at_maturity',
    investmentDate,
    expectedEndDate,
  }, getAccrualEndDate({ expectedEndDate, interestEndDate }));

  const schedule: DemoScheduleRow[] = entries.map(e => ({
    expectedDate: e.expectedDate,
    expectedAmount: e.expectedAmount,
    type: e.type,
    status: e.status || 'pending',
  }));

  // Cobrado: lo que vencía hasta hoy, salvo en la vencida sin confirmar y, en el
  // impago, lo que vencía después de dejar de pagar.
  const paidUntil = spec.status === 'pending'
    ? null
    : spec.defaultedAt !== undefined ? monthsFrom(today, spec.defaultedAt) : todayStr;

  const scheduled: DemoPayment[] = paidUntil === null ? [] : entries
    .filter(e => e.expectedDate <= paidUntil && e.expectedAmount > 0)
    .map(e => {
      const type: PaymentType = e.type === 'principal' ? 'principal' : 'interest';
      return {
        date: e.expectedDate,
        amount: round2(e.expectedAmount),
        type,
        withholding: type === 'interest' ? round2(e.expectedAmount * DEMO_WITHHOLDING_RATE) : 0,
      };
    });

  // Préstamo al vencimiento (bullet): no tiene calendario de cuotas; si ya se cerró,
  // cobró los intereses (interés simple, igual que calcula la app) y el capital.
  const bulletClosing: DemoPayment[] = [];
  if (spec.incomeModel === 'bullet' && spec.status === 'completed') {
    const interest = round2(calculateSimpleInterestOnOutstanding(
      { amount: spec.amount, expectedReturn: spec.expectedReturn, investmentDate, payments: [] },
      // Mismo criterio que calculateInvestmentTotalReturn (new Date de la fecha).
      new Date(expectedEndDate),
    ));
    bulletClosing.push(
      { date: expectedEndDate, amount: interest, type: 'interest', withholding: round2(interest * DEMO_WITHHOLDING_RATE) },
      { date: expectedEndDate, amount: spec.amount, type: 'principal', withholding: 0 },
    );
  }
  const payments = [...scheduled, ...bulletClosing];

  const defaultedAt = spec.defaultedAt !== undefined ? monthsFrom(today, spec.defaultedAt) : null;

  return {
    key: spec.key,
    platform: spec.platform,
    projectName: spec.projectName,
    amount: spec.amount,
    expectedReturn: spec.expectedReturn,
    incomeModel: spec.incomeModel,
    paymentFrequency: spec.paymentFrequency ?? null,
    principalReturnType: 'at_maturity',
    investmentDate,
    expectedEndDate,
    originalEndDate,
    interestEndDate,
    wasExtended,
    status: spec.status,
    actualEndDate: spec.status === 'completed' ? expectedEndDate : null,
    closeReason: spec.status === 'completed' ? 'on_time' : null,
    defaultedAt,
    // Impago: la plataforma inició la ejecución hace 3 meses. Hasta que pase un año
    // (art. 14.2.k LIRPF) la pérdida todavía no se puede declarar.
    loss: spec.status === 'defaulted' ? {
      insolvencyStatus: 'none',
      enforcementStarted: true,
      enforcementDate: monthsFrom(today, -3),
      enforcementInitiator: 'platform',
      assessedAt: today.toISOString(),
    } : null,
    notes: NOTE,
    schedule,
    payments,
  };
}

export function buildDemoPortfolio(today: Date = new Date()): DemoPortfolio {
  return {
    investments: SPECS.map(s => buildInvestment(s, today)),
    future: [{
      platform: 'urbanitae',
      projectName: 'Viviendas Iota (Madrid)',
      estimatedAmount: 3000,
      expectedReturn: 10,
      estimatedOpenDate: monthsFrom(today, 1),
      estimatedEndDate: monthsFrom(today, 19),
      notes: 'Inversión planificada de ejemplo.',
    }],
  };
}
