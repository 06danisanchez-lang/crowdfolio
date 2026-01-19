import { useState, useMemo } from 'react';
import { Plus, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
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
import { usePlatforms } from '@/hooks/usePlatforms';
import { useInvestments } from '@/hooks/useInvestments';
import { PlatformCard } from './PlatformCard';
import { PlatformForm } from './PlatformForm';
import { UserPlatform, UserPlatformFormData } from '@/types/userPlatform';

export function PlatformList() {
  const { platforms, isLoading, createPlatform, updatePlatform, deletePlatform } = usePlatforms();
  const { investments } = useInvestments();
  const [formOpen, setFormOpen] = useState(false);
  const [editingPlatform, setEditingPlatform] = useState<UserPlatform | undefined>();
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Calculate investment stats per platform
  const platformStats = useMemo(() => {
    const stats: Record<string, { count: number; total: number }> = {};
    
    investments.forEach((inv) => {
      const platformName = inv.customPlatformName || inv.platform;
      const normalizedName = platformName.toLowerCase();
      
      platforms.forEach((p) => {
        if (p.name.toLowerCase() === normalizedName) {
          if (!stats[p.id]) {
            stats[p.id] = { count: 0, total: 0 };
          }
          if (inv.status === 'active' || inv.status === 'pending') {
            stats[p.id].count += 1;
            stats[p.id].total += inv.amount;
          }
        }
      });
    });
    
    return stats;
  }, [platforms, investments]);

  const handleCreateClick = () => {
    setEditingPlatform(undefined);
    setFormOpen(true);
  };

  const handleEditClick = (platform: UserPlatform) => {
    setEditingPlatform(platform);
    setFormOpen(true);
  };

  const handleFormSubmit = async (data: UserPlatformFormData): Promise<boolean> => {
    if (editingPlatform) {
      return updatePlatform(editingPlatform.id, data);
    }
    return createPlatform(data);
  };

  const handleDeleteConfirm = async () => {
    if (deleteConfirmId) {
      await deletePlatform(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Mis Plataformas
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
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Mis Plataformas
          </CardTitle>
          <Button onClick={handleCreateClick} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Añadir Plataforma
          </Button>
        </CardHeader>
        <CardContent>
          {platforms.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No tienes plataformas registradas</p>
              <p className="text-sm mt-1">
                Añade las plataformas de crowdfunding donde estás dado de alta
              </p>
              <Button onClick={handleCreateClick} className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Añadir Primera Plataforma
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {platforms.map((platform) => (
                <PlatformCard
                  key={platform.id}
                  platform={platform}
                  investmentCount={platformStats[platform.id]?.count || 0}
                  totalInvested={platformStats[platform.id]?.total || 0}
                  onEdit={handleEditClick}
                  onDelete={setDeleteConfirmId}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <PlatformForm
        open={formOpen}
        onOpenChange={setFormOpen}
        platform={editingPlatform}
        onSubmit={handleFormSubmit}
      />

      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar plataforma?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La plataforma será eliminada de tu repositorio.
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
