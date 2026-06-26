import { useState, useEffect } from 'react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export const BetaExpiredModal = () => {
  const { subscription, isLoading } = useSubscription();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (!subscription.isBetaPro || !subscription.proUntil) return;
    if (new Date(subscription.proUntil) > new Date()) return;

    const timer = setTimeout(() => setOpen(true), 600);
    return () => clearTimeout(timer);
  }, [isLoading, subscription.isBetaPro, subscription.proUntil]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">
            Tu prueba gratuita de Pro ha finalizado
          </DialogTitle>
          <DialogDescription className="text-base pt-2 leading-relaxed">
            Tu mes de prueba gratuita de CrowdFolio Pro ha finalizado. Estamos en
            fase beta, así que la versión de pago todavía no está disponible
            públicamente, pero si quieres seguir disfrutando de Pro, escríbenos a{' '}
            <a
              href="mailto:soporte@crowdfolio.es"
              className="font-medium underline underline-offset-2 hover:opacity-80"
            >
              soporte@crowdfolio.es
            </a>{' '}
            y te lo activamos encantados.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-center pt-2">
          <Button onClick={() => setOpen(false)} className="w-full sm:w-auto">
            Entendido
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
