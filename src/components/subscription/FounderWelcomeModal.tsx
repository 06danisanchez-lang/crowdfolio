import { useState, useEffect } from 'react';
import { PartyPopper, Check } from 'lucide-react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const BENEFITS = [
  'Inversiones activas ilimitadas',
  'Inversiones futuras ilimitadas',
  'Informe fiscal completo + exportación PDF y Excel',
];

export const FounderWelcomeModal = () => {
  const { isPro } = useSubscription();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!isPro || !user) return;

    let cancelled = false;

    supabase
      .from('profiles')
      .select('pro_welcome_shown')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (!cancelled && data && !data.pro_welcome_shown) {
          setTimeout(() => setOpen(true), 500);
        }
      });

    return () => { cancelled = true; };
  }, [isPro, user]);

  const handleClose = async () => {
    setOpen(false);
    if (user) {
      await supabase
        .from('profiles')
        .update({ pro_welcome_shown: true })
        .eq('id', user.id);
    }
  };

  if (!isPro) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center sm:text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <PartyPopper className="h-8 w-8 text-primary" />
          </div>
          <DialogTitle className="text-2xl">
            ¡Ya eres Pro!
          </DialogTitle>
          <DialogDescription className="text-base pt-2">
            Tus ventajas:
          </DialogDescription>
        </DialogHeader>

        <ul className="my-2 space-y-2 px-2">
          {BENEFITS.map(benefit => (
            <li key={benefit} className="flex items-center gap-3">
              <Check className="h-4 w-4 shrink-0 text-primary" />
              <span className="text-sm">{benefit}</span>
            </li>
          ))}
        </ul>

        <DialogFooter className="sm:justify-center">
          <Button onClick={handleClose} className="w-full sm:w-auto">
            ¡Entendido!
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
