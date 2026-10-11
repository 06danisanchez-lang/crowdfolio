import { Badge } from '@/components/ui/badge';
import { formatAdminDate, type AdminProStatus } from '@/lib/admin/proStatus';

/** Distintivo Pro/Free del panel de admin, con el tipo de Pro debajo. */
export function AdminProBadge({ pro }: { pro: AdminProStatus }) {
  if (!pro.isPro) {
    return (
      <span className="inline-flex flex-col items-start gap-0.5">
        <Badge variant="secondary">Free</Badge>
        {pro.expiredFreeProEnd && (
          <span className="text-[11px] text-muted-foreground">Pro gratis hasta {formatAdminDate(pro.expiredFreeProEnd)}</span>
        )}
      </span>
    );
  }
  return (
    <span className="inline-flex flex-col items-start gap-0.5">
      <Badge className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border-amber-500/30">Pro</Badge>
      <span className="text-[11px] text-muted-foreground">{pro.kind === 'free' ? 'gratis' : 'suscripción'}</span>
    </span>
  );
}
