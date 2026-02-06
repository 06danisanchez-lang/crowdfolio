import type { AdminUser } from '@/hooks/useAdminDashboard';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Briefcase, Hash, TrendingUp } from 'lucide-react';

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
}

export default function AdminUserDetailSheet({ user, open, onOpenChange }: Props) {
  if (!user) return null;

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
                <TableHead>Tipo</TableHead>
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
      </SheetContent>
    </Sheet>
  );
}
