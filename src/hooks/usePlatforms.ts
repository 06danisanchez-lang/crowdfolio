import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { UserPlatform, UserPlatformFormData } from '@/types/userPlatform';

const FETCH_TIMEOUT_MS = 15_000;

export function usePlatforms() {
  const { user } = useAuth();
  const [platforms, setPlatforms] = useState<UserPlatform[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const fetchPlatforms = useCallback(async () => {
    if (!user) {
      setPlatforms([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    const currentId = ++requestIdRef.current;

    const timeoutId = setTimeout(() => {
      if (requestIdRef.current !== currentId) return;
      setIsLoading(false);
      setError('Timeout: la carga de plataformas tardó demasiado');
    }, FETCH_TIMEOUT_MS);

    try {
      setIsLoading(true);
      setError(null);
      const { data, error: dbError } = await supabase
        .from('user_platforms')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true });

      clearTimeout(timeoutId);
      if (requestIdRef.current !== currentId) return;

      if (dbError) throw dbError;

      const mappedPlatforms: UserPlatform[] = (data || []).map((row) => ({
        id: row.id,
        userId: row.user_id,
        name: row.name,
        countryCode: row.country_code,
        platformType: row.platform_type,
        websiteUrl: row.website_url || undefined,
        registrationDate: row.registration_date || undefined,
        status: row.status,
        username: row.username || undefined,
        notes: row.notes || undefined,
        defaultWithholding: Number(row.default_withholding) || 19,
        logoUrl: row.logo_url || undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));

      setPlatforms(mappedPlatforms);
    } catch (err) {
      clearTimeout(timeoutId);
      if (requestIdRef.current !== currentId) return;
      const msg = err instanceof Error ? err.message : 'Error al cargar las plataformas';
      console.error('Error fetching platforms:', err);
      setError(msg);
      toast.error('Error al cargar las plataformas');
    } finally {
      clearTimeout(timeoutId);
      if (requestIdRef.current === currentId) {
        setIsLoading(false);
      }
    }
  }, [user]);

  useEffect(() => {
    fetchPlatforms();
    return () => { ++requestIdRef.current; };
  }, [fetchPlatforms]);

  const createPlatform = async (formData: UserPlatformFormData): Promise<boolean> => {
    if (!user) { toast.error('Debes iniciar sesión'); return false; }
    try {
      const { error } = await supabase.from('user_platforms').insert({
        user_id: user.id, name: formData.name, country_code: formData.countryCode,
        platform_type: formData.platformType, website_url: formData.websiteUrl || null,
        registration_date: formData.registrationDate || null, status: formData.status,
        username: formData.username || null, notes: formData.notes || null,
        default_withholding: formData.defaultWithholding,
      });
      if (error) throw error;
      toast.success('Plataforma añadida correctamente');
      await fetchPlatforms();
      return true;
    } catch (error: any) {
      console.error('Error creating platform:', error);
      if (error.code === '23505') { toast.error('Ya tienes una plataforma con ese nombre'); }
      else { toast.error('Error al crear la plataforma'); }
      return false;
    }
  };

  const updatePlatform = async (id: string, formData: UserPlatformFormData): Promise<boolean> => {
    if (!user) { toast.error('Debes iniciar sesión'); return false; }
    try {
      const { error } = await supabase.from('user_platforms').update({
        name: formData.name, country_code: formData.countryCode,
        platform_type: formData.platformType, website_url: formData.websiteUrl || null,
        registration_date: formData.registrationDate || null, status: formData.status,
        username: formData.username || null, notes: formData.notes || null,
        default_withholding: formData.defaultWithholding,
      }).eq('id', id).eq('user_id', user.id);
      if (error) throw error;
      toast.success('Plataforma actualizada');
      await fetchPlatforms();
      return true;
    } catch (error: any) {
      console.error('Error updating platform:', error);
      if (error.code === '23505') { toast.error('Ya tienes una plataforma con ese nombre'); }
      else { toast.error('Error al actualizar la plataforma'); }
      return false;
    }
  };

  const deletePlatform = async (id: string): Promise<boolean> => {
    if (!user) { toast.error('Debes iniciar sesión'); return false; }
    try {
      const { error } = await supabase.from('user_platforms').delete().eq('id', id).eq('user_id', user.id);
      if (error) throw error;
      toast.success('Plataforma eliminada');
      await fetchPlatforms();
      return true;
    } catch (error) {
      console.error('Error deleting platform:', error);
      toast.error('Error al eliminar la plataforma');
      return false;
    }
  };

  return {
    platforms, isLoading, error,
    createPlatform, updatePlatform, deletePlatform,
    refetch: fetchPlatforms,
  };
}
