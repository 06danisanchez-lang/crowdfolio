
# Stripe auto-curativo: fallback siempre si no hay sub valida

## Resumen

2 archivos modificados, 0 nuevos. Unico cambio respecto al plan anterior: en `check-subscription`, el fallback por email se ejecuta siempre que `!activeSub`, no solo cuando `!customerId`.

---

## Archivo 1: `supabase/functions/create-checkout/index.ts`

**Cambios (lineas 44-78):**

1. Cliente Supabase con ANON_KEY + Authorization header del usuario (RLS)
2. Leer `profiles.stripe_customer_id` en vez de `stripe.customers.list`
3. Si existe customerId: `customer: customerId`. Si no: `customer_email: user.email`

```diff
-  const supabaseClient = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "");
+  const supabaseClient = createClient(
+    Deno.env.get("SUPABASE_URL") ?? "",
+    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
+    { global: { headers: { Authorization: authHeader } } }
+  );

     // ... auth getUser sin cambios ...

-    // Reutiliza customer si existe
-    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
-    const customerId = customers.data[0]?.id;
+    // Leer stripe_customer_id guardado (RLS: solo el propio usuario)
+    const { data: profile } = await supabaseClient
+      .from("profiles")
+      .select("stripe_customer_id")
+      .eq("id", user.id)
+      .single();
+
+    const customerId = profile?.stripe_customer_id || undefined;
+    logStep("Customer lookup", { customerId: customerId || "none - Stripe will create new" });

     const session = await stripe.checkout.sessions.create({
       mode: "subscription",
       line_items: [{ price: priceId, quantity: 1 }],
       allow_promotion_codes: true,

-      customer: customerId,
-      customer_email: customerId ? undefined : user.email,
+      ...(customerId
+        ? { customer: customerId }
+        : { customer_email: user.email }),

       // resto identico
     });
```

---

## Archivo 2: `supabase/functions/check-subscription/index.ts`

**Cambios (lineas 52-112):** Reescribir toda la seccion de customer lookup + sub validation.

```diff
     const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
-    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
-
-    if (customers.data.length === 0) {
-      logStep("No customer found, returning free status");
-      return new Response(JSON.stringify({
-        subscribed: false, plan: 'free', product_id: null, subscription_end: null
-      }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
-    }
-
-    const customerId = customers.data[0].id;
-    logStep("Found Stripe customer", { customerId });
-
-    const nowSec = Math.floor(Date.now() / 1000);
-
-    const subsRes = await stripe.subscriptions.list({ customer: customerId, limit: 10 });
-
-    const validSubs = (subsRes.data || [])
-      .filter((s) => s && (s.status === "active" || s.status === "trialing"))
-      .filter((s) => typeof s.current_period_end === "number" && s.current_period_end > nowSec)
-      .sort((a, b) => (b.current_period_end ?? 0) - (a.current_period_end ?? 0));
-
-    const activeSub = validSubs[0];
-    const hasActiveSub = !!activeSub;
-    let productId: string | null = null;
-    let subscriptionEnd: string | null = null;
-    let plan: 'free' | 'monthly' | 'yearly' = 'free';
-
-    if (hasActiveSub) {
+    const nowSec = Math.floor(Date.now() / 1000);
+
+    // Helper: find valid sub for a customer
+    const findValidSub = async (custId: string) => {
+      const subsRes = await stripe.subscriptions.list({ customer: custId, limit: 10 });
+      return (subsRes.data || [])
+        .filter((s) => s && (s.status === "active" || s.status === "trialing"))
+        .filter((s) => typeof s.current_period_end === "number" && s.current_period_end > nowSec)
+        .sort((a, b) => (b.current_period_end ?? 0) - (a.current_period_end ?? 0))[0] || null;
+    };
+
+    // 1. Read stored stripe_customer_id
+    const { data: profile } = await supabaseClient
+      .from("profiles")
+      .select("stripe_customer_id")
+      .eq("id", user.id)
+      .single();
+
+    let customerId: string | null = profile?.stripe_customer_id || null;
+    let activeSub: any = null;
+
+    // 2. Primary path: stored customerId
+    if (customerId) {
+      logStep("Using stored stripe_customer_id", { customerId });
+      activeSub = await findValidSub(customerId);
+    }
+
+    // 3. Fallback: SIEMPRE si no hay sub valida (incluso con customerId stale)
+    if (!activeSub) {
+      logStep("No valid sub via stored customerId, falling back to email search");
+      const customers = await stripe.customers.list({ email: user.email, limit: 10 });
+      for (const cust of customers.data) {
+        if (cust.id === customerId) continue; // ya comprobado
+        const sub = await findValidSub(cust.id);
+        if (sub) {
+          activeSub = sub;
+          customerId = cust.id;
+          await supabaseClient
+            .from("profiles")
+            .update({ stripe_customer_id: cust.id })
+            .eq("id", user.id);
+          logStep("Auto-healed stripe_customer_id", { customerId: cust.id });
+          break;
+        }
+      }
+    }
+
+    if (!activeSub) {
+      logStep("No valid subscription found after all checks");
+      return new Response(JSON.stringify({
+        subscribed: false, plan: 'free', product_id: null, subscription_end: null
+      }), {
+        headers: { ...corsHeaders, "Content-Type": "application/json" },
+        status: 200,
+      });
+    }
+
+    let productId: string | null = null;
+    let subscriptionEnd: string | null = null;
+    let plan: 'free' | 'monthly' | 'yearly' = 'free';
+
+    {
       subscriptionEnd = new Date(activeSub.current_period_end * 1000).toISOString();
       // ... plan mapping identico ...
-    } else {
-      logStep("No valid subscription found", { totalFetched: subsRes.data.length });
     }

     return new Response(JSON.stringify({
-      subscribed: hasActiveSub,
+      subscribed: true,
       plan,
       product_id: productId,
       subscription_end: subscriptionEnd
     }), { ... });
```

Nota clave: `if (cust.id === customerId) continue;` evita repetir la consulta al customer que ya se comprobo en el paso 2.

---

## Cambio critico vs plan anterior

| Condicion fallback | Antes | Ahora |
|---|---|---|
| `!activeSub && !customerId` | Solo si no habia ID guardado | -- |
| `!activeSub` | -- | Siempre que no haya sub valida (auto-cura IDs stale) |

## Archivos tocados

| Archivo | Cambio |
|---------|--------|
| `supabase/functions/create-checkout/index.ts` | ANON+JWT, leer profiles, no email search |
| `supabase/functions/check-subscription/index.ts` | Stored ID primero, fallback email siempre si !activeSub, auto-heal |

Total: **2 archivos, 0 nuevos**.
