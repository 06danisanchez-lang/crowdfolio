import { BarChart3, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

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
        
        <p className="text-muted-foreground max-w-md mb-6">
          {isFutureOrCurrentYear
            ? '¡Es un buen momento para planificar tus próximas inversiones!'
            : 'Puedes añadir gastos deducibles si procede.'}
        </p>

        {isFutureOrCurrentYear && (
          <Button asChild>
            <Link to="/opportunities" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Ver Oportunidades
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
