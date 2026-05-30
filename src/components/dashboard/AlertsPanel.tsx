import { useMemo } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Bell, 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  CalendarClock, 
  Clock, 
  Wallet,
  ChevronRight
} from 'lucide-react';
import { Alert, AlertType, AlertSeverity } from '@/hooks/useAlerts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

interface AlertsPanelProps {
  alerts: Alert[];
  alertCount: number;
  hasUrgentAlerts: boolean;
  onViewInvestment?: (investmentId: string) => void;
  variant?: 'icon' | 'full' | 'inline';
}

const severityConfig: Record<AlertSeverity, { 
  icon: typeof AlertCircle; 
  className: string;
  badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline';
}> = {
  danger: { 
    icon: AlertCircle, 
    className: 'text-destructive bg-destructive/10 border-destructive/20',
    badgeVariant: 'destructive'
  },
  warning: { 
    icon: AlertTriangle, 
    className: 'text-warning bg-warning/10 border-warning/20',
    badgeVariant: 'default'
  },
  info: { 
    icon: Info, 
    className: 'text-primary bg-primary/10 border-primary/20',
    badgeVariant: 'secondary'
  },
};

const typeConfig: Record<AlertType, { 
  icon: typeof CalendarClock; 
  label: string;
}> = {
  maturity: { icon: CalendarClock, label: 'Vencimiento' },
  overdue: { icon: Clock, label: 'Vencido' },
  'expected-payment': { icon: Wallet, label: 'Pago esperado' },
};

// Overdue alerts represent completed investment cycles — use green, not red
const overdueStyle = {
  card: 'bg-green-50 border-green-200 text-green-800',
  icon: 'text-green-600',
  badge: 'bg-green-100 text-green-700 border-0',
} as const;

function AlertItem({
  alert,
  onViewInvestment
}: {
  alert: Alert;
  onViewInvestment?: (id: string) => void;
}) {
  const isOverdue = alert.type === 'overdue';
  const severity = severityConfig[alert.severity];
  const type = typeConfig[alert.type];
  const SeverityIcon = severity.icon;
  const TypeIcon = type.icon;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div
      className={cn(
        "rounded-lg border p-3 transition-all hover:shadow-sm",
        isOverdue ? overdueStyle.card : severity.className
      )}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">
          <SeverityIcon className={cn("h-5 w-5", isOverdue && overdueStyle.icon)} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <span className="font-semibold">{alert.title}</span>
            {isOverdue ? (
              <Badge className={cn("text-xs", overdueStyle.badge)}>
                <TypeIcon className="mr-1 h-3 w-3" />
                {type.label}
              </Badge>
            ) : (
              <Badge variant={severity.badgeVariant} className="text-xs">
                <TypeIcon className="mr-1 h-3 w-3" />
                {type.label}
              </Badge>
            )}
          </div>
          <p className="mb-2 text-sm opacity-90">{alert.message}</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs opacity-75">
            <span className="font-medium">{alert.investmentName}</span>
            <span>{alert.platform}</span>
            <span>{formatCurrency(alert.amount)}</span>
            <span>{format(alert.date, 'dd MMM yyyy', { locale: es })}</span>
          </div>
        </div>
        {onViewInvestment && (
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 shrink-0"
            onClick={() => onViewInvestment(alert.investmentId)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

export function AlertsPanel({ 
  alerts, 
  alertCount, 
  hasUrgentAlerts,
  onViewInvestment,
  variant = 'icon'
}: AlertsPanelProps) {
  const groupedAlerts = useMemo(() => {
    const groups: Record<AlertType, Alert[]> = {
      overdue: [],
      maturity: [],
      'expected-payment': [],
    };
    alerts.forEach(alert => {
      groups[alert.type].push(alert);
    });
    return groups;
  }, [alerts]);

  const alertsContent = (
    <>
      {alertCount === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
          <Bell className="mb-3 h-10 w-10 opacity-20" />
          <p className="text-sm font-medium">Todo al día</p>
          <p className="text-xs">No hay alertas que requieran tu atención</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groupedAlerts.overdue.length > 0 && (
            <div>
              <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-green-700">
                <AlertCircle className="h-3.5 w-3.5 text-green-700" />
                Inversiones Vencidas ({groupedAlerts.overdue.length})
              </h4>
              <div className="space-y-2">
                {groupedAlerts.overdue.map(alert => (
                  <AlertItem key={alert.id} alert={alert} onViewInvestment={onViewInvestment} />
                ))}
              </div>
            </div>
          )}
          {groupedAlerts.maturity.length > 0 && (
            <div>
              <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-warning">
                <CalendarClock className="h-3.5 w-3.5" />
                Vencimientos Próximos ({groupedAlerts.maturity.length})
              </h4>
              <div className="space-y-2">
                {groupedAlerts.maturity.map(alert => (
                  <AlertItem key={alert.id} alert={alert} onViewInvestment={onViewInvestment} />
                ))}
              </div>
            </div>
          )}
          {groupedAlerts['expected-payment'].length > 0 && (
            <div>
              <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
                <Wallet className="h-3.5 w-3.5" />
                Pagos Esperados ({groupedAlerts['expected-payment'].length})
              </h4>
              <div className="space-y-2">
                {groupedAlerts['expected-payment'].map(alert => (
                  <AlertItem key={alert.id} alert={alert} onViewInvestment={onViewInvestment} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );

  if (variant === 'inline') {
    return alertsContent;
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        {variant === 'full' ? (
          <Button 
            variant="outline" 
            className={cn(
              "w-full justify-start",
              hasUrgentAlerts && "border-destructive/50 text-destructive"
            )}
          >
            <Bell className={cn("mr-2 h-4 w-4", hasUrgentAlerts && "text-destructive")} />
            Alertas
            {alertCount > 0 && (
              <span className={cn(
                "ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-bold text-white",
                hasUrgentAlerts ? "bg-destructive" : "bg-primary"
              )}>
                {alertCount > 9 ? '9+' : alertCount}
              </span>
            )}
          </Button>
        ) : (
          <Button variant="outline" size="icon" className="relative h-10 w-10">
            <Bell className={cn("h-5 w-5", hasUrgentAlerts && "text-destructive")} />
            {alertCount > 0 && (
              <span className={cn(
                "absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold text-white",
                hasUrgentAlerts ? "bg-destructive" : "bg-primary"
              )}>
                {alertCount > 9 ? '9+' : alertCount}
              </span>
            )}
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Alertas y Notificaciones
          </SheetTitle>
          <SheetDescription>
            {alertCount === 0 
              ? 'No tienes alertas pendientes'
              : `Tienes ${alertCount} alerta${alertCount !== 1 ? 's' : ''} pendiente${alertCount !== 1 ? 's' : ''}`
            }
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="mt-6 h-[calc(100vh-140px)]">
          <div className="pr-4">
            {alertsContent}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
