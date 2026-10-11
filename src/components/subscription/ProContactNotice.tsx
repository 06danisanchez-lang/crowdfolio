import { Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { SUPPORT_EMAIL, buildProRequestMailto } from '@/lib/proContact';
import { cn } from '@/lib/utils';

interface ProContactNoticeProps {
  /** Frase previa opcional (por ejemplo, qué desbloquea Pro en esa pantalla). */
  lead?: string;
  className?: string;
  buttonClassName?: string;
}

/**
 * Lo que se muestra en lugar de un botón de pago mientras los pagos no están
 * activos: explicación + botón que abre el correo a soporte ya escrito.
 */
export function ProContactNotice({ lead, className, buttonClassName }: ProContactNoticeProps) {
  const { user } = useAuth();

  return (
    <div className={cn('space-y-3', className)}>
      <p className="text-sm text-muted-foreground leading-relaxed">
        {lead ? `${lead} ` : ''}
        Los pagos todavía no están disponibles. Para seguir con Pro, escríbenos a{' '}
        <a href={buildProRequestMailto(user?.email)} className="font-medium text-foreground underline underline-offset-2">
          {SUPPORT_EMAIL}
        </a>{' '}
        y te lo activamos.
      </p>
      <Button asChild className={cn('w-full', buttonClassName)}>
        <a href={buildProRequestMailto(user?.email)}>
          <Mail className="mr-2 h-4 w-4" />
          Escribir a soporte
        </a>
      </Button>
    </div>
  );
}
