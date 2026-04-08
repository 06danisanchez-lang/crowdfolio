import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Crown, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { STRIPE_PRICES, formatPrice } from '@/lib/stripe/config';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export function PricingTable() {
  const { subscription, isPro, openCheckout, openCustomerPortal } = useSubscription();
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState<'monthly' | 'yearly' | 'portal' | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('yearly');

  // Declared inside component so they react to language changes
  const freeFeatures = [
    t('subscription.free.f1'),
    t('subscription.free.f2'),
    t('subscription.free.f3'),
    t('subscription.free.f4'),
    t('subscription.free.f5'),
  ];

  const proFeatures = [
    t('subscription.pro.f1'),
    t('subscription.pro.f2'),
    t('subscription.pro.f3'),
    t('subscription.pro.f4'),
    t('subscription.pro.f5'),
    t('subscription.pro.f6'),
  ];

  const handleCheckout = async (plan: 'monthly' | 'yearly') => {
    if (!user) {
      sessionStorage.setItem('pending_checkout_plan', plan);
      navigate(`/auth?checkout=${plan}`);
      return;
    }
    setIsLoading(plan);
    try {
      await openCheckout(plan);
    } catch (error) {
      console.error('Checkout error:', error);
      toast({
        title: 'Error',
        description: 'No se pudo iniciar el proceso de pago. Inténtalo de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(null);
    }
  };

  const handleManageSubscription = async () => {
    setIsLoading('portal');
    try {
      await openCustomerPortal();
    } catch (error) {
      console.error('Portal error:', error);
      toast({
        title: 'Error',
        description: 'No se pudo abrir el portal de facturación.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Billing Toggle */}
      <div className="flex justify-center">
        <div className="inline-flex rounded-lg border p-1">
          <button
            onClick={() => setBillingPeriod('monthly')}
            className={cn(
              "rounded-md px-4 py-2 text-sm font-medium transition-colors",
              billingPeriod === 'monthly'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {t('subscription.monthly')}
          </button>
          <button
            onClick={() => setBillingPeriod('yearly')}
            className={cn(
              "rounded-md px-4 py-2 text-sm font-medium transition-colors",
              billingPeriod === 'yearly'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {t('subscription.yearly')}
            <Badge variant="secondary" className="ml-1.5">-17%</Badge>
          </button>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="grid gap-6 md:grid-cols-2 max-w-4xl mx-auto">
        {/* Free Plan */}
        <Card className={cn(!isPro && 'border-primary ring-1 ring-primary')}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Free</CardTitle>
              {!isPro && <Badge>{t('subscription.billing.freePlan')}</Badge>}
            </div>
            <CardDescription>
              {t('subscription.free.f1')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold">0€</span>
              <span className="text-muted-foreground">/{t('subscription.perMonth')}</span>
            </div>

            <ul className="space-y-3">
              {freeFeatures.map((feature) => (
                <li key={feature} className="flex items-center gap-2">
                  <Check className="h-5 w-5 shrink-0 text-primary" />
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>

            {!isPro && (
              <Button variant="outline" className="w-full" disabled>
                {t('subscription.billing.freePlan')}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Pro Plan */}
        <Card className={cn(
          'relative overflow-hidden',
          isPro && 'border-primary ring-1 ring-primary'
        )}>
          {!isPro && (
            <div className="absolute right-0 top-0">
              <Badge className="rounded-none rounded-bl-lg">
                <Sparkles className="mr-1 h-3 w-3" />
                Recomendado
              </Badge>
            </div>
          )}
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-primary" />
                <CardTitle>Pro</CardTitle>
              </div>
              {isPro && <Badge>{t('subscription.yourPro')}</Badge>}
            </div>
            <CardDescription>{t('subscription.pro.f5')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold">
                {formatPrice(STRIPE_PRICES[billingPeriod].amount)}
              </span>
              <span className="text-muted-foreground">
                /{billingPeriod === 'monthly' ? t('subscription.perMonth') : t('subscription.perYear')}
              </span>
            </div>
            {billingPeriod === 'yearly' && (
              <p className="text-sm text-primary">
                <Sparkles className="mr-1 inline h-3 w-3" />
                {STRIPE_PRICES.yearly.savings}
              </p>
            )}
            <p className="text-xs text-muted-foreground">{t('subscription.noCommitment')}</p>

            <ul className="space-y-3">
              {proFeatures.map((feature) => (
                <li key={feature} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>

            {isPro ? (
              <Button
                variant="outline"
                className="w-full"
                onClick={handleManageSubscription}
                disabled={isLoading === 'portal'}
              >
                {isLoading === 'portal' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('subscription.billing.manage')}
              </Button>
            ) : (
              <Button
                className="w-full"
                onClick={() => handleCheckout(billingPeriod)}
                disabled={isLoading !== null}
              >
                {isLoading === billingPeriod ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Crown className="mr-2 h-4 w-4" />
                )}
                {t('subscription.cta.default')}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Subscription Info */}
      {isPro && subscription.subscriptionEnd && (
        <p className="text-center text-sm text-muted-foreground">
          {t('subscription.billing.renewsOn')}{' '}
          {new Date(subscription.subscriptionEnd).toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </p>
      )}
    </div>
  );
}
