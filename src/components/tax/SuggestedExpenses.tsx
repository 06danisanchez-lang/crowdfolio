import { useState } from 'react';
import { Percent, Briefcase, Calculator, Car, FileText, Plus, Lightbulb } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SUGGESTED_EXPENSES, SuggestedExpense, DEDUCTIBLE_INFO } from '@/lib/tax/suggestedExpenses';
import { TaxExpenseCategory } from '@/types/tax';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface SuggestedExpensesProps {
  onAddSuggested: (category: TaxExpenseCategory, description: string) => void;
  showAsEmptyState?: boolean;
}

const iconMap = {
  percent: Percent,
  briefcase: Briefcase,
  calculator: Calculator,
  car: Car,
  file: FileText,
};

const categoryColors: Record<TaxExpenseCategory, string> = {
  platform_fees: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  advisory: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  management: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  travel: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  other: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
};

function SuggestedExpenseCard({ 
  expense, 
  onAdd 
}: { 
  expense: SuggestedExpense; 
  onAdd: (category: TaxExpenseCategory, description: string) => void;
}) {
  const Icon = iconMap[expense.icon];

  return (
    <Card className="group hover:border-primary/50 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-muted p-2 group-hover:bg-primary/10 transition-colors">
            <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="font-medium text-sm">{expense.title}</h4>
                <p className="text-xs text-muted-foreground mt-0.5">{expense.hint}</p>
              </div>
              <Badge 
                variant="secondary" 
                className={`${categoryColors[expense.category]} text-xs shrink-0`}
              >
                {expense.category === 'platform_fees' ? 'Comisión' :
                 expense.category === 'advisory' ? 'Asesoría' :
                 expense.category === 'management' ? 'Gestión' :
                 expense.category === 'travel' ? 'Viaje' : 'Otro'}
              </Badge>
            </div>
            {expense.examples.length > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                Ej: {expense.examples.slice(0, 3).join(', ')}
              </p>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 h-7 text-xs"
              onClick={() => onAdd(expense.category, expense.description)}
            >
              <Plus className="h-3 w-3 mr-1" />
              Añadir este gasto
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function SuggestedExpenses({ onAddSuggested, showAsEmptyState = false }: SuggestedExpensesProps) {
  const [showAll, setShowAll] = useState(false);
  
  const visibleExpenses = showAll ? SUGGESTED_EXPENSES : SUGGESTED_EXPENSES.slice(0, 4);

  if (showAsEmptyState) {
    return (
      <div className="space-y-4">
        <div className="text-center py-4">
          <Lightbulb className="h-10 w-10 text-muted-foreground/50 mx-auto" />
          <h3 className="font-medium mt-3">¿Sabías que puedes deducir estos gastos?</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Haz clic en cualquiera para añadirlo rápidamente
          </p>
        </div>
        
        <div className="grid gap-3 sm:grid-cols-2">
          {SUGGESTED_EXPENSES.slice(0, 4).map((expense) => (
            <SuggestedExpenseCard
              key={expense.id}
              expense={expense}
              onAdd={onAddSuggested}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Lightbulb className="h-5 w-5 text-amber-500" />
          Gastos Deducibles Sugeridos
        </CardTitle>
        <CardDescription>
          Haz clic en cualquier gasto para añadirlo con los datos pre-rellenados
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Info about deductible expenses */}
        <Alert>
          <Lightbulb className="h-4 w-4" />
          <AlertTitle>¿Qué puedo deducir?</AlertTitle>
          <AlertDescription className="mt-2">
            <div className="grid gap-4 sm:grid-cols-2 text-xs">
              <div>
                <p className="font-medium text-green-600 dark:text-green-400 mb-1">✓ Deducibles:</p>
                <ul className="space-y-0.5 text-muted-foreground">
                  {DEDUCTIBLE_INFO.allowed.map((item, i) => (
                    <li key={i}>• {item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-medium text-red-600 dark:text-red-400 mb-1">✗ No deducibles:</p>
                <ul className="space-y-0.5 text-muted-foreground">
                  {DEDUCTIBLE_INFO.notAllowed.map((item, i) => (
                    <li key={i}>• {item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </AlertDescription>
        </Alert>

        {/* Suggested expenses grid */}
        <div className="grid gap-3 sm:grid-cols-2">
          {visibleExpenses.map((expense) => (
            <SuggestedExpenseCard
              key={expense.id}
              expense={expense}
              onAdd={onAddSuggested}
            />
          ))}
        </div>

        {!showAll && SUGGESTED_EXPENSES.length > 4 && (
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => setShowAll(true)}
          >
            Ver todos los gastos sugeridos ({SUGGESTED_EXPENSES.length - 4} más)
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
