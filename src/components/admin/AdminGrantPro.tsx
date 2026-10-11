import { useState } from 'react';
import { addDays, format } from 'date-fns';
import { Crown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import type { AdminUser } from '@/hooks/useAdminDashboard';
import { formatAdminDate } from '@/lib/admin/proStatus';

interface Props {
  user: AdminUser;
  onGranted: () => void;
}

const toInputDate = (d: Date) => format(d, 'yyyy-MM-dd');

/**
 * Dar (o cambiar) el Pro gratuito de un usuario hasta el día elegido, incluido.
 * Llama a admin_set_pro_until, que comprueba en la base de datos que quien llama es admin.
 */
export default function AdminGrantPro({ user, onGranted }: Props) {
  const tomorrow = toInputDate(addDays(new Date(), 1));
  const [until, setUntil] = useState(() => {
    // Por defecto: un mes más desde hoy o desde el fin actual, lo que sea más tarde.
    const from = user.pro.proEnd && new Date(user.pro.proEnd) > new Date() ? new Date(user.pro.proEnd) : new Date();
    return toInputDate(addDays(from, 30));
  });
  const [saving, setSaving] = useState(false);

  const shortens = user.pro.kind === 'free' && !!user.pro.proEnd && until !== '' && new Date(`${until}T23:59:59`) < new Date(user.pro.proEnd);

  const handleGrant = async () => {
    if (!until) return;
    setSaving(true);
    try {
      const { error } = await supabase.rpc('admin_set_pro_until', { _target_user: user.userId, _until: until });
      if (error) throw new Error(error.message);
      toast.success(`${user.email || user.fullName || 'Usuario'}: Pro hasta el ${formatAdminDate(`${until}T12:00:00`)}`);
      onGranted();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo dar Pro');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div>
        <h3 className="text-sm font-semibold">Dar Pro</h3>
        <p className="text-xs text-muted-foreground">
          {user.pro.isPro && user.pro.proEnd
            ? `Ahora es Pro ${user.pro.kind === 'free' ? 'gratis' : 'por suscripción'} hasta el ${formatAdminDate(user.pro.proEnd)}.`
            : 'Ahora está en el plan gratuito.'}{' '}
          Elige hasta qué día (incluido) tendrá Pro gratis.
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-1">
          <Label htmlFor="pro-until" className="text-xs">Pro hasta el</Label>
          <Input id="pro-until" type="date" min={tomorrow} value={until} onChange={(e) => setUntil(e.target.value)} />
        </div>
        <Button onClick={handleGrant} disabled={saving || !until || until < tomorrow}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Crown className="mr-2 h-4 w-4" />}
          Dar Pro
        </Button>
      </div>
      {shortens && (
        <p className="text-xs text-amber-700">Ojo: esa fecha es anterior a la que tiene ahora, así que le acortas el Pro.</p>
      )}
      {user.pro.kind === 'subscription' && (
        <p className="text-xs text-muted-foreground">Tiene una suscripción: esto no la toca, solo añade Pro gratis hasta esa fecha.</p>
      )}
    </div>
  );
}
