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
import { PLAN_FEATURES } from '@/lib/stripe/config';
import { ProContactNotice } from './ProContactNotice';

// Se enseña una vez por visita (sesión del navegador), no en cada recarga.
const SEEN_KEY = 'cf_beta_expired_seen';

function alreadySeenThisVisit(): boolean {
  try {
    return sessionStorage.getItem(SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

function markSeenThisVisit() {
  try {
    sessionStorage.setItem(SEEN_KEY, '1');
  } catch {
    // Sin almacenamiento (modo privado estricto): el aviso volverá a salir, sin más.
  }
}

export const BetaExpiredModal = () => {
  const { subscription, isLoading, isPro } = useSubscription();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (isLoading || isPro) return;
    if (!subscription.isBetaPro || !subscription.proUntil) return;
    if (new Date(subscription.proUntil) > new Date()) return;
    if (alreadySeenThisVisit()) return;

    const timer = setTimeout(() => setOpen(true), 600);
    return () => clearTimeout(timer);
  }, [isLoading, isPro, subscription.isBetaPro, subscription.proUntil]);

  const handleOpenChange = (next: boolean) => {
    if (!next) markSeenThisVisit();
    setOpen(next);
  };

  const limit = PLAN_FEATURES.free.investments;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">
            Tu mes gratis de Pro ha terminado
          </DialogTitle>
          <DialogDescription className="text-base pt-2 leading-relaxed">
            Tu cuenta ha pasado al plan gratuito. No se ha borrado nada: todas tus inversiones y cobros
            siguen guardados. En el plan gratuito puedes ver y gestionar tus {limit} inversiones más
            antiguas; las demás quedan bloqueadas hasta que vuelvas a Pro, y el informe fiscal no se
            puede exportar.
          </DialogDescription>
        </DialogHeader>
        <ProContactNotice />
        <DialogFooter className="sm:justify-center">
          <Button variant="ghost" onClick={() => handleOpenChange(false)} className="w-full sm:w-auto">
            Seguir con el plan gratuito
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
