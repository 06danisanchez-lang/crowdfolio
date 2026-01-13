import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Asset, AssetRow, assetFromRow, AssetType } from '@/types/asset';

export function useAssets() {
  const { user } = useAuth();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAssets = useCallback(async () => {
    if (!user) {
      setAssets([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('assets')
        .select('*')
        .eq('user_id', user.id)
        .order('investment_date', { ascending: false });

      if (error) throw error;

      const mappedAssets = (data as AssetRow[]).map(assetFromRow);
      setAssets(mappedAssets);
    } catch (error) {
      console.error('Error fetching assets:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los activos',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  const addAsset = async (asset: Omit<Asset, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('assets')
        .insert({
          user_id: user.id,
          platform_name: asset.platformName,
          project_name: asset.projectName,
          country_code: asset.countryCode,
          asset_type: asset.assetType as AssetType,
          acquisition_cost: asset.acquisitionCost,
          investment_date: asset.investmentDate,
          expected_end_date: asset.expectedEndDate || null,
          expected_return: asset.expectedReturn,
          status: asset.status,
          notes: asset.notes || null,
        })
        .select()
        .single();

      if (error) throw error;

      const newAsset = assetFromRow(data as AssetRow);
      setAssets((prev) => [newAsset, ...prev]);
      
      toast({
        title: 'Activo añadido',
        description: `${asset.projectName} ha sido registrado correctamente`,
      });
      
      return newAsset;
    } catch (error) {
      console.error('Error adding asset:', error);
      toast({
        title: 'Error',
        description: 'No se pudo añadir el activo',
        variant: 'destructive',
      });
      return null;
    }
  };

  const updateAsset = async (id: string, updates: Partial<Omit<Asset, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>) => {
    try {
      const updateData: Record<string, unknown> = {};
      
      if (updates.platformName !== undefined) updateData.platform_name = updates.platformName;
      if (updates.projectName !== undefined) updateData.project_name = updates.projectName;
      if (updates.countryCode !== undefined) updateData.country_code = updates.countryCode;
      if (updates.assetType !== undefined) updateData.asset_type = updates.assetType;
      if (updates.acquisitionCost !== undefined) updateData.acquisition_cost = updates.acquisitionCost;
      if (updates.investmentDate !== undefined) updateData.investment_date = updates.investmentDate;
      if (updates.expectedEndDate !== undefined) updateData.expected_end_date = updates.expectedEndDate;
      if (updates.expectedReturn !== undefined) updateData.expected_return = updates.expectedReturn;
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.notes !== undefined) updateData.notes = updates.notes;

      const { data, error } = await supabase
        .from('assets')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      const updatedAsset = assetFromRow(data as AssetRow);
      setAssets((prev) => prev.map((a) => (a.id === id ? updatedAsset : a)));
      
      toast({
        title: 'Activo actualizado',
        description: 'Los cambios se han guardado correctamente',
      });
      
      return updatedAsset;
    } catch (error) {
      console.error('Error updating asset:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el activo',
        variant: 'destructive',
      });
      return null;
    }
  };

  const deleteAsset = async (id: string) => {
    try {
      const { error } = await supabase
        .from('assets')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setAssets((prev) => prev.filter((a) => a.id !== id));
      
      toast({
        title: 'Activo eliminado',
        description: 'El activo y sus transacciones han sido eliminados',
      });
      
      return true;
    } catch (error) {
      console.error('Error deleting asset:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el activo',
        variant: 'destructive',
      });
      return false;
    }
  };

  // Computed values
  const totalInvested = assets.reduce((sum, a) => sum + a.acquisitionCost, 0);
  const lendingAssets = assets.filter((a) => a.assetType === 'LENDING');
  const equityAssets = assets.filter((a) => a.assetType === 'EQUITY');
  const foreignAssets = assets.filter((a) => a.countryCode !== 'ES');
  const foreignAssetsValue = foreignAssets.reduce((sum, a) => sum + a.acquisitionCost, 0);

  return {
    assets,
    isLoading,
    addAsset,
    updateAsset,
    deleteAsset,
    refetch: fetchAssets,
    // Computed
    totalInvested,
    lendingAssets,
    equityAssets,
    foreignAssets,
    foreignAssetsValue,
  };
}
