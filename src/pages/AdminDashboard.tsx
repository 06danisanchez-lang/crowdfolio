import { useAuth } from '@/contexts/AuthContext';
import { useAdminDashboard } from '@/hooks/useAdminDashboard';
import { useNavigate } from 'react-router-dom';
import { Shield, Users, Crown, TrendingUp, ArrowLeft, ShieldAlert, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value);
}

function KPISkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-5 w-5 rounded" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-24" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function TableSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-40" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-24 rounded" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function AccessDenied() {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <ShieldAlert className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle>Acceso Denegado</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            No tienes permisos de administrador para ver esta página.
          </p>
          <Button onClick={() => navigate('/')} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminDashboard() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const { data, isLoading, error } = useAdminDashboard();

  if (!isAdmin) {
    return <AccessDenied />;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Panel de Administración</h1>
              <p className="text-sm text-muted-foreground">Resumen global de usuarios e inversiones</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al Dashboard
          </Button>
        </div>

        {/* KPI Cards */}
        {isLoading ? (
          <KPISkeleton />
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Usuarios</CardTitle>
                <Users className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{data?.totalUsers ?? 0}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Usuarios Pro Activos</CardTitle>
                <Crown className="h-5 w-5 text-amber-500" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{data?.proUsers ?? 0}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Volumen Total Gestionado</CardTitle>
                <TrendingUp className="h-5 w-5 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{formatCurrency(data?.totalVolume ?? 0)}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Error state */}
        {error && (
          <Card className="border-destructive">
            <CardContent className="py-4 text-sm text-destructive">
              Error al cargar datos: {(error as Error).message}
            </CardContent>
          </Card>
        )}

        {/* Users Table */}
        {isLoading ? (
          <TableSkeleton />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Usuarios Registrados</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Vencimiento</TableHead>
                    <TableHead>Volumen</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.users.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No se encontraron usuarios.
                      </TableCell>
                    </TableRow>
                  )}
                  {data?.users.map((u) => (
                    <TableRow key={u.userId}>
                      <TableCell className="font-medium">
                        {u.fullName || '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {u.email || '—'}
                      </TableCell>
                      <TableCell>
                        {u.subscriptionStatus === 'active' ? (
                          <Badge className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border-amber-500/30">
                            Pro
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Free</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {u.subscriptionEnd
                          ? format(new Date(u.subscriptionEnd), 'dd MMM yyyy', { locale: es })
                          : '—'}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(u.totalInvested)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" disabled>
                          <Eye className="mr-1 h-4 w-4" />
                          Ver Detalles
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
