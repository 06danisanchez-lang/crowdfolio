import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PlanType, isPro } from '@/lib/stripe/config';

const SUB_TIMEOUT_MS = 8_000;

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

  const refreshSubscription = useCallback(async () => {
    if (!session?.access_token) {
      setSubscription(defaultSubscription);
      setIsLoading(false);
      return;
    }

    let resolved = false;

    const timeoutId = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        console.warn('[Subscription] Check timeout after 8s - falling back to free plan');
        setSubscription(defaultSubscription);
        setIsLoading(false);
      }
    }, SUB_TIMEOUT_MS);

    try {
      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      clearTimeout(timeoutId);
      if (resolved) return; // timeout already fired
      resolved = true;

      if (error) {
        console.error('Error checking subscription:', error);
        setSubscription(defaultSubscription);
      } else if (data) {
        setSubscription({
          plan: data.plan || 'free',
          subscribed: data.subscribed || false,
          subscriptionEnd: data.subscription_end || null,
          productId: data.product_id || null,
        });
      }
    } catch (error) {
      clearTimeout(timeoutId);
      if (resolved) return;
      resolved = true;

      console.error('Error refreshing subscription:', error);
      setSubscription(defaultSubscription);
    } finally {
      if (resolved) {
        setIsLoading(false);
      }
    }
  }, [session?.access_token]);

  // Refresh on mount and when user/session changes
  useEffect(() => {
    if (user) {
      refreshSubscription();
    } else {
      setSubscription(defaultSubscription);
      setIsLoading(false);
    }
  }, [user, refreshSubscription]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(refreshSubscription, 60000);
    return () => clearInterval(interval);
  }, [user, refreshSubscription]);

  // Check URL params for subscription success
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const subscriptionStatus = params.get('subscription');
    
    if (subscriptionStatus === 'success') {
      setTimeout(refreshSubscription, 2000);
      window.history.replaceState({}, '', window.location.pathname);
    } else if (subscriptionStatus === 'cancelled') {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [refreshSubscription]);

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
