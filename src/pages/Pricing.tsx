import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PricingTable } from '@/components/subscription/PricingTable';
import crowdfolioLogo from '@/assets/logo_crowdfolio.png';

interface PricingProps {
  onBack?: () => void;
}

export default function Pricing({ onBack }: PricingProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            {onBack && (
              <Button variant="ghost" size="icon" onClick={onBack}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            <div className="flex items-center gap-2">
              <img src={crowdfolioLogo} alt="Crowdfolio" className="h-7" />
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="mb-12 text-center">
          <h1 className="mb-4 text-4xl font-bold">Elige tu plan</h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Empieza gratis y actualiza cuando necesites más. Sin compromisos, cancela cuando quieras.
          </p>
        </div>

        <PricingTable />

        {/* FAQ or Additional Info */}
        <div className="mt-16 text-center">
          <h2 className="mb-4 text-2xl font-semibold">¿Tienes preguntas?</h2>
          <p className="text-muted-foreground">
            Escríbenos a{' '}
            <a href="mailto:soporte@crowdfolio.es" className="text-primary hover:underline">
              soporte@crowdfolio.es
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
