import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { OpportunityAlert, OpportunityAlertFormData } from '@/types/opportunityAlert';
import { toast } from 'sonner';

const FETCH_TIMEOUT_MS = 15_000;

export function useOpportunityAlerts() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<OpportunityAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const fetchAlerts = useCallback(async () => {
    if (!user) {
      setAlerts([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    const currentId = ++requestIdRef.current;

    const timeoutId = setTimeout(() => {
      if (requestIdRef.current !== currentId) return;
      setIsLoading(false);
      setError('Timeout: la carga de alertas tardó demasiado');
    }, FETCH_TIMEOUT_MS);

    try {
      setIsLoading(true);
      setError(null);
      const { data, error: dbError } = await supabase
        .from('opportunity_alerts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      clearTimeout(timeoutId);
      if (requestIdRef.current !== currentId) return;
      if (dbError) throw dbError;

      const mappedAlerts: OpportunityAlert[] = (data || []).map((row) => ({
        id: row.id, userId: row.user_id, name: row.name, enabled: row.enabled,
        minReturn: row.min_return ?? undefined, maxReturn: row.max_return ?? undefined,
        platforms: (row.platforms || []) as OpportunityAlert['platforms'],
        projectTypes: (row.project_types || []) as OpportunityAlert['projectTypes'],
        riskLevels: (row.risk_levels || []) as OpportunityAlert['riskLevels'],
        maxTerm: row.max_term ?? undefined, maxMinInvestment: row.max_min_investment ?? undefined,
        locations: row.locations || [], createdAt: row.created_at, updatedAt: row.updated_at,
      }));
      setAlerts(mappedAlerts);
    } catch (err) {
      clearTimeout(timeoutId);
      if (requestIdRef.current !== currentId) return;
      console.error('Error fetching alerts:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar las alertas');
      toast.error('Error al cargar las alertas');
    } finally {
      clearTimeout(timeoutId);
      if (requestIdRef.current === currentId) {
        setIsLoading(false);
      }
    }
  }, [user]);

  useEffect(() => {
    fetchAlerts();
    return () => { ++requestIdRef.current; };
  }, [fetchAlerts]);

  const createAlert = async (formData: OpportunityAlertFormData): Promise<boolean> => {
    if (!user) return false;
    try {
      const { error } = await supabase.from('opportunity_alerts').insert({
        user_id: user.id, name: formData.name, enabled: formData.enabled,
        min_return: formData.minReturn ?? null, max_return: formData.maxReturn ?? null,
        platforms: formData.platforms, project_types: formData.projectTypes,
        risk_levels: formData.riskLevels, max_term: formData.maxTerm ?? null,
        max_min_investment: formData.maxMinInvestment ?? null, locations: formData.locations,
      });
      if (error) throw error;
      toast.success('Alerta creada correctamente');
      await fetchAlerts();
      return true;
    } catch (error) {
      console.error('Error creating alert:', error);
      toast.error('Error al crear la alerta');
      return false;
    }
  };

  const updateAlert = async (id: string, formData: OpportunityAlertFormData): Promise<boolean> => {
    if (!user) return false;
    try {
      const { error } = await supabase.from('opportunity_alerts').update({
        name: formData.name, enabled: formData.enabled,
        min_return: formData.minReturn ?? null, max_return: formData.maxReturn ?? null,
        platforms: formData.platforms, project_types: formData.projectTypes,
        risk_levels: formData.riskLevels, max_term: formData.maxTerm ?? null,
        max_min_investment: formData.maxMinInvestment ?? null, locations: formData.locations,
      }).eq('id', id).eq('user_id', user.id);
      if (error) throw error;
      toast.success('Alerta actualizada correctamente');
      await fetchAlerts();
      return true;
    } catch (error) {
      console.error('Error updating alert:', error);
      toast.error('Error al actualizar la alerta');
      return false;
    }
  };

  const deleteAlert = async (id: string): Promise<boolean> => {
    if (!user) return false;
    try {
      const { error } = await supabase.from('opportunity_alerts').delete().eq('id', id).eq('user_id', user.id);
      if (error) throw error;
      toast.success('Alerta eliminada correctamente');
      await fetchAlerts();
      return true;
    } catch (error) {
      console.error('Error deleting alert:', error);
      toast.error('Error al eliminar la alerta');
      return false;
    }
  };

  const toggleAlert = async (id: string, enabled: boolean): Promise<boolean> => {
    if (!user) return false;
    try {
      const { error } = await supabase.from('opportunity_alerts').update({ enabled }).eq('id', id).eq('user_id', user.id);
      if (error) throw error;
      toast.success(enabled ? 'Alerta activada' : 'Alerta desactivada');
      await fetchAlerts();
      return true;
    } catch (error) {
      console.error('Error toggling alert:', error);
      toast.error('Error al cambiar el estado de la alerta');
      return false;
    }
  };

  return {
    alerts, isLoading, error,
    createAlert, updateAlert, deleteAlert, toggleAlert,
    refetch: fetchAlerts,
  };
}
