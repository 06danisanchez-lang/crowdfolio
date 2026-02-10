import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';

export default function AvisoLegal() {
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
            <CardTitle>Aviso Legal</CardTitle>
            <p className="text-sm text-muted-foreground">Última actualización: febrero 2026</p>
          </CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert max-w-none space-y-6">
            <section>
              <h2 className="text-lg font-semibold">1. Datos identificativos</h2>
              <p className="text-muted-foreground">
                En cumplimiento del artículo 10 de la Ley 34/2002, de 11 de julio, de Servicios de la Sociedad de la Información y Comercio Electrónico (LSSICE), se informa al usuario de los datos del titular de este sitio web.
              </p>
              <p className="text-muted-foreground">[Nombre o razón social, NIF/CIF, domicilio, email de contacto]</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">2. Objeto</h2>
              <p className="text-muted-foreground">
                El presente aviso legal regula el uso del sitio web crowdfolio.es y de la aplicación Crowdfolio, cuyo fin es ofrecer herramientas de gestión y seguimiento de inversiones en crowdfunding.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">3. Propiedad intelectual e industrial</h2>
              <p className="text-muted-foreground">
                Todos los contenidos del sitio web, incluyendo textos, imágenes, gráficos, logotipos, iconos, software y cualquier otro material, están protegidos por las leyes de propiedad intelectual e industrial. Queda prohibida su reproducción, distribución o transformación sin autorización expresa.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">4. Exclusión de responsabilidad</h2>
              <p className="text-muted-foreground">
                Crowdfolio no ofrece asesoramiento financiero. La información proporcionada tiene carácter meramente informativo y en ningún caso constituye una recomendación de inversión. El usuario es el único responsable de sus decisiones de inversión.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">5. Legislación aplicable</h2>
              <p className="text-muted-foreground">
                El presente aviso legal se rige por la legislación española. Para cualquier controversia, las partes se someten a los juzgados y tribunales del domicilio del titular.
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
