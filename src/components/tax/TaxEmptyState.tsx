import { BarChart3 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface TaxEmptyStateProps {
  year: number;
}

export function TaxEmptyState({ year }: TaxEmptyStateProps) {
  const currentYear = new Date().getFullYear();
  const isFutureOrCurrentYear = year >= currentYear;

  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <BarChart3 className="h-8 w-8 text-muted-foreground" />
        </div>
        
        <h3 className="text-lg font-semibold mb-2">
          {isFutureOrCurrentYear
            ? `Aún no tienes liquidaciones registradas en ${year}`
            : `No tienes liquidaciones registradas en ${year}`}
        </h3>
        
        <p className="text-muted-foreground max-w-md">
          {isFutureOrCurrentYear
            ? '¡Es un buen momento para planificar tus próximas inversiones!'
            : 'Puedes añadir gastos deducibles si procede.'}
        </p>
      </CardContent>
    </Card>
  );
}
