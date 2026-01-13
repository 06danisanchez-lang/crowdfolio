import { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { MoreHorizontal, Pencil, Trash2, Plus, TrendingUp, Building2, Landmark } from 'lucide-react';
import { Asset, ASSET_TYPE_LABELS, PLATFORM_COUNTRIES } from '@/types/asset';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AssetForm } from './AssetForm';
import { cn } from '@/lib/utils';

interface AssetListProps {
  assets: Asset[];
  onUpdate: (id: string, data: Partial<Asset>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onCreate: (data: Omit<Asset, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onSelect?: (asset: Asset) => void;
}

export function AssetList({ assets, onUpdate, onDelete, onCreate, onSelect }: AssetListProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getCountryFlag = (code: string) => {
    const country = PLATFORM_COUNTRIES.find(c => c.code === code);
    return country?.flag || '🌍';
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      completed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      defaulted: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    };
    const labels: Record<string, string> = {
      active: 'Activo',
      completed: 'Completado',
      defaulted: 'Fallido',
    };
    return (
      <Badge variant="secondary" className={cn('font-medium', styles[status])}>
        {labels[status] || status}
      </Badge>
    );
  };

  const handleDelete = async () => {
    if (deleteId) {
      await onDelete(deleteId);
      setDeleteId(null);
    }
  };

  if (assets.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Building2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold mb-2">No hay activos registrados</h3>
          <p className="text-sm text-muted-foreground mb-4 text-center">
            Añade tu primer activo para empezar a hacer seguimiento fiscal.
          </p>
          <AssetForm onSubmit={onCreate} />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Landmark className="h-5 w-5" />
            Activos ({assets.length})
          </CardTitle>
          <AssetForm onSubmit={onCreate} />
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Plataforma</TableHead>
                  <TableHead>Proyecto</TableHead>
                  <TableHead>País</TableHead>
                  <TableHead className="text-right">Coste</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Rent. Esp.</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assets.map((asset) => (
                  <TableRow
                    key={asset.id}
                    className={cn(onSelect && 'cursor-pointer hover:bg-muted/50')}
                    onClick={() => onSelect?.(asset)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {asset.assetType === 'LENDING' ? (
                          <TrendingUp className="h-4 w-4 text-blue-500" />
                        ) : (
                          <Building2 className="h-4 w-4 text-purple-500" />
                        )}
                        <span className="text-xs font-medium">
                          {ASSET_TYPE_LABELS[asset.assetType].label}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{asset.platformName}</TableCell>
                    <TableCell>{asset.projectName}</TableCell>
                    <TableCell>
                      <span className="text-lg" title={PLATFORM_COUNTRIES.find(c => c.code === asset.countryCode)?.name}>
                        {getCountryFlag(asset.countryCode)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(asset.acquisitionCost)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(asset.investmentDate), 'dd MMM yyyy', { locale: es })}
                    </TableCell>
                    <TableCell className="text-right">
                      {asset.expectedReturn ? `${asset.expectedReturn}%` : '-'}
                    </TableCell>
                    <TableCell>{getStatusBadge(asset.status)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <AssetForm
                            initialData={asset}
                            onSubmit={(data) => onUpdate(asset.id, data)}
                            trigger={
                              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                            }
                          />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteId(asset.id);
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar activo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará el activo y todas sus transacciones asociadas. 
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
