import { useState, useMemo } from 'react';
import { Shield, Users, Wallet, TrendingUp, ChevronDown, ChevronRight, Search, X, Filter } from 'lucide-react';
import { useAdminInvestments } from '@/hooks/useAdminInvestments';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  
  // Filter states
  const [searchEmail, setSearchEmail] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

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

  // Filtered user investments
  const filteredUserInvestments = useMemo(() => {
    return userInvestments.filter(userInv => {
      // Filter by email search
      if (searchEmail && !userInv.email.toLowerCase().includes(searchEmail.toLowerCase())) {
        return false;
      }
      // Filter by specific user
      if (selectedUserId !== 'all' && userInv.userId !== selectedUserId) {
        return false;
      }
      // Filter by investment status
      if (statusFilter !== 'all') {
        const hasStatus = userInv.investments.some(inv => inv.status === statusFilter);
        if (!hasStatus) return false;
      }
      return true;
    });
  }, [userInvestments, searchEmail, selectedUserId, statusFilter]);

  // Recalculate summary with filtered data
  const filteredSummary = useMemo(() => ({
    totalUsers: filteredUserInvestments.length,
    totalInvestments: filteredUserInvestments.reduce((sum, u) => sum + u.investmentCount, 0),
    totalInvested: filteredUserInvestments.reduce((sum, u) => sum + u.totalInvested, 0),
    totalReturns: filteredUserInvestments.reduce((sum, u) => sum + u.totalReturns, 0),
  }), [filteredUserInvestments]);

  // Check if any filter is active
  const hasActiveFilters = searchEmail !== '' || selectedUserId !== 'all' || statusFilter !== 'all';

  // Clear all filters
  const clearFilters = () => {
    setSearchEmail('');
    setSelectedUserId('all');
    setStatusFilter('all');
  };

  // Auto-expand when selecting a specific user
  const handleUserSelect = (userId: string) => {
    setSelectedUserId(userId);
    if (userId !== 'all') {
      setExpandedUsers(new Set([userId]));
    }
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
      {/* Summary Cards - Now show filtered data */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Usuarios</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredSummary.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              {hasActiveFilters ? `de ${summary.totalUsers} usuarios` : 'con inversiones'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Inversiones</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredSummary.totalInvestments}</div>
            <p className="text-xs text-muted-foreground">
              {hasActiveFilters ? `de ${summary.totalInvestments} proyectos` : 'proyectos registrados'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Capital Total</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(filteredSummary.totalInvested)}</div>
            <p className="text-xs text-muted-foreground">
              {hasActiveFilters ? 'filtrado' : 'invertido en plataforma'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Retornos Totales</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(filteredSummary.totalReturns)}</div>
            <p className="text-xs text-muted-foreground">
              {hasActiveFilters ? 'filtrado' : 'cobrados por usuarios'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters Section */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="h-4 w-4" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Email Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por email..."
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* User Selector */}
            <Select value={selectedUserId} onValueChange={handleUserSelect}>
              <SelectTrigger className="w-full sm:w-[220px]">
                <SelectValue placeholder="Seleccionar usuario" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los usuarios</SelectItem>
                {userInvestments.map(userInv => (
                  <SelectItem key={userInv.userId} value={userInv.userId}>
                    {userInv.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                {STATUS_OPTIONS.map(status => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <Button variant="outline" onClick={clearFilters} className="gap-2">
                <X className="h-4 w-4" />
                Limpiar
              </Button>
            )}
          </div>

          {/* Results indicator */}
          {hasActiveFilters && (
            <p className="text-sm text-muted-foreground mt-4">
              Mostrando {filteredUserInvestments.length} de {userInvestments.length} usuarios
            </p>
          )}
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Inversiones por Usuario
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredUserInvestments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {hasActiveFilters ? 'No hay usuarios que coincidan con los filtros' : 'No hay inversiones registradas'}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredUserInvestments.map(userInv => (
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
