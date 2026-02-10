import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';

export default function Cookies() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="mx-auto max-w-3xl">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
        <Card>
          <CardHeader>
            <CardTitle>Política de Cookies</CardTitle>
            <p className="text-sm text-muted-foreground">Última actualización: febrero 2026</p>
          </CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert max-w-none space-y-6">
            <section>
              <h2 className="text-lg font-semibold">1. ¿Qué son las cookies?</h2>
              <p className="text-muted-foreground">
                Las cookies son pequeños archivos de texto que se almacenan en tu dispositivo cuando visitas un sitio web. Permiten que el sitio recuerde tus acciones y preferencias.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">2. Cookies que utilizamos</h2>
              <p className="text-muted-foreground">
                Crowdfolio utiliza únicamente cookies técnicas de sesión, estrictamente necesarias para el funcionamiento de la aplicación. Estas cookies permiten:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>Mantener tu sesión iniciada mientras navegas por la aplicación.</li>
                <li>Recordar tus preferencias de interfaz (como el modo claro/oscuro).</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold">3. Cookies de terceros</h2>
              <p className="text-muted-foreground">
                No utilizamos cookies de seguimiento, analítica ni publicidad de terceros.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">4. Gestión de cookies</h2>
              <p className="text-muted-foreground">
                Al ser cookies estrictamente necesarias, no requieren consentimiento previo según el artículo 22.2 de la LSSICE. Puedes configurar tu navegador para bloquear cookies, aunque esto puede impedir el correcto funcionamiento de la aplicación.
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
