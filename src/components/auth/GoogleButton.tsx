import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5 mr-2" aria-hidden="true">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
);

export function GoogleButton() {
  const { signInWithGoogle } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      // Detectar si estamos en un dominio personalizado
      const isCustomDomain = 
        !window.location.hostname.includes('lovable.app') &&
        !window.location.hostname.includes('lovableproject.com');

      if (isCustomDomain) {
        // Para dominios personalizados, usar supabase directamente
        // con skipBrowserRedirect para evitar el auth-bridge
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: `${window.location.origin}/`,
            skipBrowserRedirect: true,
          },
        });

        if (error) throw error;

        // Validar URL OAuth antes de redirigir (seguridad)
        if (data?.url) {
          const oauthUrl = new URL(data.url);
          const allowedHosts = [
            'accounts.google.com',
            'vqazrgwjcglnqrmdcjdm.supabase.co',
          ];
          if (!allowedHosts.some(host => oauthUrl.hostname.includes(host))) {
            throw new Error('URL de OAuth inválida');
          }
          window.location.href = data.url;
        } else {
          throw new Error('No se recibió URL de OAuth');
        }
      } else {
        // Para dominios Lovable, usar el flujo normal con lovable auth
        const result = await signInWithGoogle();
        if (result.error) {
          throw result.error;
        }
      }
    } catch (err) {
      // Mostrar mensaje de error más detallado
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      toast.error(`Error: ${errorMessage}`);
      console.error('Google sign in error details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full bg-white hover:bg-gray-50 text-gray-700 border-gray-300"
      onClick={handleGoogleSignIn}
      disabled={isLoading}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Conectando...
        </>
      ) : (
        <>
          <GoogleIcon />
          Continuar con Google
        </>
      )}
    </Button>
  );
}
