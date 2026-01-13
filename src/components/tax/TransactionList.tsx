import { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { MoreHorizontal, Pencil, Trash2, Receipt, TrendingUp, TrendingDown, DollarSign, AlertTriangle } from 'lucide-react';
import { Transaction, TransactionType, TRANSACTION_TYPE_LABELS, Asset, PLATFORM_COUNTRIES } from '@/types/asset';
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
import { TransactionForm } from './TransactionForm';
import { cn } from '@/lib/utils';

interface TransactionListProps {
  transactions: Transaction[];
  assets: Asset[];
  onUpdate: (id: string, data: Partial<Transaction>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onCreate: (data: Omit<Transaction, 'id' | 'createdAt'>) => Promise<void>;
}

export function TransactionList({ transactions, assets, onUpdate, onDelete, onCreate }: TransactionListProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const getAsset = (assetId: string) => {
    return assets.find(a => a.id === assetId);
  };

  const getTypeIcon = (type: TransactionType) => {
    switch (type) {
      case 'INTEREST':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'DIVIDEND':
        return <DollarSign className="h-4 w-4 text-blue-500" />;
      case 'SALE':
        return <TrendingDown className="h-4 w-4 text-purple-500" />;
      case 'LOSS':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
    }
  };

  const getTypeBadge = (type: TransactionType) => {
    const styles: Record<TransactionType, string> = {
      INTEREST: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      DIVIDEND: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      SALE: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      LOSS: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    };
    return (
      <Badge variant="secondary" className={cn('font-medium', styles[type])}>
        {TRANSACTION_TYPE_LABELS[type].label}
      </Badge>
    );
  };

  const handleDelete = async () => {
    if (deleteId) {
      await onDelete(deleteId);
      setDeleteId(null);
    }
  };

  // Calculate totals
  const totals = transactions.reduce(
    (acc, t) => ({
      gross: acc.gross + t.grossAmount,
      withholding: acc.withholding + (t.withholdingAmount || 0),
    }),
    { gross: 0, withholding: 0 }
  );

  if (transactions.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Receipt className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold mb-2">No hay transacciones registradas</h3>
          <p className="text-sm text-muted-foreground mb-4 text-center">
            Registra cobros de intereses, dividendos o ventas de tus activos.
          </p>
          {assets.length > 0 && (
            <TransactionForm assets={assets} onSubmit={onCreate} />
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Transacciones ({transactions.length})
          </CardTitle>
          <TransactionForm assets={assets} onSubmit={onCreate} />
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Activo</TableHead>
                  <TableHead className="text-right">Bruto</TableHead>
                  <TableHead className="text-right">Retención</TableHead>
                  <TableHead className="text-right">Neto</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((transaction) => {
                  const asset = getAsset(transaction.assetId);
                  const flag = asset ? PLATFORM_COUNTRIES.find(c => c.code === asset.countryCode)?.flag : '🌍';
                  const netAmount = transaction.grossAmount - (transaction.withholdingAmount || 0);
                  
                  return (
                    <TableRow key={transaction.id}>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(transaction.date), 'dd MMM yyyy', { locale: es })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getTypeIcon(transaction.type)}
                          {getTypeBadge(transaction.type)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {asset ? (
                          <div className="flex items-center gap-2">
                            <span>{flag}</span>
                            <div className="flex flex-col">
                              <span className="font-medium text-sm">{asset.platformName}</span>
                              <span className="text-xs text-muted-foreground">{asset.projectName}</span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Activo eliminado</span>
                        )}
                      </TableCell>
                      <TableCell className={cn(
                        "text-right font-medium",
                        transaction.grossAmount < 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"
                      )}>
                        {formatCurrency(transaction.grossAmount)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {transaction.withholdingAmount ? formatCurrency(transaction.withholdingAmount) : '-'}
                      </TableCell>
                      <TableCell className={cn(
                        "text-right font-medium",
                        netAmount < 0 ? "text-red-600 dark:text-red-400" : ""
                      )}>
                        {formatCurrency(netAmount)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setDeleteId(transaction.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {/* Totals row */}
                <TableRow className="bg-muted/50 font-medium">
                  <TableCell colSpan={3} className="text-right">
                    Totales:
                  </TableCell>
                  <TableCell className={cn(
                    "text-right",
                    totals.gross < 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"
                  )}>
                    {formatCurrency(totals.gross)}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {formatCurrency(totals.withholding)}
                  </TableCell>
                  <TableCell className={cn(
                    "text-right",
                    totals.gross - totals.withholding < 0 ? "text-red-600 dark:text-red-400" : ""
                  )}>
                    {formatCurrency(totals.gross - totals.withholding)}
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar transacción?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará la transacción permanentemente. 
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
