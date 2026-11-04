/**
 * Vercel Web Analytics: antes de enviar una visita, se deja solo la ruta y las
 * etiquetas de campaña (`ref`, `utm_*`). Así nunca salen tokens de inicio de
 * sesión o de cambio de contraseña (van en la query o en el hash) ni otros
 * parámetros.
 */
const KEEP_PARAMS = ['ref', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];

export function sanitizeAnalyticsUrl(raw: string): string {
  let url: URL;
  try { url = new URL(raw); } catch { return raw; }
  const kept = new URLSearchParams();
  for (const k of KEEP_PARAMS) {
    const v = url.searchParams.get(k);
    if (v) kept.set(k, v.slice(0, 80));
  }
  const q = kept.toString();
  return `${url.origin}${url.pathname}${q ? `?${q}` : ''}`;
}

export function analyticsBeforeSend<T extends { url: string }>(event: T): T | null {
  return { ...event, url: sanitizeAnalyticsUrl(event.url) };
}
