

# Fix: Crowdfolio no reconoce usuarios Pro (Stripe)

## Problem

1. Edge function `check-subscription` queries Stripe with `status: "active", limit: 1` -- misses `trialing` subs, can pick stale ones
2. Frontend retries only once after 2s post-checkout -- often too early

## Files Modified (2 only, no new files)

### 1. `supabase/functions/check-subscription/index.ts`

**Replace lines 71-99** with the new subscription validation block:

- `limit: 10` without status filter
- Manual filter for `active` OR `trialing`
- Validate `current_period_end > nowSec`
- Sort by `current_period_end` desc, pick first
- Safe access to `items.data[0].price` with optional chaining
- Response JSON shape unchanged: `subscribed`, `plan`, `product_id`, `subscription_end`

### 2. `src/contexts/SubscriptionContext.tsx`

**Replace lines 107-118** (the `?subscription=success` useEffect) with aggressive retry loop:

- Retries at 1s, 3s, 7s, 15s
- Stops early if `subscription.subscribed` becomes true
- Cleans URL params immediately
- Cleans up timers on unmount
- Adds `subscription?.subscribed` to dependency array

## Acceptance Criteria

- `trialing` subscriptions recognized as Pro
- Expired subscriptions (past `current_period_end`) rejected
- Multiple subscriptions: most recent valid one wins
- Post-checkout: app updates without reload via staggered retries

