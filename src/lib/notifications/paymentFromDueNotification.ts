/**
 * Pago a registrar cuando el usuario pulsa "Sí, cobrado" en una notificación
 * de cobro esperado (payment_due).
 *
 * - La fecha se guarda tal cual viene del calendario ('YYYY-MM-DD'). Nunca
 *   pasar por `new Date(...).toISOString()`: convierte a UTC y con zonas
 *   horarias negativas guarda el día anterior (ver lib/dateOnly.ts).
 * - Devuelve null cuando no se puede registrar sin preguntar el importe:
 *   la renta trimestral de un equity 'rentas' (la notificación no lleva
 *   importe y se registra como devolución de prima de emisión, no como
 *   interés), o datos incompletos. En ese caso hay que abrir la inversión.
 */
export function paymentFromDueNotification(
  data: Record<string, unknown> | null | undefined,
): { investmentId: string; payment: { date: string; amount: number; type: 'interest' } } | null {
  if (!data) return null;
  if (data.isEquityRent === true) return null;

  const investmentId = data.investmentId;
  const date = data.scheduleEntryDate;
  const amount = data.expectedAmount;
  if (typeof investmentId !== 'string' || investmentId === '') return null;
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) return null;

  return { investmentId, payment: { date, amount, type: 'interest' } };
}
