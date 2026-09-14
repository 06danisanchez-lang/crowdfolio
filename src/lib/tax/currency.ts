/**
 * ÚNICA fuente de verdad para la conversión divisa → EUR de pagos extranjeros.
 *
 * CONVENCIÓN DEL PROYECTO (payments.exchange_rate):
 *   exchange_rate = EUR por 1 unidad de la divisa original
 *   amount_eur    = original_amount * exchange_rate
 *
 * Es el INVERSO de cómo lo cotiza el BCE de forma nativa ("1 EUR = X DIVISA").
 * La Edge Function `exchange-rate` ya devuelve su campo `rate` en ESTA
 * convención (EUR por divisa) — su campo `inverseRate` es la cotización
 * nativa del BCE y NO debe usarse directamente para calcular amount_eur.
 *
 * OBLIGATORIO: cualquier código que calcule un importe en EUR a partir de
 * original_amount + exchange_rate (formularios de pago, Fase 3; motor
 * fiscal, Fase 5; exportaciones, etc.) debe llamar a `convertToEur` de este
 * archivo en vez de multiplicar a mano. La fórmula vive en un solo sitio a
 * propósito: así no puede quedar invertida por error en ningún punto de
 * consumo — un error de convención aquí significaría sobre-declarar o
 * infra-declarar ingresos extranjeros, y eso es innegociable.
 */

export type ExchangeRateSource = 'ecb' | 'manual';

/**
 * Divisas con publicación activa de referencia BCE en 2026 (verificado
 * consultando data-api.ecb.europa.eu/service/data/EXR — no es una lista de
 * memoria). El selector de divisa del formulario (Fase 3) usa esta lista
 * para no ofrecer nunca una divisa que la Edge Function `exchange-rate` no
 * pueda resolver.
 */
export const ECB_SUPPORTED_CURRENCIES: { code: string; label: string }[] = [
  { code: 'EUR', label: 'EUR — Euro' },
  { code: 'USD', label: 'USD — Dólar estadounidense' },
  { code: 'GBP', label: 'GBP — Libra esterlina' },
  { code: 'CHF', label: 'CHF — Franco suizo' },
  { code: 'AUD', label: 'AUD — Dólar australiano' },
  { code: 'BRL', label: 'BRL — Real brasileño' },
  { code: 'CAD', label: 'CAD — Dólar canadiense' },
  { code: 'CNY', label: 'CNY — Yuan chino' },
  { code: 'CZK', label: 'CZK — Corona checa' },
  { code: 'DKK', label: 'DKK — Corona danesa' },
  { code: 'HKD', label: 'HKD — Dólar de Hong Kong' },
  { code: 'HUF', label: 'HUF — Forinto húngaro' },
  { code: 'IDR', label: 'IDR — Rupia indonesia' },
  { code: 'ILS', label: 'ILS — Nuevo shéquel israelí' },
  { code: 'INR', label: 'INR — Rupia india' },
  { code: 'ISK', label: 'ISK — Corona islandesa' },
  { code: 'JPY', label: 'JPY — Yen japonés' },
  { code: 'KRW', label: 'KRW — Won surcoreano' },
  { code: 'MXN', label: 'MXN — Peso mexicano' },
  { code: 'MYR', label: 'MYR — Ringgit malasio' },
  { code: 'NOK', label: 'NOK — Corona noruega' },
  { code: 'NZD', label: 'NZD — Dólar neozelandés' },
  { code: 'PHP', label: 'PHP — Peso filipino' },
  { code: 'PLN', label: 'PLN — Zloty polaco' },
  { code: 'RON', label: 'RON — Leu rumano' },
  { code: 'SEK', label: 'SEK — Corona sueca' },
  { code: 'SGD', label: 'SGD — Dólar de Singapur' },
  { code: 'THB', label: 'THB — Baht tailandés' },
  { code: 'TRY', label: 'TRY — Lira turca' },
  { code: 'ZAR', label: 'ZAR — Rand sudafricano' },
];

/**
 * Convierte un importe en divisa extranjera a EUR usando la convención del
 * proyecto. Úsala SIEMPRE en vez de `originalAmount * exchangeRate` inline.
 *
 * Lanza si exchangeRate no es un número positivo: mejor un error explícito
 * en desarrollo que un amount_eur silenciosamente incorrecto (0, NaN o
 * negativo) colándose en un cálculo fiscal.
 */
export function convertToEur(originalAmount: number, exchangeRate: number): number {
  if (!Number.isFinite(exchangeRate) || exchangeRate <= 0) {
    throw new Error(
      `convertToEur: exchange_rate inválido (${exchangeRate}). Debe ser un número > 0 en EUR por unidad de divisa.`,
    );
  }
  return originalAmount * exchangeRate;
}

/**
 * Invierte una cotización nativa del BCE ("1 EUR = X DIVISA", el campo
 * `inverseRate` de la Edge Function) a la convención del proyecto (EUR por
 * 1 unidad de divisa). Solo necesaria si en algún punto se maneja esa
 * cotización nativa en vez del `rate` ya invertido que la función devuelve.
 */
export function eurRateFromEcbQuote(ecbQuote: number): number {
  if (!Number.isFinite(ecbQuote) || ecbQuote <= 0) {
    throw new Error(`eurRateFromEcbQuote: cotización BCE inválida (${ecbQuote}). Debe ser un número > 0.`);
  }
  return 1 / ecbQuote;
}
