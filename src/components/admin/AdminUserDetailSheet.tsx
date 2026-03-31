import { useState } from 'react';
import type { AdminUser } from '@/hooks/useAdminDashboard';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Briefcase, Hash, TrendingUp, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value);
}

function AssetTypeBadge({ type }: { type: 'LENDING' | 'EQUITY' | null }) {
  if (type === 'LENDING') {
    return <Badge variant="outline" className="border-blue-500/30 text-blue-600">Lending</Badge>;
  }
  if (type === 'EQUITY') {
    return <Badge variant="outline" className="border-purple-500/30 text-purple-600">Equity</Badge>;
  }
  return <Badge variant="secondary">Legacy</Badge>;
}

function StatusBadge({ status }: { status: string }) {
  const isActive = status === 'active';
  return (
    <Badge variant={isActive ? 'default' : 'secondary'} className={isActive ? 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/30' : ''}>
      {status === 'active' ? 'Activo' : status === 'completed' ? 'Completado' : status}
    </Badge>
  );
}

interface Props {
  user: AdminUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserDeleted?: () => void;
}

export default function AdminUserDetailSheet({ user, open, onOpenChange, onUserDeleted }: Props) {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!user) return null;

  const handleDeleteUser = async () => {
    setIsDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Sesión expirada. Inicia sesión de nuevo.');
        return;
      }

      const response = await supabase.functions.invoke('delete-user', {
        body: { userId: user.userId },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Error al eliminar');
      }

      const data = response.data;
      if (data?.error) {
        throw new Error(data.error);
      }

      toast.success(`Usuario ${user.email || user.fullName} eliminado correctamente`);
      onOpenChange(false);
      onUserDeleted?.();
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar el usuario');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {user.fullName || 'Sin nombre'}
            {user.subscriptionStatus === 'active' ? (
              <Badge className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border-amber-500/30">
                Pro
              </Badge>
            ) : (
              <Badge variant="secondary">Free</Badge>
            )}
          </SheetTitle>
          <SheetDescription>{user.email || '—'}</SheetDescription>
        </SheetHeader>

        {/* Summary metrics */}
        <div className="mt-6 grid grid-cols-3 gap-3">
          <div className="rounded-lg border p-3 text-center">
            <Briefcase className="mx-auto mb-1 h-4 w-4 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Total Invertido</p>
            <p className="text-sm font-bold">{formatCurrency(user.totalInvested)}</p>
          </div>
          <div className="rounded-lg border p-3 text-center">
            <Hash className="mx-auto mb-1 h-4 w-4 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Inversiones</p>
            <p className="text-sm font-bold">{user.investmentCount}</p>
          </div>
          <div className="rounded-lg border p-3 text-center">
            <TrendingUp className="mx-auto mb-1 h-4 w-4 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Ticket Promedio</p>
            <p className="text-sm font-bold">{formatCurrency(user.averageTicket)}</p>
          </div>
        </div>

        <Separator className="my-5" />

        {/* Investments table */}
        <h3 className="mb-3 text-sm font-semibold">Desglose de Cartera</h3>

        {user.investments.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Este usuario no tiene inversiones registradas.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Proyecto</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {user.investments.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{inv.projectName}</p>
                      <p className="text-xs text-muted-foreground">{inv.platformName}</p>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{formatCurrency(inv.amount)}</TableCell>
                  <TableCell><AssetTypeBadge type={inv.assetType} /></TableCell>
                  <TableCell><StatusBadge status={inv.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* Delete user section */}
        <Separator className="my-5" />

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="w-full" disabled={isDeleting}>
              {isDeleting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Eliminar Usuario
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar este usuario?</AlertDialogTitle>
              <AlertDialogDescription>
                Vas a eliminar a <strong>{user.email || user.fullName}</strong> y todos sus datos
                (inversiones, activos, transacciones, perfil, suscripción…).
                <br /><br />
                <strong>Esta acción es irreversible.</strong>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteUser}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SheetContent>
    </Sheet>
  );
}
