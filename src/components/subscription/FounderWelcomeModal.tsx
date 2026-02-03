import { useState, useEffect } from 'react';
import { PartyPopper, Mail } from 'lucide-react';
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

const STORAGE_KEY = 'crowdfolio_founder_welcome_shown';

export const FounderWelcomeModal = () => {
  const { isPro } = useSubscription();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Solo mostrar si el usuario es Pro y no ha visto el modal antes
    const hasSeenWelcome = localStorage.getItem(STORAGE_KEY);
    
    if (isPro && !hasSeenWelcome) {
      // Pequeño delay para que el dashboard cargue primero
      const timer = setTimeout(() => {
        setOpen(true);
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [isPro]);

  const handleClose = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setOpen(false);
  };

  // No renderizar si no es Pro
  if (!isPro) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center sm:text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <PartyPopper className="h-8 w-8 text-primary" />
          </div>
          <DialogTitle className="text-2xl">
            ¡Bienvenido, Héroe Fundador!
          </DialogTitle>
          <DialogDescription className="text-base leading-relaxed pt-2">
            Gracias por ayudarnos a construir Crowdfolio. Tu apoyo temprano hace posible este proyecto.
          </DialogDescription>
        </DialogHeader>
        
        <div className="my-4 rounded-lg bg-muted p-4 text-center">
          <p className="text-sm text-muted-foreground mb-2">
            Si encuentras cualquier error o tienes una sugerencia, escríbeme directamente a:
          </p>
          <a 
            href="mailto:soporte@crowdfolio.es"
            className="inline-flex items-center gap-2 text-primary font-medium hover:underline"
          >
            <Mail className="h-4 w-4" />
            soporte@crowdfolio.es
          </a>
        </div>

        <DialogFooter className="sm:justify-center">
          <Button onClick={handleClose} className="w-full sm:w-auto">
            ¡Entendido!
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
