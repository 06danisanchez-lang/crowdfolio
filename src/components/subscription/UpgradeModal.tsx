import { useState } from 'react';
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

const FEATURE_MESSAGES: Record<string, string> = {
  export_irpf: 'Exporta tu resumen fiscal IRPF en Excel y PDF para tu declaración de la renta.',
  unlimited_investments: 'Registra todas tus inversiones sin límites.',
  unlimited_imports: 'Importa inversiones desde archivos sin restricciones mensuales.',
  alerts: 'Configura alertas personalizadas para tus inversiones.',
  default: 'Desbloquea todas las funcionalidades premium de Crowdfolio.',
};

const PRO_FEATURES = [
  'Inversiones ilimitadas',
  'Importaciones ilimitadas',
  'Alertas configurables',
  'Exportar resumen IRPF',
  'Soporte prioritario',
];

export function UpgradeModal({ open, onOpenChange, feature = 'default' }: UpgradeModalProps) {
  const { openCheckout, isPro } = useSubscription();
  const [isLoading, setIsLoading] = useState<'monthly' | 'yearly' | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');

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

  const featureMessage = FEATURE_MESSAGES[feature] || FEATURE_MESSAGES.default;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Crown className="h-6 w-6 text-primary" />
            <DialogTitle>{isPro ? 'Tu Plan Pro' : 'Desbloquea Crowdfolio Pro'}</DialogTitle>
          </div>
          <DialogDescription className="pt-2">
            {isPro ? 'Estos son tus beneficios activos.' : featureMessage}
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
                  Mensual
                </button>
                <button
                  onClick={() => setSelectedPlan('yearly')}
                  className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                    selectedPlan === 'yearly'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Anual
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
                    /{selectedPlan === 'monthly' ? 'mes' : 'año'}
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
            {PRO_FEATURES.map((feat) => (
              <li key={feat} className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-primary" />
                {feat}
              </li>
            ))}
          </ul>

          {!isPro && (
            <>
              {/* CTA Button */}
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
                Empezar con Pro
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                Cancela cuando quieras. Sin compromisos.
              </p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
