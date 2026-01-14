import { TaxExpense, TAX_EXPENSE_CATEGORIES, TaxExpenseCategory } from '@/types/tax';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { SuggestedExpenses } from './SuggestedExpenses';

interface TaxExpensesListProps {
  expenses: TaxExpense[];
  onUpdate: (id: string, updates: Partial<TaxExpense>) => void;
  onDelete: (id: string) => void;
  onAddSuggested?: (category: TaxExpenseCategory, description: string) => void;
}

export function TaxExpensesList({ expenses, onUpdate, onDelete, onAddSuggested }: TaxExpensesListProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const getCategoryLabel = (category: string) => {
    return TAX_EXPENSE_CATEGORIES.find((c) => c.value === category)?.label || category;
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      platform_fees: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      advisory: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      management: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      travel: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      other: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
    };
    return colors[category] || colors.other;
  };

  if (expenses.length === 0 && onAddSuggested) {
    return (
      <Card>
        <CardContent className="py-6">
          <SuggestedExpenses 
            onAddSuggested={onAddSuggested} 
            showAsEmptyState 
          />
        </CardContent>
      </Card>
    );
  }

  if (expenses.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <p className="text-center text-muted-foreground">
            No hay gastos deducibles registrados para este año
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead className="text-right">Importe</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell className="whitespace-nowrap">
                    {format(new Date(expense.date), 'd MMM yyyy', { locale: es })}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={getCategoryColor(expense.category)}>
                      {getCategoryLabel(expense.category)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{expense.description}</p>
                      {expense.notes && (
                        <p className="text-xs text-muted-foreground">{expense.notes}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(expense.amount)}
                  </TableCell>
                  <TableCell>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Eliminar gasto?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta acción no se puede deshacer. Se eliminará el gasto "{expense.description}".
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => onDelete(expense.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Eliminar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
