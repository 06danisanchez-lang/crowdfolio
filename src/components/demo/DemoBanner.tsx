import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useQueryClient } from '@tanstack/react-query';

/** Franja fija de la demo pública. Solo aparece en cuentas demo. */
export function DemoBanner() {
  const { isDemo, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const ref = useRef<HTMLDivElement>(null);

  // La cabecera móvil y la barra lateral se colocan debajo de la franja
  // (variable CSS --demo-banner-h, 0 fuera de la demo).
  useEffect(() => {
    const el = ref.current;
    const root = document.documentElement;
    if (!isDemo || !el) return;
    const update = () => root.style.setProperty('--demo-banner-h', `${el.offsetHeight}px`);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      ro.disconnect();
      root.style.removeProperty('--demo-banner-h');
    };
  }, [isDemo]);

  if (!isDemo) return null;

  const createAccount = async () => {
    // La cuenta nueva es otra distinta: empieza vacía, sin los datos de ejemplo.
    await signOut();
    queryClient.clear();
    navigate('/auth?modo=registro');
  };

  return (
    <div ref={ref} className="sticky top-0 z-[60] flex flex-wrap items-center justify-center gap-x-4 gap-y-2 bg-amber-100 px-4 py-2 text-center text-sm text-amber-950 dark:bg-amber-900 dark:text-amber-50">
      <span>
        <strong>Estás en la demo:</strong> estos datos son de ejemplo y se borran a los 7 días.
      </span>
      <Button size="sm" className="h-7" onClick={createAccount}>Crear mi cuenta</Button>
    </div>
  );
}
