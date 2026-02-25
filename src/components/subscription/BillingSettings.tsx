import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Crown, Loader2, CreditCard, Calendar, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { STRIPE_PRICES, formatPrice } from '@/lib/stripe/config';
import { toast } from '@/hooks/use-toast';
import { PromoCodeInput } from './PromoCodeInput';

export function BillingSettings() {
  const { t } = useLanguage();
  const { subscription, isPro, openCheckout, openCustomerPortal, refreshSubscription, isLoading } = useSubscription();
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  const handleCheckout = async (plan: 'monthly' | 'yearly') => {
    setIsProcessing(plan);
    try {
      await openCheckout(plan);
    } catch (error) {
      console.error('Checkout error:', error);
      toast({
        title: 'Error',
        description: 'No se pudo iniciar el proceso de pago.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(null);
    }
  };

  const handleManageSubscription = async () => {
    setIsProcessing('portal');
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
      setIsProcessing(null);
    }
  };

  const handleRefresh = async () => {
    setIsProcessing('refresh');
    try {
      await refreshSubscription();
      toast({
        title: 'Actualizado',
        description: 'Estado de suscripción actualizado.',
      });
    } finally {
      setIsProcessing(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <Card>
        <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            {t('billing.yourPlan')}
          </CardTitle>
          <CardDescription>
            {t('billing.manageDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="flex items-center gap-3">
              {isPro ? (
                <Crown className="h-8 w-8 text-primary" />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                  <span className="text-sm font-medium">F</span>
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">
                    {isPro ? 'Crowdfolio Pro' : t('billing.freePlan')}
                  </h3>
                  {isPro && (
                    <Badge variant="secondary">
                      {subscription.plan === 'yearly' ? 'Anual' : 'Mensual'}
                    </Badge>
                  )}
                </div>
                {isPro && subscription.subscriptionEnd && (
                  <p className="text-sm text-muted-foreground">
                    <Calendar className="mr-1 inline h-3 w-3" />
                    Se renueva el{' '}
                    {new Date(subscription.subscriptionEnd).toLocaleDateString('es-ES', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                )}
                {!isPro && (
                  <p className="text-sm text-muted-foreground">
                    {t('billing.freeLimit')}
                  </p>
                )}
              </div>
            </div>
            <div>
              {isPro ? (
                <Button
                  variant="outline"
                  onClick={handleManageSubscription}
                  disabled={isProcessing === 'portal'}
                >
                  {isProcessing === 'portal' && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {t('billing.manage')}
                </Button>
              ) : (
                <Button onClick={() => handleCheckout('yearly')} disabled={isProcessing !== null}>
                  {isProcessing === 'yearly' && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  <Crown className="mr-2 h-4 w-4" />
                  {t('billing.upgradePro')}
                </Button>
              )}
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isProcessing === 'refresh'}
          >
            {isProcessing === 'refresh' && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {t('billing.refreshStatus')}
          </Button>
        </CardContent>
      </Card>

      {/* Upgrade Options (only for free users) */}
      {!isPro && (
        <Card>
          <CardHeader>
          <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-primary" />
              {t('billing.upgradePro')}
            </CardTitle>
            <CardDescription>
              {t('billing.upgradeDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border p-4">
              <div className="mb-2 flex items-baseline justify-between">
                <h4 className="font-medium">{t('billing.monthly')}</h4>
                <span className="text-2xl font-bold">
                  {formatPrice(STRIPE_PRICES.monthly.amount)}
                </span>
              </div>
              <p className="mb-4 text-sm text-muted-foreground">/{t('billing.perMonth')}</p>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => handleCheckout('monthly')}
                disabled={isProcessing !== null}
              >
                {isProcessing === 'monthly' && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {t('billing.chooseMonthly')}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>

            <div className="relative rounded-lg border-2 border-primary p-4">
              <Badge className="absolute -top-2 right-4">Ahorra 17%</Badge>
              <div className="mb-2 flex items-baseline justify-between">
                <h4 className="font-medium">{t('billing.yearly')}</h4>
                <span className="text-2xl font-bold">
                  {formatPrice(STRIPE_PRICES.yearly.amount)}
                </span>
              </div>
              <p className="mb-4 text-sm text-muted-foreground">/{t('billing.perYear')} (4,92€/{t('billing.perMonth')})</p>
              <Button
                className="w-full"
                onClick={() => handleCheckout('yearly')}
                disabled={isProcessing !== null}
              >
                {isProcessing === 'yearly' && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {t('billing.chooseYearly')}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Promo Code Section (only for free users) */}
      {!isPro && (
        <Card>
          <CardContent className="pt-6">
            <PromoCodeInput />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
