// Cuotas de intereses sin cobro para el correo diario (send-digest).
//
// Decide igual que la app: emparejamiento por importes (scheduleMatching.ts,
// compartido) y cuotas «cobradas, falta el detalle» (src/lib/investment/
// assumedPaid.ts). Sin imports remotos para poder probarlo con vitest
// (src/lib/notifications/digestPayments.test.ts).
import { matchScheduleToPayments, type PaymentLike, type ScheduleEntryLike } from "./scheduleMatching.ts";

export interface CandidateRow {
  user_id: string;
  email: string;
  investment_id: string;
  project_name: string;
  platform: string;
  custom_platform_name: string | null;
  income_model: string | null;
  assumed_paid_until: string | null;
  schedule: ScheduleEntryLike[] | null;
  payments: PaymentLike[] | null;
}

export interface DuePaymentRow {
  user_id: string;
  email: string;
  kind: "payment_due";
  investment_id: string;
  project_name: string;
  platform: string;
  custom_platform_name: string | null;
  event_date: string;
  promised_date: null;
  dedupe_key: string;
}

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Cuotas de intereses de los últimos 7 días que siguen sin cobro, decididas como
 * en la app: emparejamiento por importes (useInvestments → matchScheduleToPayments)
 * y cuotas «cobradas, falta el detalle» (assumedPaid.ts). Las omitidas tampoco.
 */
export function duePaymentRows(candidates: CandidateRow[], today: string): DuePaymentRow[] {
  const from = addDays(today, -7);
  const rows: DuePaymentRow[] = [];
  for (const c of candidates) {
    const matched = matchScheduleToPayments(c.income_model, c.schedule ?? [], c.payments ?? []);
    for (const e of matched) {
      if (e.type !== "interest" || e.matchedPaymentId) continue;
      if (e.status === "matched" || e.status === "skipped") continue;
      if (c.assumed_paid_until && e.expectedDate <= c.assumed_paid_until) continue;
      if (e.expectedDate < from || e.expectedDate > today) continue;
      rows.push({
        user_id: c.user_id,
        email: c.email,
        kind: "payment_due",
        investment_id: c.investment_id,
        project_name: c.project_name,
        platform: c.platform,
        custom_platform_name: c.custom_platform_name,
        event_date: e.expectedDate,
        promised_date: null,
        dedupe_key: `payment_due:${c.investment_id}:${e.expectedDate}`,
      });
    }
  }
  return rows;
}

