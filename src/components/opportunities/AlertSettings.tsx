import { useState } from 'react';
import { Bell, Plus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCard } from './AlertCard';
import { AlertForm } from './AlertForm';
import { useOpportunityAlerts } from '@/hooks/useOpportunityAlerts';
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

export function AlertSettings() {
  const { alerts, isLoading, createAlert, updateAlert, deleteAlert, toggleAlert } = useOpportunityAlerts();
  const [formOpen, setFormOpen] = useState(false);
  const [editingAlert, setEditingAlert] = useState<OpportunityAlert | undefined>();
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleCreateClick = () => {
    setEditingAlert(undefined);
    setFormOpen(true);
  };

  const handleEditClick = (alert: OpportunityAlert) => {
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
                Recibe notificaciones cuando se publiquen proyectos que coincidan con tus criterios
              </CardDescription>
            </div>
            <Button onClick={handleCreateClick} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Nueva Alerta
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Sparkles className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium mb-1">Sin alertas configuradas</p>
              <p className="text-sm">Crea tu primera alerta para recibir notificaciones personalizadas</p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <AlertCard
                  key={alert.id}
                  alert={alert}
                  onEdit={handleEditClick}
                  onDelete={(id) => setDeleteConfirmId(id)}
                  onToggle={toggleAlert}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertForm
        open={formOpen}
        onOpenChange={setFormOpen}
        alert={editingAlert}
        onSubmit={handleFormSubmit}
      />

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
