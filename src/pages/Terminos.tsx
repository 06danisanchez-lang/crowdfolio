import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';

export default function Terminos() {
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
            <CardTitle>Términos y Condiciones</CardTitle>
            <p className="text-sm text-muted-foreground">Última actualización: febrero 2026</p>
          </CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert max-w-none space-y-6">
            <section>
              <h2 className="text-lg font-semibold">1. Aceptación de los términos</h2>
              <p className="text-muted-foreground">
                Al registrarte y utilizar Crowdfolio, aceptas quedar vinculado por estos términos y condiciones. Si no estás de acuerdo, no utilices el servicio.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">2. Descripción del servicio</h2>
              <p className="text-muted-foreground">
                Crowdfolio es una herramienta de gestión y seguimiento de inversiones en crowdfunding. No somos una entidad financiera ni ofrecemos asesoramiento de inversión.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">3. Registro y cuenta</h2>
              <p className="text-muted-foreground">
                Eres responsable de mantener la confidencialidad de tus credenciales de acceso y de toda la actividad que ocurra bajo tu cuenta.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">4. Uso aceptable</h2>
              <p className="text-muted-foreground">
                Te comprometes a utilizar la plataforma de forma legal y conforme a estos términos. Queda prohibido cualquier uso que pueda dañar, deshabilitar o sobrecargar el servicio.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">5. Limitación de responsabilidad</h2>
              <p className="text-muted-foreground">
                Crowdfolio se proporciona "tal cual". No garantizamos la exactitud de los cálculos fiscales ni de cualquier otra información. El usuario es responsable de verificar la información con un asesor profesional.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">6. Modificaciones</h2>
              <p className="text-muted-foreground">
                Nos reservamos el derecho de modificar estos términos. Los cambios serán notificados a través de la plataforma y entrarán en vigor a partir de su publicación.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">7. Cancelación</h2>
              <p className="text-muted-foreground">
                Puedes cancelar tu cuenta en cualquier momento. Tras la cancelación, tus datos serán eliminados conforme a nuestra Política de Privacidad.
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
