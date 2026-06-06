import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';

export default function Cookies() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="mx-auto max-w-3xl">
        <Button variant="ghost" onClick={() => navigate('/landing')} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Política de Cookies</CardTitle>
            <p className="mt-1 text-sm font-medium text-[#79c6fa]">Última actualización: 6 de junio de 2026</p>
          </CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert max-w-none space-y-8 text-sm leading-relaxed">

            <section className="space-y-2">
              <h2 className="text-base font-semibold">1. Qué son las cookies</h2>
              <p className="text-muted-foreground">Las cookies son pequeños archivos de texto que los sitios web almacenan en tu dispositivo (ordenador, tablet o móvil) cuando los visitas. Sirven para que el sitio recuerde información sobre tu visita, como tus preferencias de idioma o si has iniciado sesión, de modo que tu próxima visita sea más fácil y el sitio te resulte más útil.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold">2. Quién es el responsable</h2>
              <p className="text-muted-foreground">El responsable del uso de cookies en crowdfolio.es es Daniel Sánchez Ramírez — <a href="mailto:soporte@crowdfolio.es" className="text-[#79c6fa] underline">soporte@crowdfolio.es</a>.</p>
            </section>

            <section className="space-y-4">
              <h2 className="text-base font-semibold">3. Qué cookies utilizamos</h2>
              <p className="text-muted-foreground">Crowdfolio utiliza un número reducido de cookies, todas ellas estrictamente necesarias para el funcionamiento del servicio. No utilizamos cookies de publicidad, seguimiento de comportamiento ni redes sociales.</p>

              <div className="space-y-3">
                <h3 className="font-semibold">3.1 Cookies estrictamente necesarias</h3>
                <p className="text-muted-foreground">Estas cookies son imprescindibles para que puedas usar la aplicación. Sin ellas no es posible mantener tu sesión iniciada ni recordar tus preferencias básicas. No requieren tu consentimiento previo según la normativa vigente (LSSI art. 22.2).</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 pr-4 font-semibold whitespace-nowrap">Cookie</th>
                        <th className="text-left py-2 pr-4 font-semibold whitespace-nowrap">Proveedor</th>
                        <th className="text-left py-2 pr-4 font-semibold">Finalidad</th>
                        <th className="text-left py-2 font-semibold whitespace-nowrap">Duración</th>
                      </tr>
                    </thead>
                    <tbody className="text-muted-foreground">
                      <tr className="border-b">
                        <td className="py-2 pr-4 font-mono text-xs whitespace-nowrap">sb-[ref]-auth-token</td>
                        <td className="py-2 pr-4 whitespace-nowrap">Supabase</td>
                        <td className="py-2 pr-4">Mantiene tu sesión de usuario activa tras el inicio de sesión</td>
                        <td className="py-2 whitespace-nowrap">Sesión / hasta que cierres sesión</td>
                      </tr>
                      <tr>
                        <td className="py-2 pr-4 font-mono text-xs whitespace-nowrap">sb-[ref]-auth-token-code-verifier</td>
                        <td className="py-2 pr-4 whitespace-nowrap">Supabase</td>
                        <td className="py-2 pr-4">Verificación del flujo OAuth / Google Login; se elimina tras completarse el proceso</td>
                        <td className="py-2 whitespace-nowrap">Sesión</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold">3.2 Cookies de preferencias</h3>
                <p className="text-muted-foreground">Estas cookies recuerdan tus preferencias en la aplicación para ofrecerte una experiencia personalizada.</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 pr-4 font-semibold whitespace-nowrap">Cookie</th>
                        <th className="text-left py-2 pr-4 font-semibold whitespace-nowrap">Proveedor</th>
                        <th className="text-left py-2 pr-4 font-semibold">Finalidad</th>
                        <th className="text-left py-2 font-semibold whitespace-nowrap">Duración</th>
                      </tr>
                    </thead>
                    <tbody className="text-muted-foreground">
                      <tr className="border-b">
                        <td className="py-2 pr-4 font-mono text-xs whitespace-nowrap">crowdfolio-theme</td>
                        <td className="py-2 pr-4 whitespace-nowrap">Crowdfolio</td>
                        <td className="py-2 pr-4">Recuerda si has seleccionado el modo claro u oscuro</td>
                        <td className="py-2 whitespace-nowrap">1 año</td>
                      </tr>
                      <tr>
                        <td className="py-2 pr-4 font-mono text-xs whitespace-nowrap">crowdfolio-language</td>
                        <td className="py-2 pr-4 whitespace-nowrap">Crowdfolio</td>
                        <td className="py-2 pr-4">Recuerda el idioma seleccionado (español/inglés)</td>
                        <td className="py-2 whitespace-nowrap">1 año</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold">3.3 Cookies de terceros — Stripe</h3>
                <p className="text-muted-foreground">Si contratas el plan Pro, Stripe puede establecer cookies propias durante el proceso de pago para garantizar la seguridad de la transacción y prevenir el fraude. Estas cookies son gestionadas íntegramente por Stripe y se rigen por su propia política de privacidad: <a href="https://stripe.com/es/privacy" className="text-[#79c6fa] underline" target="_blank" rel="noopener noreferrer">https://stripe.com/es/privacy</a>.</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 pr-4 font-semibold whitespace-nowrap">Cookie</th>
                        <th className="text-left py-2 pr-4 font-semibold whitespace-nowrap">Proveedor</th>
                        <th className="text-left py-2 pr-4 font-semibold">Finalidad</th>
                        <th className="text-left py-2 font-semibold whitespace-nowrap">Duración</th>
                      </tr>
                    </thead>
                    <tbody className="text-muted-foreground">
                      <tr className="border-b">
                        <td className="py-2 pr-4 font-mono text-xs whitespace-nowrap">__stripe_mid</td>
                        <td className="py-2 pr-4 whitespace-nowrap">Stripe</td>
                        <td className="py-2 pr-4">Prevención de fraude en transacciones de pago</td>
                        <td className="py-2 whitespace-nowrap">1 año</td>
                      </tr>
                      <tr>
                        <td className="py-2 pr-4 font-mono text-xs whitespace-nowrap">__stripe_sid</td>
                        <td className="py-2 pr-4 whitespace-nowrap">Stripe</td>
                        <td className="py-2 pr-4">Seguridad de la sesión de pago</td>
                        <td className="py-2 whitespace-nowrap">30 minutos</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-base font-semibold">4. Lo que NO hacemos con las cookies</h2>
              <p className="text-muted-foreground">Crowdfolio no utiliza cookies para:</p>
              <ul className="list-disc pl-5 text-muted-foreground space-y-1">
                <li>Publicidad comportamental o retargeting.</li>
                <li>Seguimiento de tu actividad en otros sitios web.</li>
                <li>Venta o cesión de datos de navegación a terceros.</li>
                <li>Analítica de terceros (Google Analytics u similares).</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-base font-semibold">5. Cómo gestionar o eliminar las cookies</h2>
              <p className="text-muted-foreground">Puedes configurar tu navegador para bloquear o eliminar cookies en cualquier momento. Ten en cuenta que bloquear las cookies estrictamente necesarias puede impedir que el inicio de sesión funcione correctamente.</p>
              <ul className="list-disc pl-5 text-muted-foreground space-y-1">
                <li><strong className="text-foreground">Chrome</strong> — Configuración → Privacidad y seguridad → Cookies y otros datos de sitios.</li>
                <li><strong className="text-foreground">Firefox</strong> — Opciones → Privacidad y seguridad → Cookies y datos del sitio.</li>
                <li><strong className="text-foreground">Safari</strong> — Preferencias → Privacidad → Gestionar datos de sitios web.</li>
                <li><strong className="text-foreground">Edge</strong> — Configuración → Privacidad, búsqueda y servicios → Cookies.</li>
              </ul>
              <p className="text-muted-foreground">También puedes eliminar las cookies almacenadas abriendo las herramientas de desarrollador de tu navegador (F12) → pestaña Aplicación → Almacenamiento → Cookies.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold">6. Consentimiento</h2>
              <p className="text-muted-foreground">Las cookies estrictamente necesarias no requieren consentimiento. Las cookies de preferencias se activan únicamente cuando realizas una acción que las origina (cambiar el tema o el idioma). Las cookies de Stripe solo se activan si inicias un proceso de pago.</p>
              <p className="text-muted-foreground">Si en el futuro incorporamos cualquier cookie que requiera consentimiento previo (por ejemplo, cookies analíticas), actualizaremos esta política y mostraremos el banner de consentimiento correspondiente antes de activarlas.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold">7. Cambios en esta política</h2>
              <p className="text-muted-foreground">Podemos actualizar esta Política de Cookies cuando incorporemos nuevos servicios o tecnologías. La fecha de "última actualización" al inicio del documento siempre refleja la versión vigente. Los cambios significativos se comunicarán mediante aviso en la aplicación.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold">8. Contacto</h2>
              <p className="text-muted-foreground">Daniel Sánchez Ramírez · <a href="mailto:soporte@crowdfolio.es" className="text-[#79c6fa] underline">soporte@crowdfolio.es</a> · Valencia, España.</p>
            </section>

          </CardContent>
        </Card>
      </div>
    </div>
  );
}
