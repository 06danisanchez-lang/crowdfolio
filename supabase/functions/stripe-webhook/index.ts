import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const STRIPE_PRICES = {
  monthly: "price_1SwtR9QaxtKtYFASkIW4VGNl",
  yearly: "price_1SwsPQQaxtKtYFASptg5zqXs",
} as const;

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!stripeKey || !webhookSecret) {
    logStep("ERROR: missing env vars");
    return new Response("Server misconfigured", { status: 500 });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing stripe-signature header", { status: 400 });
  }

  const body = await req.text();
  let event: Stripe.Event;

  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    logStep("Signature verification failed", { error: String(err) });
    return new Response(`Webhook signature verification failed: ${err}`, { status: 400 });
  }

  logStep("Event received", { type: event.type, id: event.id });

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    const userId = session.metadata?.supabase_user_id || session.client_reference_id;
    if (!userId) {
      logStep("ERROR: no userId found in session");
      return new Response("No user ID in session", { status: 400 });
    }

    const stripeCustomerId = session.customer as string;
    const subscriptionId = session.subscription as string;

    if (!subscriptionId) {
      logStep("ERROR: no subscription ID in session");
      return new Response("No subscription in session", { status: 400 });
    }

    try {
      const sub = await stripe.subscriptions.retrieve(subscriptionId, {
        expand: ["items.data.price"],
      });

      const priceId = sub.items.data[0]?.price?.id;
      let plan: "free" | "monthly" | "yearly" = "free";
      if (priceId === STRIPE_PRICES.monthly) plan = "monthly";
      if (priceId === STRIPE_PRICES.yearly) plan = "yearly";

      logStep("Subscription retrieved", {
        subscriptionId,
        status: sub.status,
        priceId,
        plan,
        userId,
      });

      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        { auth: { persistSession: false } }
      );

      // Update profiles with stripe_customer_id
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .update({ stripe_customer_id: stripeCustomerId })
        .eq("id", userId);

      if (profileError) {
        logStep("ERROR updating profiles", profileError);
      }

      // Upsert subscriptions
      const { error: subError } = await supabaseAdmin
        .from("subscriptions")
        .upsert(
          {
            user_id: userId,
            stripe_customer_id: stripeCustomerId,
            stripe_subscription_id: subscriptionId,
            status: sub.status as "free" | "active" | "past_due" | "canceled",
            plan,
            current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );

      if (subError) {
        logStep("ERROR upserting subscription", subError);
        return new Response(JSON.stringify({ error: subError.message }), { status: 500 });
      }

      logStep("SUCCESS", { userId, plan, status: sub.status });
    } catch (err) {
      logStep("ERROR processing subscription", { error: String(err) });
      return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
