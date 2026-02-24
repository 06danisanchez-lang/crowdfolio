import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

// Price IDs from Stripe (more reliable than product IDs)
const STRIPE_PRICES = {
  monthly: "price_1SwtR9QaxtKtYFASkIW4VGNl",
  yearly: "price_1SwsPQQaxtKtYFASptg5zqXs",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  try {
    logStep("Function started");

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

    // ---------------------------------------------------------------------
    // 0) SOURCE OF TRUTH: Database (subscriptions table)
    // ---------------------------------------------------------------------
    const nowIso = new Date().toISOString();

    const { data: dbSub, error: dbSubError } = await supabaseClient
      .from("subscriptions")
      .select("status, plan, current_period_end, stripe_customer_id, stripe_subscription_id")
      .eq("user_id", user.id)
      .in("status", ["active", "trialing"])
      .gt("current_period_end", nowIso)
      .order("current_period_end", { ascending: false })
      .maybeSingle();

    if (dbSubError) {
      logStep("DB subscription check error", { message: dbSubError.message });
      // continue to Stripe fallback below
    } else if (dbSub) {
      logStep("DB subscription found (source of truth)", {
        status: dbSub.status,
        plan: dbSub.plan,
        end: dbSub.current_period_end,
        stripe_subscription_id: dbSub.stripe_subscription_id,
      });

      // Normalize plan to the values your frontend expects
      let plan: "free" | "monthly" | "yearly" = "yearly";
      if (dbSub.plan === "monthly") plan = "monthly";
      else if (dbSub.plan === "yearly") plan = "yearly";

      return new Response(
        JSON.stringify({
          subscribed: true,
          plan,
          product_id: null,
          subscription_end: dbSub.current_period_end ?? null,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    }

    // ---------------------------------------------------------------------
    // 1) STRIPE FALLBACK (only if DB is empty/invalid)
    // ---------------------------------------------------------------------
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified", { keyPrefix: stripeKey.substring(0, 7) });

    // Use a stable API version string (avoid ".basil")
    const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });
    const nowSec = Math.floor(Date.now() / 1000);

    // Helper: find valid sub for a customer
    const findValidSub = async (custId: string) => {
      const subsRes = await stripe.subscriptions.list({ customer: custId, limit: 10 });
      return (
        (subsRes.data || [])
          .filter((s) => s && (s.status === "active" || s.status === "trialing"))
          .filter((s) => typeof s.current_period_end === "number" && s.current_period_end > nowSec)
          .sort((a, b) => (b.current_period_end ?? 0) - (a.current_period_end ?? 0))[0] || null
      );
    };

    // 1. Read stored stripe_customer_id
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .maybeSingle();

    let customerId: string | null = profile?.stripe_customer_id || null;
    let activeSub: any = null;

    // 2. Primary path: stored customerId
    if (customerId) {
      logStep("Using stored stripe_customer_id", { customerId });
      activeSub = await findValidSub(customerId);
    }

    // 3. Fallback: ALWAYS if no valid sub (even with stale customerId)
    if (!activeSub) {
      logStep("No valid sub via stored customerId, falling back to email search");
      const customers = await stripe.customers.list({ email: user.email, limit: 10 });
      for (const cust of customers.data) {
        if (cust.id === customerId) continue; // already checked
        const sub = await findValidSub(cust.id);
        if (sub) {
          activeSub = sub;
          customerId = cust.id;
          await supabaseClient.from("profiles").update({ stripe_customer_id: cust.id }).eq("id", user.id);
          logStep("Auto-healed stripe_customer_id", { customerId: cust.id });
          break;
        }
      }
    }

    if (!activeSub) {
      logStep("No valid subscription found after all checks");
      return new Response(
        JSON.stringify({
          subscribed: false,
          plan: "free",
          product_id: null,
          subscription_end: null,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    }

    let productId: string | null = null;
    let subscriptionEnd: string | null = null;
    let plan: "free" | "monthly" | "yearly" = "free";

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
      plan = "monthly";
    } else if (priceId && priceId === STRIPE_PRICES.yearly) {
      plan = "yearly";
    }
    logStep("Determined subscription plan", { priceId, productId, plan });

    return new Response(
      JSON.stringify({
        subscribed: true,
        plan,
        product_id: productId,
        subscription_end: subscriptionEnd,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-subscription", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
