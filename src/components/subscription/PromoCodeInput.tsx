import { useState } from 'react';
import { Gift, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSubscription } from '@/contexts/SubscriptionContext';

export function PromoCodeInput() {
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isApplied, setIsApplied] = useState(false);
  const { refreshSubscription } = useSubscription();

  const handleApplyCode = async () => {
    if (!code.trim()) {
      toast.error('Introduce un código promocional');
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('apply-promo-code', {
        body: { code: code.trim() },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.error) {
        toast.error(data.error);
        return;
      }

      setIsApplied(true);
      toast.success(data.message || '¡Código aplicado con éxito!');
      
      // Refresh subscription status
      await refreshSubscription();
      
    } catch (error) {
      console.error('Error applying promo code:', error);
      toast.error('Error al aplicar el código promocional');
    } finally {
      setIsLoading(false);
    }
  };

  if (isApplied) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-green-600 dark:text-green-400">
        <Check className="h-5 w-5" />
        <span className="text-sm font-medium">¡Código promocional aplicado!</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="promo-code" className="flex items-center gap-2 text-sm font-medium">
        <Gift className="h-4 w-4" />
        ¿Tienes un código promocional?
      </Label>
      <div className="flex gap-2">
        <Input
          id="promo-code"
          placeholder="Introduce tu código"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          className="flex-1 uppercase"
          disabled={isLoading}
        />
        <Button
          onClick={handleApplyCode}
          disabled={isLoading || !code.trim()}
          variant="secondary"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            'Aplicar'
          )}
        </Button>
      </div>
    </div>
  );
}
