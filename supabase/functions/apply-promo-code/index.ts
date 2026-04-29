import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Valid promo codes and their benefits
const PROMO_CODES: Record<string, { durationDays: number; plan: 'yearly' | 'monthly' }> = {
  'CROWDFOUNDER': { durationDays: 365, plan: 'yearly' },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    // Get authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header provided");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !userData.user) {
      throw new Error("User not authenticated");
    }

    const user = userData.user;
    const { code } = await req.json();

    if (!code || typeof code !== 'string') {
      throw new Error("Código promocional requerido");
    }

    const normalizedCode = code.toUpperCase().trim();

    // Check if code is valid
    const promoConfig = PROMO_CODES[normalizedCode];
    if (!promoConfig) {
      return new Response(
        JSON.stringify({ error: "Código promocional inválido" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Check if user already used this code
    const { data: existingUsage, error: usageError } = await supabaseClient
      .from('used_promo_codes')
      .select('id')
      .eq('user_id', user.id)
      .eq('promo_code', normalizedCode)
      .maybeSingle();

    if (usageError) {
      throw new Error("Error checking promo code usage");
    }

    if (existingUsage) {
      return new Response(
        JSON.stringify({ error: "Ya has utilizado este código promocional" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Check if user is already Pro (with Stripe subscription)
    const { data: subscription, error: subCheckError } = await supabaseClient
      .from('subscriptions')
      .select('stripe_subscription_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (subCheckError) {
      throw new Error("Error checking subscription status");
    }

    if (subscription?.stripe_subscription_id) {
      return new Response(
        JSON.stringify({ error: "Ya tienes una suscripción activa de pago" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Calculate expiration date
    const now = new Date();
    const expiresAt = new Date(now.getTime() + promoConfig.durationDays * 24 * 60 * 60 * 1000);

    // Record the promo code usage
    const { error: insertError } = await supabaseClient
      .from('used_promo_codes')
      .insert({
        user_id: user.id,
        promo_code: normalizedCode,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      throw new Error("Error recording promo code usage");
    }

    // Upsert subscription to Pro (creates the row if the user never went through checkout)
    const { error: upsertError } = await supabaseClient
      .from('subscriptions')
      .upsert({
        user_id: user.id,
        status: 'active',
        plan: promoConfig.plan,
        current_period_start: now.toISOString(),
        current_period_end: expiresAt.toISOString(),
        updated_at: now.toISOString(),
      }, { onConflict: 'user_id' });

    if (upsertError) {
      throw new Error("Error updating subscription");
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "¡Código aplicado con éxito! Disfruta de Crowdfolio Pro durante 1 año.",
        expiresAt: expiresAt.toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
