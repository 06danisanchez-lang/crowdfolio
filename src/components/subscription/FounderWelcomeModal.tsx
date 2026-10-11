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
import { PLAN_FEATURES } from '@/lib/stripe/config';
import { SUPPORT_EMAIL, buildProRequestMailto, formatLongDate } from '@/lib/proContact';

const BENEFITS = [
  'Inversiones activas ilimitadas',
  'Inversiones futuras ilimitadas',
  'Informe fiscal completo + exportación PDF y Excel',
];

export const FounderWelcomeModal = () => {
  const { isPro, subscription } = useSubscription();
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

  // Pro de prueba (o dado a mano): tiene fecha de fin y no hay pago detrás.
  const freeUntil = !subscription.subscribed && subscription.isBetaPro ? subscription.proUntil : null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center sm:text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <PartyPopper className="h-8 w-8 text-primary" />
          </div>
          <DialogTitle className="text-2xl">
            {freeUntil ? 'Tienes un mes de Pro gratis' : '¡Ya eres Pro!'}
          </DialogTitle>
          <DialogDescription className="text-base pt-2">
            {freeUntil
              ? `Hasta el ${formatLongDate(freeUntil)} tienes todo esto sin pagar nada:`
              : 'Tus ventajas:'}
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

        {freeUntil && (
          <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground leading-relaxed">
            <p className="mb-1 font-medium text-foreground">¿Y cuando termine?</p>
            <p>
              Tu cuenta pasa sola al plan gratuito, sin ningún cargo. No se borra nada, pero solo podrás
              gestionar tus {PLAN_FEATURES.free.investments} inversiones más antiguas y no podrás exportar
              el informe fiscal. Si quieres seguir con Pro, escríbenos a{' '}
              <a href={buildProRequestMailto(user?.email)} className="font-medium text-foreground underline underline-offset-2">
                {SUPPORT_EMAIL}
              </a>
              .
            </p>
          </div>
        )}

        <DialogFooter className="sm:justify-center">
          <Button onClick={handleClose} className="w-full sm:w-auto">
            ¡Entendido!
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
