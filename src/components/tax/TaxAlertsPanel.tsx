import { TaxAlert } from '@/types/taxCalculation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Bell, AlertTriangle, Info, AlertCircle, ExternalLink, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TaxAlertsPanelProps {
  alerts: TaxAlert[];
}

export function TaxAlertsPanel({ alerts }: TaxAlertsPanelProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getAlertIcon = (severity: TaxAlert['severity']) => {
    switch (severity) {
      case 'error':
        return <AlertCircle className="h-5 w-5" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5" />;
      case 'info':
        return <Info className="h-5 w-5" />;
    }
  };

  const getAlertStyles = (severity: TaxAlert['severity']) => {
    switch (severity) {
      case 'error':
        return 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30 [&>svg]:text-red-600';
      case 'warning':
        return 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30 [&>svg]:text-amber-600';
      case 'info':
        return 'border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30 [&>svg]:text-blue-600';
    }
  };

  const getTitleStyles = (severity: TaxAlert['severity']) => {
    switch (severity) {
      case 'error':
        return 'text-red-800 dark:text-red-200';
      case 'warning':
        return 'text-amber-800 dark:text-amber-200';
      case 'info':
        return 'text-blue-800 dark:text-blue-200';
    }
  };

  const getDescriptionStyles = (severity: TaxAlert['severity']) => {
    switch (severity) {
      case 'error':
        return 'text-red-700 dark:text-red-300';
      case 'warning':
        return 'text-amber-700 dark:text-amber-300';
      case 'info':
        return 'text-blue-700 dark:text-blue-300';
    }
  };

  // Sort alerts by severity (error > warning > info)
  const sortedAlerts = [...alerts].sort((a, b) => {
    const severityOrder = { error: 0, warning: 1, info: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });

  if (alerts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Alertas Fiscales
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
            <h3 className="font-semibold text-lg mb-1">Todo en orden</h3>
            <p className="text-sm text-muted-foreground">
              No hay alertas fiscales pendientes para este ejercicio.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Alertas Fiscales
          <span className="ml-auto text-sm font-normal text-muted-foreground">
            {alerts.length} alerta{alerts.length !== 1 ? 's' : ''}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {sortedAlerts.map((alert, index) => (
          <Alert key={`${alert.type}-${index}`} className={cn(getAlertStyles(alert.severity))}>
            {getAlertIcon(alert.severity)}
            <AlertTitle className={cn('font-semibold', getTitleStyles(alert.severity))}>
              {alert.title}
            </AlertTitle>
            <AlertDescription className={cn('mt-1', getDescriptionStyles(alert.severity))}>
              <p>{alert.message}</p>
              {alert.currentValue !== undefined && alert.threshold !== undefined && (
                <p className="mt-2 text-sm font-medium">
                  Valor actual: {formatCurrency(alert.currentValue)} / Umbral: {formatCurrency(alert.threshold)}
                </p>
              )}
              {alert.type === 'MODELO_720' && (
                <Button variant="link" className="h-auto p-0 mt-2" asChild>
                  <a
                    href="https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI34.shtml"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1"
                  >
                    Más información sobre Modelo 720
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </Button>
              )}
            </AlertDescription>
          </Alert>
        ))}

        {/* Summary section */}
        <div className="pt-4 border-t text-sm text-muted-foreground">
          <p>
            <strong>Nota:</strong> Estas alertas son orientativas. Consulta con un asesor fiscal 
            para tu situación particular.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
