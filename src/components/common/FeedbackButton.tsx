import { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';

export function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (
        popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const mailtoHref =
    'mailto:soporte@crowsfolio.es' +
    '?subject=Sugerencia%20Crowdfolio' +
    '&body=Hola%20equipo%20de%20Crowdfolio%2C%0A%0AQuiero%20compartir%20mi%20opini%C3%B3n%3A%0A%0A';

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {open && (
        <div
          ref={popoverRef}
          className="w-72 rounded-xl border bg-card shadow-xl p-4 space-y-3"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm text-muted-foreground leading-relaxed">
              ¡Agradecemos mucho las opiniones de nuestros usuarios! Crowdfolio siempre busca mejorar en beneficio de quienes nos eligen, y por eso tu feedback nos importa mucho.
            </p>
            <button
              onClick={() => setOpen(false)}
              className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              aria-label="Cerrar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <a
            href={mailtoHref}
            onClick={() => setOpen(false)}
            className="flex w-full items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors"
            style={{ backgroundColor: '#253765' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#1a2850')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#253765')}
          >
            Enviar sugerencia
          </a>
        </div>
      )}

      <button
        ref={buttonRef}
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition-colors"
        style={{ backgroundColor: '#253765' }}
        onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#1a2850')}
        onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#253765')}
        aria-label="Sugerencias"
      >
        <span>💬</span>
        Sugerencias
      </button>
    </div>
  );
}
