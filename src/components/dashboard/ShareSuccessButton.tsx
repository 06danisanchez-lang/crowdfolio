import { useState, RefObject } from 'react';
import { Share2, Loader2, Download } from 'lucide-react';
import { toPng } from 'html-to-image';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface ShareSuccessButtonProps {
  targetRef: RefObject<HTMLDivElement>;
  disabled?: boolean;
}

export const ShareSuccessButton = ({ targetRef, disabled }: ShareSuccessButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const downloadImage = (dataUrl: string) => {
    const link = document.createElement('a');
    link.download = 'mi-exito-crowdfolio.png';
    link.href = dataUrl;
    link.click();
  };

  const captureAndShare = async () => {
    const node = targetRef.current;
    if (!node) {
      toast.error('No se pudo capturar la tarjeta');
      return;
    }

    setIsLoading(true);

    try {
      // Capturar como PNG con alta calidad
      const dataUrl = await toPng(node, {
        quality: 0.95,
        pixelRatio: 2, // Para mejor resolución
        cacheBust: true,
      });

      // Convertir a blob para compartir
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const file = new File([blob], 'mi-exito-crowdfolio.png', { type: 'image/png' });

      // Verificar si Web Share API está disponible y soporta archivos
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'Mi éxito en Crowdfolio',
          text: 'Gestiono mi cartera de Urbanitae con https://crowdfolio.es 🚀',
          files: [file],
        });
        toast.success('¡Compartido con éxito!');
      } else {
        // Fallback: descargar imagen
        downloadImage(dataUrl);
        toast.success('Imagen descargada. ¡Compártela manualmente!');
      }
    } catch (error) {
      // El usuario canceló el share, no es un error
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      console.error('Error al compartir:', error);
      toast.error('Error al generar la imagen');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={captureAndShare}
      disabled={disabled || isLoading}
      variant="outline"
      className="gap-2"
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Generando...
        </>
      ) : (
        <>
          <Share2 className="h-4 w-4" />
          Compartir mi éxito
        </>
      )}
    </Button>
  );
};
