import type { Payment } from '@/types/investment';

/** Lo cobrado partido en rendimientos y capital devuelto: sumarlo todo junto inflaba el total. */
export interface ReceivedTotals {
  /** Intereses, dividendos y ganancias al cerrar un equity. */
  income: number;
  /** Devolución de capital (principal) y de prima de emisión (capital_return). */
  capital: number;
}

const CAPITAL_TYPES: ReadonlySet<Payment['type']> = new Set(['principal', 'capital_return']);

export function isCapitalReturn(type: Payment['type']): boolean {
  return CAPITAL_TYPES.has(type);
}

export function sumReceived(rows: { type: Payment['type']; amount: number }[]): ReceivedTotals {
  const totals: ReceivedTotals = { income: 0, capital: 0 };
  for (const r of rows) {
    if (isCapitalReturn(r.type)) totals.capital += r.amount;
    else totals.income += r.amount;
  }
  totals.income = Math.round(totals.income * 100) / 100;
  totals.capital = Math.round(totals.capital * 100) / 100;
  return totals;
}

export interface MonthGroup<T> extends ReceivedTotals {
  /** 'YYYY-MM' */
  month: string;
  rows: T[];
}

/** Agrupa por mes conservando el orden en que llegan las filas (la lista ya viene ordenada por fecha). */
export function groupByMonth<T extends { date: string; type: Payment['type']; amount: number }>(rows: T[]): MonthGroup<T>[] {
  const groups: MonthGroup<T>[] = [];
  const byKey = new Map<string, MonthGroup<T>>();
  for (const row of rows) {
    const month = row.date.slice(0, 7);
    let g = byKey.get(month);
    if (!g) {
      g = { month, rows: [], income: 0, capital: 0 };
      byKey.set(month, g);
      groups.push(g);
    }
    g.rows.push(row);
  }
  for (const g of groups) Object.assign(g, sumReceived(g.rows));
  return groups;
}
