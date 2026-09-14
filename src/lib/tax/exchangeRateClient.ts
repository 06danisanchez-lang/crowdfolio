import { supabase } from '@/integrations/supabase/client';

/**
 * Cliente fino para la Edge Function `exchange-rate`. La función solo
 * SUGIERE un tipo de cambio (referencia BCE); el override manual es
 * responsabilidad del formulario que llama a esto (Fase 3) — ver
 * src/lib/tax/currency.ts para la convención de `rate`.
 */
export interface ExchangeRateSuggestion {
  currency: string;
  requestedDate: string;
  rateDate: string;
  /** true si la fecha pedida no era día hábil BCE y se usó la publicación anterior */
  fellBack: boolean;
  /** EUR por 1 unidad de currency — ver convertToEur en currency.ts */
  rate: number;
  /** cotización nativa del BCE ("1 EUR = X currency"), solo informativa */
  inverseRate: number;
  source: 'ECB' | 'identity';
  sourceUrl?: string;
}

export interface ExchangeRateFetchError {
  message: string;
}

export type ExchangeRateResult =
  | { ok: true; data: ExchangeRateSuggestion }
  | { ok: false; error: ExchangeRateFetchError };

/**
 * Pide al BCE (vía la Edge Function) el tipo de cambio sugerido para
 * `currency` en `date` (YYYY-MM-DD). Nunca lanza: cualquier fallo (red,
 * divisa no soportada, sin publicación en la ventana...) vuelve como
 * `{ ok: false }` para que el formulario caiga a "introduce el tipo de
 * cambio a mano" en vez de romper el flujo.
 */
export async function fetchExchangeRateSuggestion(
  currency: string,
  date: string,
): Promise<ExchangeRateResult> {
  try {
    const { data, error } = await supabase.functions.invoke('exchange-rate', {
      body: { currency, date },
    });

    if (error) {
      return { ok: false, error: { message: error.message || 'No se pudo contactar con el servicio de tipo de cambio' } };
    }
    if (!data || typeof data.rate !== 'number' || !Number.isFinite(data.rate) || data.rate <= 0) {
      return { ok: false, error: { message: (data && data.message) || 'Respuesta inesperada del servicio de tipo de cambio' } };
    }
    return { ok: true, data: data as ExchangeRateSuggestion };
  } catch (err) {
    return { ok: false, error: { message: err instanceof Error ? err.message : 'Error desconocido pidiendo el tipo de cambio' } };
  }
}
