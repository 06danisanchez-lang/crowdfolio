import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';

export default function PoliticaPrivacidad() {
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
            <CardTitle>Política de Privacidad</CardTitle>
            <p className="text-sm text-muted-foreground">Última actualización: febrero 2026</p>
          </CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert max-w-none space-y-6">
            <section>
              <h2 className="text-lg font-semibold">1. Responsable del tratamiento</h2>
              <p className="text-muted-foreground">[Nombre o razón social, NIF/CIF, domicilio, email de contacto]</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">2. Datos que recopilamos</h2>
              <p className="text-muted-foreground">
                Recopilamos los datos que nos proporcionas al registrarte (email, contraseña cifrada) y los datos que introduces voluntariamente en la plataforma (inversiones, plataformas, transacciones fiscales).
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">3. Finalidad del tratamiento</h2>
              <p className="text-muted-foreground">
                Los datos se tratan para gestionar tu cuenta, proporcionarte las funcionalidades de la aplicación y enviarte comunicaciones relacionadas con el servicio.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">4. Base legal</h2>
              <p className="text-muted-foreground">
                El tratamiento se basa en la ejecución del contrato (prestación del servicio) y en tu consentimiento para las comunicaciones comerciales.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">5. Conservación de datos</h2>
              <p className="text-muted-foreground">
                Los datos se conservarán mientras mantengas tu cuenta activa. Puedes solicitar la eliminación de tu cuenta y datos en cualquier momento.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">6. Derechos del usuario</h2>
              <p className="text-muted-foreground">
                Tienes derecho a acceder, rectificar, suprimir, limitar y portar tus datos, así como a oponerte al tratamiento. Puedes ejercer estos derechos contactando a soporte@crowdfolio.es.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">7. Seguridad</h2>
              <p className="text-muted-foreground">
                Implementamos medidas técnicas y organizativas para proteger tus datos, incluyendo cifrado en tránsito y en reposo, políticas de acceso restringido y copias de seguridad periódicas.
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
