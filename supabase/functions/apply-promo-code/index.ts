// Códigos promocionales retirados (11/10/2026). El Pro ya no se activa con
// códigos: se da a mano desde el panel de admin (función admin-set-pro).
//
// Esta función se mantiene desplegada solo para que cualquier llamada antigua
// reciba un rechazo claro en vez de activar Pro. Se puede borrar del panel de
// Supabase cuando se quiera; borrar esta carpeta del repo NO la quita de allí.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve((req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  return new Response(
    JSON.stringify({
      error: "Los códigos promocionales ya no están disponibles. Para seguir con Pro, escribe a soporte@crowdfolio.es.",
    }),
    { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
