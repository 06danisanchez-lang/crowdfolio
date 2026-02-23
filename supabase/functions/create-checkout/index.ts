import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

// Production Price IDs
const STRIPE_PRICES = {
  monthly: "price_1SwtR9QaxtKtYFASkIW4VGNl",
  yearly: "price_1SwsPQQaxtKtYFASptg5zqXs",
} as const;

type Plan = keyof typeof STRIPE_PRICES;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      logStep("ERROR missing STRIPE_SECRET_KEY");
      return jsonResponse({ error: "STRIPE_SECRET_KEY is not set" }, 500);
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);

    const user = userData.user;
    if (!user?.id || !user?.email) throw new Error("User not authenticated or email not available");

    // Leemos body UNA vez
    const rawBody = await req.text();
    const parsed = rawBody ? JSON.parse(rawBody) : {};
    const plan = parsed?.plan as Plan;

    if (!plan || !["monthly", "yearly"].includes(plan)) {
      throw new Error("Invalid plan. Must be 'monthly' or 'yearly'");
    }

    const priceId = STRIPE_PRICES[plan];
    const origin = req.headers.get("origin") || "https://lovable.dev";

    // Leer stripe_customer_id guardado (RLS: solo el propio usuario)
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    const customerId = profile?.stripe_customer_id || undefined;
    logStep("Customer lookup", { customerId: customerId || "none - Stripe will create new" });

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,

      ...(customerId
        ? { customer: customerId }
        : { customer_email: user.email }),

      success_url: `${origin}/?subscription=success`,
      cancel_url: `${origin}/?subscription=cancelled`,

      // ✅ CLAVE: “pegamos” el usuario a Stripe
      client_reference_id: user.id,
      metadata: { supabase_user_id: user.id },
      subscription_data: { metadata: { supabase_user_id: user.id } },
    });

    logStep("Checkout session created", { sessionId: session.id, url: session.url, userId: user.id, plan });

    return jsonResponse({ url: session.url }, 200);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { msg });
    return jsonResponse({ error: msg }, 500);
  }
});
