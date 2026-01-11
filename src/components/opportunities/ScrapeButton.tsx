import { useState } from 'react';
import { RefreshCw, ChevronDown, AlertCircle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Platform } from '@/types/investment';
import { SCRAPING_PLATFORMS } from '@/types/opportunity';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface ScrapeButtonProps {
  onScrape: (platform?: Platform) => Promise<void>;
  isScraping: boolean;
  lastScrapedAt?: string | null;
  error?: string | null;
  requiresSetup?: boolean;
}

export function ScrapeButton({ 
  onScrape, 
  isScraping, 
  lastScrapedAt, 
  error,
  requiresSetup 
}: ScrapeButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleScrape = async (platform?: Platform) => {
    setIsOpen(false);
    await onScrape(platform);
  };

  if (requiresSetup) {
    return (
      <Alert variant="destructive" className="max-w-md">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Configuración requerida</AlertTitle>
        <AlertDescription>
          Para usar el scraping automático, necesitas conectar Firecrawl en la configuración del proyecto.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
          <DropdownMenuTrigger asChild>
            <Button disabled={isScraping} className="gap-2">
              {isScraping ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Buscando...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Buscar Oportunidades
                  <ChevronDown className="h-4 w-4" />
                </>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => handleScrape()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Todas las plataformas
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {SCRAPING_PLATFORMS.map(platform => (
              <DropdownMenuItem 
                key={platform.value} 
                onClick={() => handleScrape(platform.value)}
              >
                <div 
                  className="mr-2 h-3 w-3 rounded-full"
                  style={{ backgroundColor: `hsl(var(--${platform.color}))` }}
                />
                {platform.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {lastScrapedAt && (
          <span className="text-xs text-muted-foreground">
            Última búsqueda: {formatDistanceToNow(new Date(lastScrapedAt), { 
              addSuffix: true, 
              locale: es 
            })}
          </span>
        )}
      </div>

      {error && !requiresSetup && (
        <Alert variant="destructive" className="py-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
