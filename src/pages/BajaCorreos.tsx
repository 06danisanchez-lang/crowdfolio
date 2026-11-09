import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

type Estado = 'cargando' | 'hecho' | 'invalido' | 'error';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Baja de los avisos por correo desde el enlace del propio correo, sin iniciar
 * sesión. La clave (profiles.email_unsubscribe_token) identifica al usuario.
 */
const BajaCorreos = () => {
  const [params] = useSearchParams();
  const token = params.get('t') ?? '';
  const [estado, setEstado] = useState<Estado>(UUID.test(token) ? 'cargando' : 'invalido');

  useEffect(() => {
    if (!UUID.test(token)) return;
    supabase.rpc('email_unsubscribe', { _token: token }).then(({ data, error }) => {
      if (error) setEstado('error');
      else setEstado(data ? 'hecho' : 'invalido');
    });
  }, [token]);

  const textos: Record<Estado, { titulo: string; texto: string }> = {
    cargando: { titulo: 'Un momento…', texto: 'Estamos guardando tu preferencia.' },
    hecho: {
      titulo: 'Ya no recibirás avisos por correo',
      texto: 'Puedes volver a activarlos cuando quieras en Ajustes → Avisos por correo.',
    },
    invalido: {
      titulo: 'Este enlace no es válido',
      texto: 'Puedes desactivar los avisos en Ajustes → Avisos por correo, o escribirnos a soporte@crowdfolio.es.',
    },
    error: {
      titulo: 'No hemos podido darte de baja',
      texto: 'Inténtalo de nuevo en unos minutos o escríbenos a soporte@crowdfolio.es.',
    },
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted p-6">
      <div className="max-w-md rounded-xl bg-background p-8 text-center shadow-sm">
        <h1 className="mb-3 text-2xl font-bold">{textos[estado].titulo}</h1>
        <p className="mb-6 text-muted-foreground">{textos[estado].texto}</p>
        <a href="/" className="text-primary underline hover:text-primary/90">
          Ir a Crowdfolio
        </a>
      </div>
    </div>
  );
};

export default BajaCorreos;
