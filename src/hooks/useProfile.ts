import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function useProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, avatar_url, email, email_notifications')
        .eq('id', user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const updateProfile = useMutation({
    mutationFn: async (fullName: string) => {
      if (!user) throw new Error('No user');
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName })
        .eq('id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
      toast.success('Perfil actualizado');
    },
    onError: () => toast.error('Error al actualizar el perfil'),
  });

  const setEmailNotifications = useMutation({
    mutationFn: async (enabled: boolean) => {
      if (!user) throw new Error('No user');
      const { error } = await supabase
        .from('profiles')
        .update({ email_notifications: enabled })
        .eq('id', user.id);
      if (error) throw error;
      return enabled;
    },
    onSuccess: (enabled) => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
      toast.success(enabled ? 'Avisos por correo activados' : 'Avisos por correo desactivados');
    },
    onError: () => toast.error('No se ha podido guardar el cambio'),
  });

  const uploadAvatar = useMutation({
    mutationFn: async (file: File) => {
      if (!user) throw new Error('No user');
      const ext = file.name.split('.').pop();
      const path = `${user.id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(path);

      // Add cache buster
      const avatarUrl = `${publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', user.id);
      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
      toast.success('Foto de perfil actualizada');
    },
    onError: () => toast.error('Error al subir la foto'),
  });

  const removeAvatar = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('No user');

      // List and delete all files in user folder
      const { data: files } = await supabase.storage
        .from('avatars')
        .list(user.id);

      if (files && files.length > 0) {
        const paths = files.map(f => `${user.id}/${f.name}`);
        await supabase.storage.from('avatars').remove(paths);
      }

      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
      toast.success('Foto de perfil eliminada');
    },
    onError: () => toast.error('Error al eliminar la foto'),
  });

  return {
    profile,
    isLoading,
    displayName: profile?.full_name || profile?.email || user?.email || '',
    avatarUrl: profile?.avatar_url || null,
    emailNotifications: profile?.email_notifications ?? true,
    updateProfile,
    setEmailNotifications,
    uploadAvatar,
    removeAvatar,
  };
}
