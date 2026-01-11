import { useMemo } from 'react';
import { Investment } from '@/types/investment';
import { format, parseISO, addMonths, differenceInMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarClock } from 'lucide-react';

interface UpcomingMaturityListProps {
  investments: Investment[];
}

export function UpcomingMaturityList({ investments }: UpcomingMaturityListProps) {
  const upcomingMaturities = useMemo(() => {
    const now = new Date();
    const sixMonthsFromNow = addMonths(now, 6);

    return investments
      .filter(inv => 
        inv.status === 'active' && 
        inv.expectedEndDate &&
        parseISO(inv.expectedEndDate) >= now &&
        parseISO(inv.expectedEndDate) <= sixMonthsFromNow
      )
      .map(inv => ({
        ...inv,
        endDate: parseISO(inv.expectedEndDate!),
        monthsRemaining: differenceInMonths(parseISO(inv.expectedEndDate!), now),
      }))
      .sort((a, b) => a.endDate.getTime() - b.endDate.getTime())
      .slice(0, 5);
  }, [investments]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (upcomingMaturities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
        <CalendarClock className="mb-2 h-8 w-8" />
        <p>No hay vencimientos próximos</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {upcomingMaturities.map(investment => (
        <div
          key={investment.id}
          className="flex items-center justify-between rounded-lg border bg-card p-3 transition-colors hover:bg-accent/50"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{investment.projectName}</p>
            <p className="text-sm text-muted-foreground">
              {format(investment.endDate, 'dd MMM yyyy', { locale: es })}
            </p>
          </div>
          <div className="ml-4 text-right">
            <p className="font-semibold">{formatCurrency(investment.amount)}</p>
            <p className="text-xs text-muted-foreground">
              {investment.monthsRemaining === 0 
                ? 'Este mes' 
                : `${investment.monthsRemaining} ${investment.monthsRemaining === 1 ? 'mes' : 'meses'}`}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
