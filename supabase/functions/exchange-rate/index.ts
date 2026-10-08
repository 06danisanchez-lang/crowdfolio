import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

// ============================================================================
// exchange-rate
//
// Dada una divisa (ISO 4217) y una fecha, devuelve el tipo de cambio de
// referencia del BCE a EUR para esa fecha. Si la fecha cae en un día no
// hábil (fin de semana o festivo TARGET2, en el que el BCE no publica),
// usa automáticamente la última publicación anterior.
//
// El resultado es una SUGERENCIA precargable en el formulario de pago
// (Fase 3): el override manual se hace en el cliente, editando el valor
// antes de guardarlo en payments.exchange_rate. Esta función no tiene un
// "modo override" — no hay nada que validar contra un valor introducido
// a mano, ese es justo el punto del override.
//
// Fuente: ECB Data Portal (data-api.ecb.europa.eu), dataset EXR,
// serie D.{CURRENCY}.EUR.SP00.A ("fixing" diario a las 14:15 CET).
// La serie expresa "1 EUR = X {CURRENCY}"; el campo `rate` que devolvemos
// es el inverso (EUR por 1 unidad de la divisa), que es lo que
// payments.exchange_rate espera: amount_eur = original_amount * rate.
// ============================================================================

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ECB_BASE = "https://data-api.ecb.europa.eu/service/data/EXR";

// Ventana hacia atrás al buscar la última publicación antes de la fecha
// pedida. 10 días cubre con margen el puente más largo del calendario
// TARGET2 (Navidad/Año Nuevo son como mucho 3-4 días seguidos sin publicar).
const LOOKBACK_DAYS = 10;

const CURRENCY_RE = /^[A-Z]{3}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isValidCalendarDate(iso: string): boolean {
  const d = new Date(`${iso}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === iso;
}

function shiftDate(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// Parseo mínimo de CSV (el feed del BCE no trae comas dentro de campos
// numéricos/fecha, que son las únicas columnas que leemos).
function parseEcbCsv(csv: string): Array<{ date: string; value: number }> {
  const lines = csv.trim().split("\n");
  if (lines.length < 2) return [];
  const header = lines[0].split(",");
  const timeIdx = header.indexOf("TIME_PERIOD");
  const valueIdx = header.indexOf("OBS_VALUE");
  if (timeIdx === -1 || valueIdx === -1) return [];

  const rows: Array<{ date: string; value: number }> = [];
  for (const line of lines.slice(1)) {
    if (!line.trim()) continue;
    const cols = line.split(",");
    const date = cols[timeIdx];
    const value = Number(cols[valueIdx]);
    if (date && Number.isFinite(value)) rows.push({ date, value });
  }
  // El feed ya viene ordenado por fecha ascendente, pero no confiamos en eso.
  rows.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return rows;
}

async function fetchEcbRate(currency: string, date: string) {
  const startPeriod = shiftDate(date, -LOOKBACK_DAYS);
  const url =
    `${ECB_BASE}/D.${currency}.EUR.SP00.A` +
    `?startPeriod=${startPeriod}&endPeriod=${date}&format=csvdata`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  let res: Response;
  try {
    res = await fetch(url, { signal: controller.signal, headers: { Accept: "text/csv" } });
  } catch (err) {
    throw { kind: "upstream_unreachable", message: String(err), url };
  } finally {
    clearTimeout(timeout);
  }

  if (res.status === 404) {
    // El BCE no tiene ninguna serie para esa divisa: no es un fallo de red,
    // es que esa divisa no está entre las de referencia del BCE.
    throw { kind: "unsupported_currency", message: `El BCE no publica referencia para ${currency}`, url };
  }

  if (!res.ok) {
    throw { kind: "upstream_error", message: `ECB respondió ${res.status}`, url };
  }

  const csv = await res.text();
  const rows = parseEcbCsv(csv);
  if (rows.length === 0) {
    // Divisa soportada por el BCE, pero sin ninguna publicación en la
    // ventana de búsqueda (fecha demasiado antigua/futura, o agujero de
    // datos). No hay valor fiable que devolver.
    throw {
      kind: "no_rate_found",
      message: `Sin publicación del BCE para ${currency} entre ${startPeriod} y ${date}`,
      url,
    };
  }

  const last = rows[rows.length - 1];
  return { rateDate: last.date, eurToForeign: last.value, url };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "method_not_allowed" }, 405);
  }

  // Autenticación con la ANON key, no service_role: esta función solo valida
  // el JWT del usuario (auth.getUser) y llama a la API pública del BCE — no
  // lee ni escribe ninguna tabla, así que no hay motivo para una clave que
  // salta RLS. La anon key basta para validar un token contra GoTrue.
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return jsonResponse({ error: "no_authorization_header" }, 401);
  }
  const token = authHeader.replace("Bearer ", "");
  const { data: userData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !userData.user) {
    return jsonResponse({ error: "invalid_token" }, 401);
  }

  let body: { currency?: unknown; date?: unknown };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "invalid_json_body" }, 400);
  }

  const currency = typeof body.currency === "string" ? body.currency.trim().toUpperCase() : "";
  const date = typeof body.date === "string" ? body.date.trim() : "";

  if (!CURRENCY_RE.test(currency)) {
    return jsonResponse(
      { error: "invalid_currency", message: "currency debe ser un código ISO 4217 de 3 letras, p.ej. USD" },
      400,
    );
  }
  if (!DATE_RE.test(date) || !isValidCalendarDate(date)) {
    return jsonResponse(
      { error: "invalid_date", message: "date debe tener formato YYYY-MM-DD" },
      400,
    );
  }

  // EUR no necesita conversión: identidad, sin llamar al BCE.
  if (currency === "EUR") {
    return jsonResponse(
      {
        currency: "EUR",
        requestedDate: date,
        rateDate: date,
        fellBack: false,
        rate: 1,
        inverseRate: 1,
        source: "identity",
      },
      200,
    );
  }

  try {
    const { rateDate, eurToForeign, url } = await fetchEcbRate(currency, date);
    const rate = 1 / eurToForeign; // EUR por 1 unidad de currency -> amount_eur = original_amount * rate

    return jsonResponse(
      {
        currency,
        requestedDate: date,
        rateDate,
        fellBack: rateDate !== date,
        rate,
        inverseRate: eurToForeign, // "1 EUR = eurToForeign {currency}", tal cual lo publica el BCE
        source: "ECB",
        sourceUrl: url,
      },
      200,
    );
  } catch (err) {
    const e = err as { kind?: string; message?: string; url?: string };
    const status = e.kind === "unsupported_currency" || e.kind === "no_rate_found" ? 404 : 502;
    console.error(`[exchange-rate] ${e.kind ?? "error"}: ${e.message}`);
    return jsonResponse(
      {
        error: e.kind ?? "unknown_error",
        message: e.message ?? "Error obteniendo el tipo de cambio del BCE",
      },
      status,
    );
  }
});
