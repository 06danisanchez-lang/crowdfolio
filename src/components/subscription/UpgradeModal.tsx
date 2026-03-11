import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Sparkles, Check, Crown, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { STRIPE_PRICES, formatPrice } from '@/lib/stripe/config';
import { toast } from '@/hooks/use-toast';

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature?: string;
}

export function UpgradeModal({ open, onOpenChange, feature = 'default' }: UpgradeModalProps) {
  const { t } = useLanguage();
  const { openCheckout, isPro } = useSubscription();
  const [isLoading, setIsLoading] = useState<'monthly' | 'yearly' | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');

  // Declared inside component so they react to language changes
  const proFeatures = [
    t('subscription.pro.f1'),
    t('subscription.pro.f2'),
    t('subscription.pro.f3'),
    t('subscription.pro.f4'),
    t('subscription.pro.f5'),
  ];

  const featureCtaMap: Record<string, string> = {
    export_irpf: t('subscription.cta.taxExport'),
    unlimited_investments: t('subscription.cta.investments'),
    unlimited_imports: t('subscription.cta.imports'),
    alerts: t('subscription.cta.alerts'),
    tax: t('subscription.cta.tax'),
    default: t('subscription.cta.default'),
  };

  const ctaLabel = featureCtaMap[feature] || t('subscription.cta.default');

  const handleCheckout = async (plan: 'monthly' | 'yearly') => {
    setIsLoading(plan);
    try {
      await openCheckout(plan);
      onOpenChange(false);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Crown className="h-6 w-6 text-primary" />
            <DialogTitle>
              {isPro ? t('subscription.yourPro') : ctaLabel}
            </DialogTitle>
          </div>
          <DialogDescription className="pt-2">
            {isPro ? t('subscription.activeBenefits') : t('subscription.noCommitment')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!isPro && (
            <>
              {/* Plan Toggle */}
              <div className="flex rounded-lg border p-1">
                <button
                  onClick={() => setSelectedPlan('monthly')}
                  className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                    selectedPlan === 'monthly'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t('subscription.monthly')}
                </button>
                <button
                  onClick={() => setSelectedPlan('yearly')}
                  className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                    selectedPlan === 'yearly'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t('subscription.yearly')}
                  <Badge variant="secondary" className="ml-1.5 text-xs">
                    -17%
                  </Badge>
                </button>
              </div>

              {/* Price Display */}
              <div className="rounded-lg border bg-muted/50 p-4 text-center">
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-3xl font-bold">
                    {formatPrice(STRIPE_PRICES[selectedPlan].amount)}
                  </span>
                  <span className="text-muted-foreground">
                    /{selectedPlan === 'monthly' ? t('billing.perMonth') : t('billing.perYear')}
                  </span>
                </div>
                {selectedPlan === 'yearly' && (
                  <p className="mt-1 text-sm text-primary">
                    <Sparkles className="mr-1 inline h-3 w-3" />
                    {STRIPE_PRICES.yearly.savings}
                  </p>
                )}
              </div>
            </>
          )}

          {/* Features List */}
          <ul className="space-y-2">
            {proFeatures.map((feat) => (
              <li key={feat} className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 shrink-0 text-primary" />
                {feat}
              </li>
            ))}
          </ul>

          {!isPro && (
            <>
              <Button
                className="w-full"
                size="lg"
                onClick={() => handleCheckout(selectedPlan)}
                disabled={isLoading !== null}
              >
                {isLoading === selectedPlan ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Crown className="mr-2 h-4 w-4" />
                )}
                {ctaLabel}
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                {t('subscription.noCommitment')}
              </p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
