/**
 * Tipo de cambio de referencia del BCE para una divisa y fecha, vía la Edge
 * Function `exchange-rate`. Es solo una propuesta: el usuario lo puede cambiar.
 * `rate` viene en euros por 1 unidad de divisa (ver lib/currency/fx.ts).
 */
export interface ExchangeRateSuggestion {
  currency: string;
  requestedDate: string;
  /** Día de la publicación usada (anterior a la pedida si esa era festivo). */
  rateDate: string;
  fellBack: boolean;
  rate: number;
  /** Cotización tal cual la publica el BCE ("1 EUR = X divisa"), solo informativa. */
  inverseRate: number;
  source: 'ECB' | 'identity';
}

// Sin unión discriminada: el proyecto compila sin strictNullChecks y TS no
// estrecha `ok`. Si ok es true, `data` está presente; si es false, `message`.
export interface ExchangeRateResult {
  ok: boolean;
  data?: ExchangeRateSuggestion;
  message?: string;
}

/** Nunca lanza: si falla, el formulario pide el tipo a mano. */
export async function fetchExchangeRate(currency: string, date: string): Promise<ExchangeRateResult> {
  try {
    // Import diferido: el cliente de Supabase no se carga hasta que hace falta
    // (y los tests de formularios no necesitan configurarlo).
    const { supabase } = await import('@/integrations/supabase/client');
    const { data, error } = await supabase.functions.invoke('exchange-rate', { body: { currency, date } });
    if (error) return { ok: false, message: 'No se ha podido consultar el BCE. Escribe el tipo de cambio a mano.' };
    if (!data || typeof data.rate !== 'number' || !Number.isFinite(data.rate) || data.rate <= 0) {
      return { ok: false, message: (data && typeof data.message === 'string' && data.message) || 'El BCE no tiene tipo para esa fecha. Escríbelo a mano.' };
    }
    return { ok: true, data: data as ExchangeRateSuggestion };
  } catch {
    return { ok: false, message: 'No se ha podido consultar el BCE. Escribe el tipo de cambio a mano.' };
  }
}
