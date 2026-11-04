/**
 * Un aviso «Vencimiento próximo» deja de tener sentido cuando la fecha ya ha
 * pasado: a partir de ahí lo sustituye «¿Ha vencido…?» (maturity_overdue).
 * Sin este filtro, el usuario ve a la vez «vence el 25 de septiembre» y
 * «lleva 40 días de retraso» para la misma inversión.
 */
export interface MaturityNotificationLike {
  type: string;
  data: Record<string, unknown> | null;
}

export function isStaleMaturitySoon(n: MaturityNotificationLike, today: Date): boolean {
  if (n.type !== 'maturity_soon') return false;
  const raw = n.data?.maturityDate;
  if (typeof raw !== 'string') return false;
  const todayIso = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('-');
  return raw.slice(0, 10) < todayIso;
}

export function dropStaleMaturitySoon<T extends MaturityNotificationLike>(list: T[], today: Date = new Date()): T[] {
  return list.filter(n => !isStaleMaturitySoon(n, today));
}
