/**
 * Clave que identifica un aviso para que la base de datos no guarde dos
 * iguales (índice único notifications(user_id, dedupe_key), migración
 * 20261008200903). Refleja las mismas reglas de "ya existe" que usa el
 * generador: un aviso de cobro por inversión y fecha prevista, uno de
 * vencimiento por inversión, un resumen por semana, etc.
 *
 * null = tipo sin regla de unicidad (se puede repetir).
 */
export function notificationDedupeKey(
  type: string | null | undefined,
  data: Record<string, unknown> | null | undefined,
): string | null {
  if (!type) return null;
  const d = data ?? {};
  const str = (v: unknown) => (typeof v === 'string' && v !== '' ? v : null);
  const investmentId = str(d.investmentId);

  switch (type) {
    case 'payment_due': {
      const date = str(d.scheduleEntryDate);
      return investmentId && date ? `payment_due:${investmentId}:${date}` : null;
    }
    case 'maturity_soon':
    case 'maturity_overdue':
    case 'fiscal_loss_ready':
    case 'fiscal_loss_incomplete':
      return investmentId ? `${type}:${investmentId}` : null;
    case 'fiscal_loss_review': {
      const reviewDate = str(d.reviewDate);
      return investmentId && reviewDate ? `fiscal_loss_review:${investmentId}:${reviewDate}` : null;
    }
    case 'weekly_summary': {
      const weekKey = str(d.weekKey);
      return weekKey ? `weekly_summary:${weekKey}` : null;
    }
    default:
      return null;
  }
}
