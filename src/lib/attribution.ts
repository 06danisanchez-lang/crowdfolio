/**
 * Procedencia de las altas (UTM y `ref`).
 *
 * Al entrar con un enlace de campaña (p. ej. `/demo?utm_source=ig&utm_campaign=cartera`)
 * se guarda en este navegador. Si la persona se da de alta después (aunque pase
 * antes por la demo, que redirige y pierde la URL), la procedencia se apunta en
 * los metadatos de su usuario (`signup_source`, `signup_campaign`, `signup_ref`).
 * Último clic: un enlace nuevo sustituye al anterior. Caduca a los 30 días.
 */
const STORAGE_KEY = 'cf_attribution';
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_LEN = 80;

export interface Attribution {
  source: string | null;
  campaign: string | null;
  ref: string | null;
  at: number;
}

function clean(value: string | null): string | null {
  const v = value?.trim();
  return v ? v.slice(0, MAX_LEN) : null;
}

export function parseAttribution(search: string, now: number = Date.now()): Attribution | null {
  const params = new URLSearchParams(search);
  const source = clean(params.get('utm_source'));
  const campaign = clean(params.get('utm_campaign'));
  const ref = clean(params.get('ref'));
  if (!source && !campaign && !ref) return null;
  return { source, campaign, ref, at: now };
}

/** Se llama una vez al cargar la web. */
export function captureAttribution(search: string = window.location.search, now: number = Date.now()): void {
  const found = parseAttribution(search, now);
  if (!found) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(found));
  } catch {
    // Sin almacenamiento (modo privado estricto): no se atribuye, nada más.
  }
}

export function readAttribution(now: number = Date.now()): Attribution | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Attribution;
    if (typeof parsed?.at !== 'number' || now - parsed.at > MAX_AGE_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Metadatos para el usuario nuevo, o null si no hay procedencia. */
export function attributionMetadata(now: number = Date.now()): Record<string, string> | null {
  const a = readAttribution(now);
  if (!a) return null;
  const data: Record<string, string> = {};
  if (a.source) data.signup_source = a.source;
  if (a.campaign) data.signup_campaign = a.campaign;
  if (a.ref) data.signup_ref = a.ref;
  return Object.keys(data).length > 0 ? data : null;
}
