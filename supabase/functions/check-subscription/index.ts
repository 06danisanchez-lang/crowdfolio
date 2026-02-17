import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

// Price IDs from Stripe (more reliable than product IDs)
const STRIPE_PRICES = {
  monthly: 'price_1SwtR9QaxtKtYFASkIW4VGNl',
  yearly: 'price_1SwsPQQaxtKtYFASptg5zqXs',
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
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified", { keyPrefix: stripeKey.substring(0, 7) });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    logStep("Authenticating user with token");
    
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No customer found, returning free status");
      return new Response(JSON.stringify({ 
        subscribed: false,
        plan: 'free',
        product_id: null,
        subscription_end: null
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    const nowSec = Math.floor(Date.now() / 1000);

    const subsRes = await stripe.subscriptions.list({
      customer: customerId,
      limit: 10,
    });

    const validSubs = (subsRes.data || [])
      .filter((s) => s && (s.status === "active" || s.status === "trialing"))
      .filter((s) => typeof s.current_period_end === "number" && s.current_period_end > nowSec)
      .sort((a, b) => (b.current_period_end ?? 0) - (a.current_period_end ?? 0));

    const activeSub = validSubs[0];
    const hasActiveSub = !!activeSub;
    let productId: string | null = null;
    let subscriptionEnd: string | null = null;
    let plan: 'free' | 'monthly' | 'yearly' = 'free';

    if (hasActiveSub) {
      subscriptionEnd = new Date(activeSub.current_period_end * 1000).toISOString();
      logStep("Valid subscription found", {
        subscriptionId: activeSub.id,
        status: activeSub.status,
        endDate: subscriptionEnd,
        cancel_at_period_end: activeSub.cancel_at_period_end,
      });

      const firstItem = activeSub.items?.data?.[0];
      const price = firstItem?.price;
      const priceId = price?.id ?? null;
      const product = price?.product ?? null;
      productId = typeof product === "string" ? product : null;

      if (priceId && priceId === STRIPE_PRICES.monthly) {
        plan = 'monthly';
      } else if (priceId && priceId === STRIPE_PRICES.yearly) {
        plan = 'yearly';
      }
      logStep("Determined subscription plan", { priceId, productId, plan });
    } else {
      logStep("No valid subscription found", { totalFetched: subsRes.data.length });
    }

    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      plan,
      product_id: productId,
      subscription_end: subscriptionEnd
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-subscription", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
