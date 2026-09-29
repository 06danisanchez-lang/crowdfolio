import { useEffect } from 'react';

/**
 * Pone un <title> y <meta name="description"> específicos de página mientras
 * el componente está montado, y restaura los valores globales de index.html
 * al desmontar — la app es una SPA sin gestor de meta tags por ruta (no hay
 * react-helmet ni similar), así que las páginas públicas indexables (guías,
 * legales) que necesiten su propio title/description lo hacen así.
 */
export function useDocumentMeta(title: string, description: string): void {
  useEffect(() => {
    const previousTitle = document.title;
    const meta = document.querySelector('meta[name="description"]');
    const previousDescription = meta?.getAttribute('content') ?? null;

    document.title = title;
    if (meta) meta.setAttribute('content', description);

    return () => {
      document.title = previousTitle;
      if (meta && previousDescription !== null) meta.setAttribute('content', previousDescription);
    };
  }, [title, description]);
}
