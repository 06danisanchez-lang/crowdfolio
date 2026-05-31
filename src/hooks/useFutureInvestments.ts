import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { FutureInvestment } from '@/types/futureInvestment';
import { Platform, Investment } from '@/types/investment';
import { toast } from 'sonner';

export function useFutureInvestments() {
  const { user } = useAuth();
  const [futureInvestments, setFutureInvestments] = useState<FutureInvestment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const requestIdRef = useRef(0);

  const fetchFutureInvestments = useCallback(async () => {
    if (!user) {
      setFutureInvestments([]);
      setIsLoading(false);
      return;
    }

    const currentId = ++requestIdRef.current;

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('future_investments')
        .select('*')
        .order('estimated_open_date', { ascending: true, nullsFirst: false });

      if (error) throw error;
      if (requestIdRef.current !== currentId) return;

      const mapped: FutureInvestment[] = (data || []).map((row: Record<string, unknown>) => ({
        id: row.id,
        platform: row.platform as Platform,
        customPlatformName: row.custom_platform_name || undefined,
        projectName: row.project_name,
        estimatedAmount: row.estimated_amount != null ? Number(row.estimated_amount) : null,
        expectedReturn: row.expected_return != null ? Number(row.expected_return) : null,
        estimatedOpenDate: row.estimated_open_date || undefined,
        estimatedEndDate: row.estimated_end_date || undefined,
        sourceUrl: row.source_url || undefined,
        notes: row.notes || undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));

      setFutureInvestments(mapped);
    } catch (err) {
      console.error('Error fetching future investments:', err);
    } finally {
      if (requestIdRef.current === currentId) setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchFutureInvestments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return () => { ++requestIdRef.current; };
  }, [fetchFutureInvestments]);

  const addFutureInvestment = useCallback(async (fi: Omit<FutureInvestment, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('future_investments')
      .insert({
        user_id: user.id,
        platform: fi.platform,
        custom_platform_name: fi.customPlatformName ?? null,
        project_name: fi.projectName,
        estimated_amount: fi.estimatedAmount ?? null,
        expected_return: fi.expectedReturn ?? null,
        estimated_open_date: fi.estimatedOpenDate ?? null,
        estimated_end_date: fi.estimatedEndDate ?? null,
        source_url: fi.sourceUrl ?? null,
        notes: fi.notes ?? null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding future investment:', error);
      toast.error('No se pudo guardar la inversión futura. Inténtalo de nuevo.');
      return null;
    }

    const newItem: FutureInvestment = {
      id: data.id,
      platform: data.platform as Platform,
      customPlatformName: data.custom_platform_name || undefined,
      projectName: data.project_name,
      estimatedAmount: data.estimated_amount != null ? Number(data.estimated_amount) : null,
      expectedReturn: data.expected_return != null ? Number(data.expected_return) : null,
      estimatedOpenDate: data.estimated_open_date || undefined,
      estimatedEndDate: data.estimated_end_date || undefined,
      sourceUrl: data.source_url || undefined,
      notes: data.notes || undefined,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
    setFutureInvestments(prev => [...prev, newItem].sort((a, b) => {
      if (!a.estimatedOpenDate) return 1;
      if (!b.estimatedOpenDate) return -1;
      return a.estimatedOpenDate.localeCompare(b.estimatedOpenDate);
    }));
    toast.success('Inversión futura guardada');
    return newItem;
  }, [user]);

  const updateFutureInvestment = useCallback(async (id: string, updates: Partial<FutureInvestment>) => {
    const dbUpdates: Record<string, unknown> = {};
    if (updates.platform !== undefined) dbUpdates.platform = updates.platform;
    if (updates.customPlatformName !== undefined) dbUpdates.custom_platform_name = updates.customPlatformName;
    if (updates.projectName !== undefined) dbUpdates.project_name = updates.projectName;
    if (updates.estimatedAmount !== undefined) dbUpdates.estimated_amount = updates.estimatedAmount;
    if (updates.expectedReturn !== undefined) dbUpdates.expected_return = updates.expectedReturn;
    if (updates.estimatedOpenDate !== undefined) dbUpdates.estimated_open_date = updates.estimatedOpenDate;
    if (updates.estimatedEndDate !== undefined) dbUpdates.estimated_end_date = updates.estimatedEndDate;
    if (updates.sourceUrl !== undefined) dbUpdates.source_url = updates.sourceUrl;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;

    const { error } = await supabase.from('future_investments').update(dbUpdates).eq('id', id);
    if (error) { console.error('Error updating future investment:', error); return; }
    setFutureInvestments(prev => prev.map(fi => fi.id === id ? { ...fi, ...updates, updatedAt: new Date().toISOString() } : fi));
  }, []);

  const deleteFutureInvestment = useCallback(async (id: string) => {
    const { error } = await supabase.from('future_investments').delete().eq('id', id);
    if (error) { console.error('Error deleting future investment:', error); return; }
    setFutureInvestments(prev => prev.filter(fi => fi.id !== id));
  }, []);

  const convertToReal = useCallback(async (
    futureId: string,
    realData: Omit<Investment, 'id' | 'createdAt' | 'updatedAt' | 'payments'>,
    addInvestment: (data: Omit<Investment, 'id' | 'createdAt' | 'updatedAt' | 'payments'>) => Promise<Investment | null>
  ) => {
    // Step 1: Create real investment
    const created = await addInvestment(realData);
    if (!created) {
      toast.error('Error al crear la inversión real');
      return false;
    }

    // Step 2: Delete future investment
    const { error } = await supabase.from('future_investments').delete().eq('id', futureId);
    if (error) {
      console.error('Error deleting future investment after conversion:', error);
      toast.warning('Inversión creada correctamente. No se pudo eliminar la inversión futura automáticamente.');
    } else {
      setFutureInvestments(prev => prev.filter(fi => fi.id !== futureId));
      toast.success('Inversión convertida correctamente');
    }

    return true;
  }, []);

  return {
    futureInvestments,
    isLoading,
    addFutureInvestment,
    updateFutureInvestment,
    deleteFutureInvestment,
    convertToReal,
    refetch: fetchFutureInvestments,
  };
}
