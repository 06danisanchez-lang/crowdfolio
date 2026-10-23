import { IncomeModel, InvestmentScheduleEntry, Payment } from '@/types/investment';
import { matchScheduleToPayments } from '@/lib/investment/scheduleMatching';
import { applyAssumedPaid } from '@/lib/investment/assumedPaid';

/**
 * Lo que le falta al informe fiscal de un año.
 *
 * El informe solo suma cobros registrados. Si una cuota de intereses de ese
 * año está «cobrada, falta el detalle» (el usuario dice que la cobró, pero no
 * hay cobro registrado), el informe se queda corto y NO puede presentarse como
 * completo: se marca como BORRADOR · INCOMPLETO hasta que se registren.
 *
 * Aparte, las cuotas de intereses vencidas sin cobro registrado ni marca son
 * «sin confirmar»: para la app son retrasos (no han llegado), así que el
 * informe es correcto, pero se avisa por si el usuario las cobró y no las apuntó.
 *
 * Solo cuotas con rendimiento (intereses, o cuotas mixtas de las amortizables):
 * el capital devuelto no es renta.
 */

export interface MissingIncomeInvestment {
  id: string;
  projectName: string;
  incomeModel: IncomeModel | null | undefined;
  status: string;
  assumedPaidUntil?: string | null;
  payments: Pick<Payment, 'id' | 'date' | 'amount' | 'type'>[];
}

export interface MissingIncomeItem {
  investmentId: string;
  projectName: string;
  /** Fechas previstas de las cuotas afectadas, en orden. */
  dates: string[];
}

export interface MissingIncome {
  /** Cobradas según el usuario, sin cobro registrado: el informe está incompleto. */
  assumed: MissingIncomeItem[];
  /** Vencidas sin cobro ni marca: aviso. */
  unconfirmed: MissingIncomeItem[];
  isIncomplete: boolean;
}

const INCOME_TYPES = new Set(['interest', 'mixed']);

export function findMissingIncome(input: {
  year: number;
  /** 'YYYY-MM-DD' */
  today: string;
  investments: MissingIncomeInvestment[];
  schedules: Record<string, InvestmentScheduleEntry[]>;
}): MissingIncome {
  const from = `${input.year}-01-01`;
  const to = `${input.year}-12-31`;
  const assumed: MissingIncomeItem[] = [];
  const unconfirmed: MissingIncomeItem[] = [];

  for (const inv of input.investments) {
    if (inv.incomeModel !== 'periodic_fixed' && inv.incomeModel !== 'amortizing') continue;
    // En impago, lo no cobrado va por la pérdida (cuestionario), no aquí.
    if (inv.status === 'defaulted' || inv.status === 'draft') continue;
    const schedule = input.schedules[inv.id];
    if (!schedule?.length) continue;

    const resolved = applyAssumedPaid(
      matchScheduleToPayments(inv.incomeModel, schedule, inv.payments as Payment[]),
      inv.assumedPaidUntil,
    );
    const inYear = resolved
      .filter(e => INCOME_TYPES.has(e.type) && e.expectedDate >= from && e.expectedDate <= to)
      .sort((a, b) => a.expectedDate.localeCompare(b.expectedDate));

    const assumedDates = inYear.filter(e => e.status === 'assumed').map(e => e.expectedDate);
    if (assumedDates.length) assumed.push({ investmentId: inv.id, projectName: inv.projectName, dates: assumedDates });

    // Sin confirmar: solo en inversiones abiertas (una cerrada ya se liquidó por su cierre).
    if (inv.status === 'active' || inv.status === 'pending') {
      const pendingDates = inYear
        .filter(e => (e.status ?? 'pending') === 'pending' && e.expectedDate < input.today)
        .map(e => e.expectedDate);
      if (pendingDates.length) unconfirmed.push({ investmentId: inv.id, projectName: inv.projectName, dates: pendingDates });
    }
  }

  return { assumed, unconfirmed, isIncomplete: assumed.length > 0 };
}

export const NO_MISSING_INCOME: MissingIncome = { assumed: [], unconfirmed: [], isIncomplete: false };

/** «3 cuotas» / «1 cuota». */
export function countInstallments(items: MissingIncomeItem[]): number {
  return items.reduce((n, i) => n + i.dates.length, 0);
}
