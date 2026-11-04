/**
 * Origen del registro: de dónde llega alguien la primera vez que entra en la web.
 *
 * Se guarda en el navegador la primera visita con `?ref=` o `utm_*` (o, si no
 * hay, el dominio desde el que llegó) y, al crear la cuenta, se copia a los
 * metadatos del usuario (`auth.users.raw_user_meta_data.attribution`). Así se
 * puede saber si un registro vino de un enlace de Telegram, de Rankia, etc.
 *
 * Solo guarda la etiqueta del enlace y el dominio de procedencia, nunca la URL
 * completa ni datos personales.
 */
const STORAGE_KEY = 'cf_attribution';
const MAX_AGE_MS = 60 * 24 * 60 * 60 * 1000; // 60 días
const MAX_LEN = 80;

export interface Attribution {
  ref?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  referrer?: string;
  landing?: string;
  first_seen: string;
}

const clean = (v: string | null | undefined): string | undefined => {
  const t = (v ?? '').trim().slice(0, MAX_LEN);
  return t || undefined;
};

/** Lee `ref`/`utm_*` de una URL y el dominio de procedencia. Pura, para tests. */
export function parseAttribution(
  href: string,
  referrer: string,
  now: Date = new Date(),
): Attribution | null {
  let url: URL;
  try { url = new URL(href); } catch { return null; }
  const p = url.searchParams;
  let refHost: string | undefined;
  try {
    const r = referrer ? new URL(referrer).hostname.replace(/^www\./, '') : '';
    const own = url.hostname.replace(/^www\./, '');
    refHost = r && r !== own ? clean(r) : undefined;
  } catch { refHost = undefined; }

  const a: Attribution = {
    ref: clean(p.get('ref')),
    utm_source: clean(p.get('utm_source')),
    utm_medium: clean(p.get('utm_medium')),
    utm_campaign: clean(p.get('utm_campaign')),
    referrer: refHost,
    landing: clean(url.pathname),
    first_seen: now.toISOString(),
  };
  const hasSignal = a.ref || a.utm_source || a.utm_medium || a.utm_campaign || a.referrer;
  return hasSignal ? a : null;
}

/** Guarda el origen de esta visita si no había uno reciente (primer contacto). */
export function captureAttribution(): void {
  try {
    const found = parseAttribution(window.location.href, document.referrer);
    if (!found) return;
    const prev = getStoredAttribution();
    // Un enlace con ?ref= o utm sustituye a una visita anterior que solo traía dominio.
    const prevIsWeak = prev && !prev.ref && !prev.utm_source;
    const foundIsStrong = !!(found.ref || found.utm_source);
    if (prev && !(prevIsWeak && foundIsStrong)) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(found));
  } catch { /* navegador sin almacenamiento: no pasa nada */ }
}

export function getStoredAttribution(): Attribution | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const a = JSON.parse(raw) as Attribution;
    if (!a.first_seen || Date.now() - new Date(a.first_seen).getTime() > MAX_AGE_MS) return null;
    return a;
  } catch {
    return null;
  }
}
