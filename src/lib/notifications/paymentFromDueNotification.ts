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

/**
 * ¿Ya hay registrado un cobro igual (misma fecha, tipo e importe)? Evita que
 * pulsar «Sí, cobrado» en dos avisos repetidos del mismo cobro lo apunte dos
 * veces: un interés duplicado infla la base del ahorro del informe fiscal.
 */
export function hasMatchingPayment(
  payments: ReadonlyArray<{ date: string; type: string; amount: number }>,
  candidate: { date: string; type: string; amount: number },
): boolean {
  return payments.some(p =>
    p.date === candidate.date &&
    p.type === candidate.type &&
    Math.abs(p.amount - candidate.amount) < 0.005,
  );
}
