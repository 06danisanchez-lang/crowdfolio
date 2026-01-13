import { useState } from 'react';
import { Shield, Users, Wallet, TrendingUp, ChevronDown, ChevronRight } from 'lucide-react';
import { useAdminInvestments } from '@/hooks/useAdminInvestments';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { PLATFORMS, STATUS_OPTIONS } from '@/types/investment';

export function AdminPanel() {
  const { userInvestments, isLoading, isAdmin, summary } = useAdminInvestments();
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getPlatformLabel = (platform: string) => {
    return PLATFORMS.find(p => p.value === platform)?.label || platform;
  };

  const getStatusBadge = (status: string) => {
    const statusOption = STATUS_OPTIONS.find(s => s.value === status);
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      active: 'default',
      pending: 'secondary',
      completed: 'outline',
      defaulted: 'destructive',
    };
    return (
      <Badge variant={variants[status] || 'secondary'}>
        {statusOption?.label || status}
      </Badge>
    );
  };

  const toggleUserExpanded = (userId: string) => {
    setExpandedUsers(prev => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  if (!isAdmin && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Shield className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Acceso Denegado</h2>
        <p className="text-muted-foreground">No tienes permisos de administrador</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="pt-6">
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Usuarios</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalUsers}</div>
            <p className="text-xs text-muted-foreground">con inversiones</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Inversiones</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalInvestments}</div>
            <p className="text-xs text-muted-foreground">proyectos registrados</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Capital Total</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.totalInvested)}</div>
            <p className="text-xs text-muted-foreground">invertido en plataforma</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Retornos Totales</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.totalReturns)}</div>
            <p className="text-xs text-muted-foreground">cobrados por usuarios</p>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Inversiones por Usuario
          </CardTitle>
        </CardHeader>
        <CardContent>
          {userInvestments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay inversiones registradas
            </div>
          ) : (
            <div className="space-y-2">
              {userInvestments.map(userInv => (
                <Collapsible
                  key={userInv.userId}
                  open={expandedUsers.has(userInv.userId)}
                  onOpenChange={() => toggleUserExpanded(userInv.userId)}
                >
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full justify-start p-4 h-auto hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-4 w-full">
                        {expandedUsers.has(userInv.userId) ? (
                          <ChevronDown className="h-4 w-4 flex-shrink-0" />
                        ) : (
                          <ChevronRight className="h-4 w-4 flex-shrink-0" />
                        )}
                        <div className="flex-1 text-left">
                          <p className="font-medium">{userInv.email}</p>
                          <p className="text-sm text-muted-foreground">
                            {userInv.investmentCount} inversión{userInv.investmentCount !== 1 ? 'es' : ''}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{formatCurrency(userInv.totalInvested)}</p>
                          <p className="text-sm text-muted-foreground">
                            Retornos: {formatCurrency(userInv.totalReturns)}
                          </p>
                        </div>
                      </div>
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="ml-8 mr-4 mb-4 rounded-lg border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Proyecto</TableHead>
                            <TableHead>Plataforma</TableHead>
                            <TableHead>Importe</TableHead>
                            <TableHead>Rentabilidad</TableHead>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Estado</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {userInv.investments.map(inv => (
                            <TableRow key={inv.id}>
                              <TableCell className="font-medium">{inv.projectName}</TableCell>
                              <TableCell>{getPlatformLabel(inv.platform)}</TableCell>
                              <TableCell>{formatCurrency(inv.amount)}</TableCell>
                              <TableCell>{inv.expectedReturn.toFixed(1)}%</TableCell>
                              <TableCell>{formatDate(inv.investmentDate)}</TableCell>
                              <TableCell>{getStatusBadge(inv.status)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
