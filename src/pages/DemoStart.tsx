import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { seedDemoPortfolio } from '@/lib/demo/seedDemo';
import { Button } from '@/components/ui/button';

/**
 * /demo: entra en la app con una cuenta demo propia (anónima) y una cartera de
 * ejemplo. Si ya hay una sesión real, no la toca: va a la app de esa cuenta.
 */
export default function DemoStart() {
  const { user, isDemo, startDemo } = useAuth();
  const navigate = useNavigate();
  const [failed, setFailed] = useState(false);
  const running = useRef(false);

  const run = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    setFailed(false);
    try {
      if (user && !isDemo) {
        navigate('/', { replace: true });
        return;
      }
      const { user: demoUser, error } = await startDemo();
      if (error || !demoUser) throw error ?? new Error('Sin usuario demo');
      await seedDemoPortfolio(demoUser.id);
      navigate('/', { replace: true });
    } catch (err) {
      console.error('[demo]', err);
      setFailed(true);
    } finally {
      running.current = false;
    }
  }, [user, isDemo, startDemo, navigate]);

  useEffect(() => {
    run();
    // Solo al entrar en /demo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      {failed ? (
        <div className="max-w-sm space-y-4 text-center">
          <p className="text-lg font-semibold">No hemos podido abrir la demo</p>
          <p className="text-sm text-muted-foreground">Prueba de nuevo en unos minutos.</p>
          <div className="flex justify-center gap-2">
            <Button onClick={run}>Reintentar</Button>
            <Button variant="outline" onClick={() => navigate('/landing')}>Ir a la portada</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Preparando la cartera de ejemplo…</p>
        </div>
      )}
    </div>
  );
}
