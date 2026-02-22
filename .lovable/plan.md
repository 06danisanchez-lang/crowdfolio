

# Create `stripe-webhook` Edge Function

## New File: `supabase/functions/stripe-webhook/index.ts`

Edge function that:

1. Accepts only POST, returns 405 otherwise
2. Reads raw body with `await req.text()`
3. Verifies Stripe signature using `stripe-signature` header and `STRIPE_WEBHOOK_SECRET`
4. On `checkout.session.completed`:
   - Extracts `userId` from `session.metadata.supabase_user_id` or `session.client_reference_id`
   - Extracts `stripe_customer_id` from `session.customer`
   - Retrieves full subscription via `stripe.subscriptions.retrieve(subscriptionId, { expand: ["items.data.price"] })`
   - Uses `sub.status` (not hardcoded "active")
   - Maps price ID to plan: `monthly` if matches `price_1SwtR9QaxtKtYFASkIW4VGNl`, `yearly` if matches `price_1SwsPQQaxtKtYFASptg5zqXs`, defaults to `free`
5. Updates `profiles` table with `stripe_customer_id`
6. Upserts `subscriptions` table with `user_id`, `stripe_customer_id`, `stripe_subscription_id`, `status`, `plan`
7. Returns 200/400/500 appropriately

## Modified File: `supabase/config.toml`

Add entry:
```
[functions.stripe-webhook]
verify_jwt = false
```

No other files are modified.

