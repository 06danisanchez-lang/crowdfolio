import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature",
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

function jsonResponse(body: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...extraHeaders },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) {
    logStep("ERROR missing STRIPE_SECRET_KEY");
    return jsonResponse({ error: "STRIPE_SECRET_KEY is not set" }, 500);
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

  // ---------
  // 1) WEBHOOK PATH (Stripe -> this function)
  // ---------
  const stripeSig = req.headers.get("stripe-signature");
  if (stripeSig) {
    try {
      logStep("Webhook received", { hasSignature: true });

      const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
      if (!webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");

      // RAW body required for signature verification
      const rawBody = await req.text();

      let event: Stripe.Event;
      try {
        event = stripe.webhooks.constructEvent(rawBody, stripeSig, webhookSecret);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        logStep("Webhook signature verification failed", { msg });
        return new Response("Invalid signature", { status: 400 });
      }

      logStep("Webhook verified", { type: event.type, id: event.id });

      // Use service role for DB writes (recommended)
      const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
      const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

      const dbKey = serviceRole || anonKey;
      if (!dbKey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY (preferred) and SUPABASE_ANON_KEY");

      if (!serviceRole) {
        logStep("WARNING: SUPABASE_SERVICE_ROLE_KEY not set. DB updates may fail due to RLS.");
      }

      const supabaseAdmin = createClient(supabaseUrl, dbKey);

      // Helper: map price id -> monthly/yearly
      const mapPriceToPlan = (priceId?: string | null): Plan | null => {
        if (!priceId) return null;
        if (priceId === STRIPE_PRICES.monthly) return "monthly";
        if (priceId === STRIPE_PRICES.yearly) return "yearly";
        return null;
      };

      // We want to capture: user_id, customerId, subscriptionId, status, plan
      // Best source: checkout.session.completed (because you set metadata.user_id)
      if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;

        const userId =
          (session.metadata && (session.metadata as Record<string, string>).user_id) ||
          (session.client_reference_id ?? null);

        const customerId =
          typeof session.customer === "string" ? session.customer : session.customer?.id;

        const subscriptionId =
          typeof session.subscription === "string" ? session.subscription : null;

        logStep("checkout.session.completed parsed", {
          userId,
          customerId,
          subscriptionId,
        });

        if (!userId) throw new Error("Webhook: missing user_id in session.metadata");
        if (!customerId) throw new Error("Webhook: missing customer in session");
        if (!subscriptionId) throw new Error("Webhook: missing subscription in session");

        // Fetch subscription to get status/price/current_period_end
        const sub = await stripe.subscriptions.retrieve(subscriptionId, { expand: ["items.data.price"] });

        const status = sub.status; // active, trialing, past_due, canceled, etc.
        const priceId = sub.items?.data?.[0]?.price?.id ?? null;
        const plan = mapPriceToPlan(priceId) ?? null;

        const subscriptionEnd =
          typeof sub.current_period_end === "number" ? new Date(sub.current_period_end * 1000).toISOString() : null;

        // Update profiles.stripe_customer_id
        const { error: profErr } = await supabaseAdmin
          .from("profiles")
          .update({ stripe_customer_id: customerId })
          .eq("id", userId);

        if (profErr) {
          logStep("DB ERROR updating profiles", { message: profErr.message });
          throw new Error(`DB: profiles update failed - ${profErr.message}`);
        }

        // Upsert subscriptions row
        // Assumptions: subscriptions has user_id (PK or unique), stripe_customer_id, stripe_subscription_id, status, plan
        const upsertPayload: Record<string, unknown> = {
          user_id: userId,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          status,          // e.g. active/trialing
          plan: "pro",     // your app-level plan
        };

        // Optional fields if your table has them (won't break if not present? Supabase will error if column doesn't exist)
        // If you DO have these columns, uncomment:
        // upsertPayload.subscription_end = subscriptionEnd;
        // upsertPayload.billing_interval = plan; // monthly/yearly

        const { error: subErr } = await supabaseAdmin
          .from("subscriptions")
          .upsert(upsertPayload, { onConflict: "user_id" });

        if (subErr) {
          logStep("DB ERROR upserting subscriptions", { message: subErr.message });
          throw new Error(`DB: subscriptions upsert failed - ${subErr.message}`);
        }

        logStep("Webhook handled: Pro activated", { userId, status, plan, subscriptionEnd });

        return new Response("ok", { status: 200 });
      }

      // Handle subscription updates too (safety net)
      if (
        event.type === "customer.subscription.created" ||
        event.type === "customer.subscription.updated" ||
        event.type === "customer.subscription.deleted"
      ) {
        const sub = event.data.object as Stripe.Subscription;

        const subscriptionId = sub.id;
        const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
        const status = sub.status;

        // We might not have user_id here unless you store it in subscription metadata (optional).
        const userId =
          (sub.metadata && (sub.metadata as Record<string, string>).user_id) || null;

        logStep("subscription.* event parsed", { userId, customerId, subscriptionId, status });

        // If no userId, we can't link reliably. We still return 200 to avoid retries.
        if (!userId) return new Response("ok", { status: 200 });
        if (!customerId) return new Response("ok", { status: 200 });

        // Update profiles + subscriptions minimal
        const { error: profErr } = await supabaseAdmin
          .from("profiles")
          .update({ stripe_customer_id: customerId })
          .eq("id", userId);

        if (profErr) {
          logStep("DB ERROR updating profiles (subscription event)", { message: profErr.message });
          // still throw to notice; Stripe will retry
          throw new Error(`DB: profiles update failed - ${profErr.message}`);
        }

        const { error: subErr } = await supabaseAdmin
          .from("subscriptions")
          .upsert(
            {
              user_id: userId,
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId,
              status,
              plan: status === "active" || status === "trialing" ? "pro" : "free",
            },
            { onConflict: "user_id" },
          );

        if (subErr) {
          logStep("DB ERROR upserting subscriptions (subscription event)", { message: subErr.message });
          throw new Error(`DB: subscriptions upsert failed - ${subErr.message}`);
        }

        return new Response("ok", { status: 200 });
      }

      // Ignore other events (but return 200 so Stripe doesn't retry)
      logStep("Webhook ignored", { type: event.type });
      return new Response("ok", { status: 200 });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logStep("ERROR in webhook handler", { msg });
      return new Response("Webhook error", { status: 500 });
    }
  }

  // ---------
  // 2) NORMAL CHECKOUT PATH (Frontend -> this function)
  // ---------
  try {
    logStep("Function started (checkout path)");
    logStep("Stripe key verified", { keyPrefix: stripeKey.substring(0, 7) });

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const { plan } = await req.json();
    if (!plan || !["monthly", "yearly"].includes(plan)) {
      throw new Error("Invalid plan. Must be 'monthly' or 'yearly'");
    }
    logStep("Plan selected", { plan });

    const priceId = STRIPE_PRICES[plan as Plan];
    logStep("Price ID resolved", { priceId });

    // Check if customer already exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;

    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing customer found", { customerId });
    } else {
      logStep("No existing customer, will create during checkout");
    }

    const origin = req.headers.get("origin") || "https://lovable.dev";

const session = await stripe.checkout.sessions.create({
  customer: customerId,
  customer_email: customerId ? undefined : user.email,
  line_items: [{ price: priceId, quantity: 1 }],
  mode: "subscription",
  allow_promotion_codes: true,
  success_url: `${origin}/?subscription=success`,
  cancel_url: `${origin}/?subscription=cancelled`,
  client_reference_id: user.id,
  subscription_data: { metadata: { user_id: user.id } },
  metadata: { user_id: user.id },
});


    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return jsonResponse({ url: session.url }, 200);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in create-checkout (checkout path)", { message: errorMessage });
    return jsonResponse({ error: errorMessage }, 500);
  }
});

        // Upsert subscriptions row
        // Assumptions: subscriptions has user_id (PK or unique), stripe_customer_id, stripe_subscription_id, status, plan
        const upsertPayload: Record<string, unknown> = {
          user_id: userId,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          status, // e.g. active/trialing
          plan: "pro", // your app-level plan
        };

        // Optional fields if your table has them (won't break if not present? Supabase will error if column doesn't exist)
        // If you DO have these columns, uncomment:
        // upsertPayload.subscription_end = subscriptionEnd;
        // upsertPayload.billing_interval = plan; // monthly/yearly

        const { error: subErr } = await supabaseAdmin
          .from("subscriptions")
          .upsert(upsertPayload, { onConflict: "user_id" });

        if (subErr) {
          logStep("DB ERROR upserting subscriptions", { message: subErr.message });
          throw new Error(`DB: subscriptions upsert failed - ${subErr.message}`);
        }

        logStep("Webhook handled: Pro activated", { userId, status, plan, subscriptionEnd });

        return new Response("ok", { status: 200 });
      }

      // Handle subscription updates too (safety net)
      if (
        event.type === "customer.subscription.created" ||
        event.type === "customer.subscription.updated" ||
        event.type === "customer.subscription.deleted"
      ) {
        const sub = event.data.object as Stripe.Subscription;

        const subscriptionId = sub.id;
        const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
        const status = sub.status;

        // We might not have user_id here unless you store it in subscription metadata (optional).
        const userId = (sub.metadata && (sub.metadata as Record<string, string>).user_id) || null;

        logStep("subscription.* event parsed", { userId, customerId, subscriptionId, status });

        // If no userId, we can't link reliably. We still return 200 to avoid retries.
        if (!userId) return new Response("ok", { status: 200 });
        if (!customerId) return new Response("ok", { status: 200 });

        // Update profiles + subscriptions minimal
        const { error: profErr } = await supabaseAdmin
          .from("profiles")
          .update({ stripe_customer_id: customerId })
          .eq("id", userId);

        if (profErr) {
          logStep("DB ERROR updating profiles (subscription event)", { message: profErr.message });
          // still throw to notice; Stripe will retry
          throw new Error(`DB: profiles update failed - ${profErr.message}`);
        }

        const { error: subErr } = await supabaseAdmin.from("subscriptions").upsert(
          {
            user_id: userId,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            status,
            plan: status === "active" || status === "trialing" ? "pro" : "free",
          },
          { onConflict: "user_id" },
        );

        if (subErr) {
          logStep("DB ERROR upserting subscriptions (subscription event)", { message: subErr.message });
          throw new Error(`DB: subscriptions upsert failed - ${subErr.message}`);
        }

        return new Response("ok", { status: 200 });
      }

      // Ignore other events (but return 200 so Stripe doesn't retry)
      logStep("Webhook ignored", { type: event.type });
      return new Response("ok", { status: 200 });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logStep("ERROR in webhook handler", { msg });
      return new Response("Webhook error", { status: 500 });
    }
  }

  // ---------
  // 2) NORMAL CHECKOUT PATH (Frontend -> this function)
  // ---------
  try {
    logStep("Function started (checkout path)");
    logStep("Stripe key verified", { keyPrefix: stripeKey.substring(0, 7) });

    const supabaseClient = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const { plan } = await req.json();
    if (!plan || !["monthly", "yearly"].includes(plan)) {
      throw new Error("Invalid plan. Must be 'monthly' or 'yearly'");
    }
    logStep("Plan selected", { plan });

    const priceId = STRIPE_PRICES[plan as Plan];
    logStep("Price ID resolved", { priceId });

    // Check if customer already exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;

    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing customer found", { customerId });
    } else {
      logStep("No existing customer, will create during checkout");
    }

    const origin = req.headers.get("origin") || "https://lovable.dev";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      allow_promotion_codes: true,
      success_url: `${origin}/?subscription=success`,
      cancel_url: `${origin}/?subscription=cancelled`,
      metadata: {
        user_id: user.id,
      },
    });

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return jsonResponse({ url: session.url }, 200);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in create-checkout (checkout path)", { message: errorMessage });
    return jsonResponse({ error: errorMessage }, 500);
  }
});
