import { PAYMENTS_ENABLED } from '@/lib/stripe/config';
import { cn } from '@/lib/utils';

/**
 * Aviso mientras Stripe no está activo (PAYMENTS_ENABLED = false): los botones de pago
 * salen deshabilitados y aquí se explica qué hacer para tener Pro. Desaparece solo al
 * activar los pagos.
 */
export function PaymentsUnavailableNotice({ className }: { className?: string }) {
  if (PAYMENTS_ENABLED) return null;
  return (
    <p className={cn('text-center text-sm text-muted-foreground', className)}>
      Los pagos aún no están disponibles. Si quieres Pro, escríbenos a{' '}
      <a
        href="mailto:soporte@crowdfolio.es"
        className="font-medium text-foreground underline underline-offset-2 hover:opacity-80"
      >
        soporte@crowdfolio.es
      </a>
      .
    </p>
  );
}
