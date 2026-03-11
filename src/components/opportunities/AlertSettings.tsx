import { useState } from 'react';
import { Bell, Lock, Plus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCard } from './AlertCard';
import { AlertForm } from './AlertForm';
import { useOpportunityAlerts } from '@/hooks/useOpportunityAlerts';
import { useLanguage } from '@/contexts/LanguageContext';
import { OpportunityAlert, OpportunityAlertFormData } from '@/types/opportunityAlert';
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

interface AlertSettingsProps {
  isPro?: boolean;
  onProRequired?: () => void;
}

export function AlertSettings({ isPro = false, onProRequired }: AlertSettingsProps) {
  const { alerts, isLoading, createAlert, updateAlert, deleteAlert, toggleAlert } = useOpportunityAlerts();
  const { t } = useLanguage();
  const [formOpen, setFormOpen] = useState(false);
  const [editingAlert, setEditingAlert] = useState<OpportunityAlert | undefined>();
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleCreateClick = () => {
    if (!isPro) {
      onProRequired?.();
      return;
    }
    setEditingAlert(undefined);
    setFormOpen(true);
  };

  const handleEditClick = (alert: OpportunityAlert) => {
    if (!isPro) {
      onProRequired?.();
      return;
    }
    setEditingAlert(alert);
    setFormOpen(true);
  };

  const handleFormSubmit = async (data: OpportunityAlertFormData): Promise<boolean> => {
    if (editingAlert) {
      return await updateAlert(editingAlert.id, data);
    }
    return await createAlert(data);
  };

  const handleDeleteConfirm = async () => {
    if (deleteConfirmId) {
      await deleteAlert(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Mis Alertas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Mis Alertas de Oportunidades
              </CardTitle>
              <CardDescription>
                {isPro
                  ? 'Recibe notificaciones cuando se publiquen proyectos que coincidan con tus criterios'
                  : t('subscription.alerts.freeNote')}
              </CardDescription>
            </div>
            <Button onClick={handleCreateClick} size="sm" variant={isPro ? 'default' : 'outline'}>
              {isPro ? <Plus className="h-4 w-4 mr-1" /> : <Lock className="h-4 w-4 mr-1" />}
              Nueva Alerta
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Free-user upgrade banner */}
          {!isPro && (
            <div className="mb-4 rounded-lg border bg-muted/40 p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="flex-1">
                <p className="text-sm font-medium">{t('subscription.alerts.freeNote')}</p>
                <p className="text-sm text-muted-foreground">{t('subscription.alerts.upgradeDesc')}</p>
              </div>
              <Button size="sm" onClick={onProRequired} className="shrink-0">
                {t('subscription.alerts.upgradeCta')}
              </Button>
            </div>
          )}

          {alerts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Sparkles className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium mb-1">Sin alertas configuradas</p>
              {isPro && (
                <p className="text-sm">Crea tu primera alerta para recibir notificaciones personalizadas</p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <AlertCard
                  key={alert.id}
                  alert={alert}
                  onEdit={handleEditClick}
                  onDelete={isPro ? (id) => setDeleteConfirmId(id) : undefined}
                  onToggle={isPro ? toggleAlert : undefined}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {isPro && (
        <AlertForm
          open={formOpen}
          onOpenChange={setFormOpen}
          alert={editingAlert}
          onSubmit={handleFormSubmit}
        />
      )}

      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta alerta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Dejarás de recibir notificaciones basadas en esta alerta.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
