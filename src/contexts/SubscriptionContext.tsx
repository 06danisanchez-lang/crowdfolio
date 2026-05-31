/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PlanType, isPro } from '@/lib/stripe/config';

export interface SubscriptionState {
  plan: PlanType;
  subscribed: boolean;
  subscriptionEnd: string | null;
  productId: string | null;
}

interface SubscriptionContextType {
  subscription: SubscriptionState;
  isLoading: boolean;
  isPro: boolean;
  importCountThisMonth: number;
  refreshSubscription: () => Promise<void>;
  openCheckout: (plan: 'monthly' | 'yearly') => Promise<void>;
  openCustomerPortal: () => Promise<void>;
}

const defaultSubscription: SubscriptionState = {
  plan: 'free',
  subscribed: false,
  subscriptionEnd: null,
  productId: null,
};

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user, session } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionState>(defaultSubscription);
  const [isLoading, setIsLoading] = useState(true);
  const [importCountThisMonth, setImportCountThisMonth] = useState(0);

  const refreshSubscription = useCallback(async () => {
    if (!user?.id) {
      setSubscription(defaultSubscription);
      setImportCountThisMonth(0);
      setIsLoading(false);
      return;
    }

    try {
      const { data: sub, error } = await supabase
        .from('subscriptions')
        .select('plan, status, current_period_end, import_count_this_month, import_reset_date')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (!sub) {
        setSubscription(defaultSubscription);
        setImportCountThisMonth(0);
        return;
      }

      const nowIso = new Date().toISOString();
      const isActive =
        (sub.status === 'active' || sub.status === 'trialing') &&
        !!sub.current_period_end &&
        sub.current_period_end > nowIso;

      setSubscription({
        plan: isActive ? (sub.plan as PlanType) : 'free',
        subscribed: isActive,
        subscriptionEnd: sub.current_period_end ?? null,
        productId: null,
      });

      // Monthly reset check for import counter
      if (sub.import_count_this_month != null && sub.import_reset_date) {
        const resetDate = new Date(sub.import_reset_date);
        const now = new Date();
        const isSameMonth =
          resetDate.getFullYear() === now.getFullYear() &&
          resetDate.getMonth() === now.getMonth();
        setImportCountThisMonth(isSameMonth ? sub.import_count_this_month : 0);
      } else {
        setImportCountThisMonth(0);
      }
    } catch (err) {
      console.error('[Subscription] Error reading subscription from DB:', err);
      setSubscription(defaultSubscription);
      setImportCountThisMonth(0);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Refresh on mount and when user/session changes
  useEffect(() => {
    if (user) {
      refreshSubscription();
    } else {
      setSubscription(defaultSubscription);
      setImportCountThisMonth(0);
      setIsLoading(false);
    }
  }, [user, refreshSubscription]);

  // Auto-refresh every 5 minutes, but only when the tab is visible.
  // On tab focus, refreshes immediately if 5+ minutes have elapsed since the last call.
  useEffect(() => {
    if (!user) return;

    const INTERVAL_MS = 5 * 60 * 1000;
    let lastRefreshAt = Date.now();

    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible') {
        refreshSubscription();
        lastRefreshAt = Date.now();
      }
    }, INTERVAL_MS);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastRefreshAt >= INTERVAL_MS) {
        refreshSubscription();
        lastRefreshAt = Date.now();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, refreshSubscription]);

  // Check URL params for subscription success — aggressive retry
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const subscriptionStatus = params.get('subscription');

    if (subscriptionStatus === 'success') {
      window.history.replaceState({}, '', window.location.pathname);
      const delays = [1000, 3000, 7000, 15000];
      let attempt = 0;
      let cancelled = false;
      let timeoutId: number | null = null;

      const scheduleNext = () => {
        if (cancelled) return;
        if (subscription?.subscribed) return;
        if (attempt >= delays.length) return;
        const delay = delays[attempt];
        attempt++;
        timeoutId = window.setTimeout(async () => {
          if (cancelled) return;
          await refreshSubscription();
          scheduleNext();
        }, delay);
      };

      scheduleNext();
      return () => {
        cancelled = true;
        if (timeoutId) window.clearTimeout(timeoutId);
      };
    }

    if (subscriptionStatus === 'cancelled') {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [refreshSubscription, subscription?.subscribed]);

  // Handle pending checkout after login
  useEffect(() => {
    if (user && session?.access_token) {
      const pendingPlan = sessionStorage.getItem('pending_checkout_plan');
      if (pendingPlan && ['monthly', 'yearly'].includes(pendingPlan)) {
        sessionStorage.removeItem('pending_checkout_plan');
        setTimeout(() => {
          openCheckout(pendingPlan as 'monthly' | 'yearly').catch(console.error);
        }, 1500);
      }
    }
  // openCheckout is defined after this effect — omitting to avoid loop
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, session?.access_token]);

  const openCheckout = async (plan: 'monthly' | 'yearly') => {
    if (!session?.access_token) throw new Error('User not authenticated');

    const { data, error } = await supabase.functions.invoke('create-checkout', {
      body: { plan },
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (error) throw new Error(error.message || 'Error creating checkout session');

    if (data?.url) {
      const popup = window.open(data.url, '_blank');
      if (!popup || popup.closed || typeof popup.closed === 'undefined') {
        window.location.href = data.url;
      }
    } else {
      throw new Error('No checkout URL returned');
    }
  };

  const openCustomerPortal = async () => {
    if (!session?.access_token) throw new Error('User not authenticated');

    const { data, error } = await supabase.functions.invoke('customer-portal', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (error) throw new Error(error.message || 'Error opening customer portal');

    if (data?.url) {
      const popup = window.open(data.url, '_blank');
      if (!popup || popup.closed || typeof popup.closed === 'undefined') {
        window.location.href = data.url;
      }
    } else {
      throw new Error('No portal URL returned');
    }
  };

  return (
    <SubscriptionContext.Provider
      value={{
        subscription,
        isLoading,
        isPro: isPro(subscription.plan),
        importCountThisMonth,
        refreshSubscription,
        openCheckout,
        openCustomerPortal,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}
