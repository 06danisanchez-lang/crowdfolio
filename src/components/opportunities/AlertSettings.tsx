import { useState } from 'react';
import { Bell, Lock, Plus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
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

  // Split alerts into the two categories
  const simpleAlerts = alerts.filter(a => !!a.opportunityId);
  const criteriaAlerts = alerts.filter(a => !a.opportunityId);

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
            {t('subscription.alerts.simpleTitle')}
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
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Alertas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">

          {/* ── Section A: Simple alerts (Free + Pro) ────────────────────────── */}
          <div>
            <h3 className="text-sm font-semibold mb-1">{t('subscription.alerts.simpleTitle')}</h3>
            <p className="text-xs text-muted-foreground mb-3">
              {t('subscription.alerts.simpleEmpty')}
            </p>

            {simpleAlerts.length === 0 ? (
              <div className="text-center py-6 rounded-lg border-2 border-dashed text-muted-foreground">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">{t('subscription.alerts.simpleEmpty')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {simpleAlerts.map((alert) => (
                  <AlertCard
                    key={alert.id}
                    alert={alert}
                    onToggle={toggleAlert}
                    onDelete={(id) => setDeleteConfirmId(id)}
                  />
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* ── Section B: Criteria alerts (Pro only) ────────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold">{t('subscription.alerts.criteriaTitle')}</h3>
                {isPro && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t('subscription.alerts.criteriaEmpty')}
                  </p>
                )}
              </div>
              <Button
                onClick={handleCreateClick}
                size="sm"
                variant={isPro ? 'default' : 'outline'}
              >
                {isPro
                  ? <><Plus className="h-4 w-4 mr-1" />Nueva alerta</>
                  : <><Lock className="h-4 w-4 mr-1" />Nueva alerta</>
                }
              </Button>
            </div>

            {/* Free upgrade banner */}
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

            {criteriaAlerts.length === 0 ? (
              <div className="text-center py-6 rounded-lg border-2 border-dashed text-muted-foreground">
                <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">
                  {isPro
                    ? 'Sin alertas personalizadas. Crea tu primera alerta.'
                    : t('subscription.alerts.freeNote')}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {criteriaAlerts.map((alert) => (
                  <AlertCard
                    key={alert.id}
                    alert={alert}
                    onEdit={isPro ? handleEditClick : undefined}
                    onDelete={isPro ? (id) => setDeleteConfirmId(id) : undefined}
                    onToggle={isPro ? toggleAlert : undefined}
                  />
                ))}
              </div>
            )}
          </div>
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
