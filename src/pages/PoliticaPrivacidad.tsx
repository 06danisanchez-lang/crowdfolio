import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';

export default function PoliticaPrivacidad() {
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
            <CardTitle className="text-2xl">Política de Privacidad</CardTitle>
            <p className="mt-1 text-sm font-medium text-[#79c6fa]">Última actualización: 6 de junio de 2026</p>
          </CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert max-w-none space-y-8 text-sm leading-relaxed">

            <section className="space-y-3">
              <h2 className="text-base font-semibold">1. Responsable del tratamiento</h2>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-muted-foreground">
                <dt className="font-medium text-foreground">Nombre</dt><dd>Daniel Sánchez Ramírez</dd>
                <dt className="font-medium text-foreground">NIF</dt><dd>23322249L</dd>
                <dt className="font-medium text-foreground">Actividad</dt><dd>Desarrollo y comercialización de software SaaS</dd>
                <dt className="font-medium text-foreground">Domicilio</dt><dd>Valencia, España</dd>
                <dt className="font-medium text-foreground">Correo electrónico</dt><dd><a href="mailto:soporte@crowdfolio.es" className="text-[#79c6fa] underline">soporte@crowdfolio.es</a></dd>
                <dt className="font-medium text-foreground">Sitio web</dt><dd><a href="https://crowdfolio.es" className="text-[#79c6fa] underline" target="_blank" rel="noopener noreferrer">https://crowdfolio.es</a></dd>
              </dl>
            </section>

            <section className="space-y-4">
              <h2 className="text-base font-semibold">2. Qué datos recogemos y por qué</h2>

              <div className="space-y-2">
                <h3 className="font-semibold">2.1 Datos de registro y cuenta</h3>
                <p className="text-muted-foreground">Cuando creas una cuenta en Crowdfolio recogemos:</p>
                <ul className="list-disc pl-5 text-muted-foreground space-y-1">
                  <li><strong className="text-foreground">Correo electrónico</strong> — necesario para identificarte, enviarte notificaciones y permitir la recuperación de contraseña.</li>
                  <li><strong className="text-foreground">Nombre o alias</strong> — opcional, para personalizar la interfaz.</li>
                  <li><strong className="text-foreground">Contraseña</strong> — almacenada en formato cifrado, nunca en texto plano, necesaria para la autenticación.</li>
                </ul>
                <p className="text-muted-foreground">Si te registras mediante Google OAuth, recibimos de Google únicamente el correo electrónico y el nombre asociado a tu cuenta Google. No recibimos ni almacenamos tu contraseña de Google.</p>
                <p className="text-muted-foreground"><em>Base legal:</em> ejecución del contrato de servicio (art. 6.1.b RGPD).</p>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold">2.2 Datos de inversiones y cartera</h3>
                <p className="text-muted-foreground">La funcionalidad principal de Crowdfolio consiste en registrar y organizar tus inversiones en plataformas de crowdfunding. Para ello almacenamos los datos que tú mismo introduces: nombre y descripción de cada inversión, plataforma, importe, fechas, estado y modelo financiero, pagos recibidos y programados, información fiscal derivada (rendimientos, retenciones, pérdidas).</p>
                <p className="text-muted-foreground">Estos datos son estrictamente tuyos. Crowdfolio no accede a tus cuentas en ninguna plataforma de crowdfunding externa, ni obtiene datos de inversión de forma automática salvo mediante las funciones de importación que tú mismo activas.</p>
                <p className="text-muted-foreground"><em>Base legal:</em> ejecución del contrato de servicio (art. 6.1.b RGPD).</p>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold">2.3 Datos de pago</h3>
                <p className="text-muted-foreground">Los pagos de la suscripción Pro se procesan a través de Stripe Payments Europe, Ltd., con domicilio en Irlanda. Crowdfolio no almacena ni tiene acceso a los datos de tu tarjeta de crédito o débito. Stripe actúa como encargado del tratamiento bajo sus propias políticas de seguridad y cumplimiento PCI DSS.</p>
                <p className="text-muted-foreground">Sí conservamos el identificador de cliente Stripe, el estado de tu suscripción y el historial de pagos a efectos de facturación y soporte.</p>
                <p className="text-muted-foreground"><em>Base legal:</em> ejecución del contrato (art. 6.1.b RGPD) y obligación legal de conservación de registros contables (art. 6.1.c RGPD).</p>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold">2.4 Datos técnicos y de uso</h3>
                <p className="text-muted-foreground">Al usar la aplicación se generan automáticamente: dirección IP y datos del dispositivo y navegador, registros de acceso (logs) con fechas y horas, preferencias de la aplicación (tema, idioma).</p>
                <p className="text-muted-foreground">Estos datos se usan exclusivamente para garantizar la seguridad, el correcto funcionamiento del servicio y la detección de errores técnicos. No los utilizamos para publicidad ni los cedemos a terceros con fines comerciales.</p>
                <p className="text-muted-foreground"><em>Base legal:</em> interés legítimo en el mantenimiento y seguridad del servicio (art. 6.1.f RGPD).</p>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold">2.5 Comunicaciones con soporte</h3>
                <p className="text-muted-foreground">Si te pones en contacto con nosotros por correo electrónico u otros medios, conservamos el contenido de esa comunicación para poder prestarte asistencia y dar seguimiento a tu consulta.</p>
                <p className="text-muted-foreground"><em>Base legal:</em> interés legítimo (art. 6.1.f RGPD).</p>
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-base font-semibold">3. Con quién compartimos tus datos</h2>
              <p className="text-muted-foreground">Crowdfolio no vende ni alquila tus datos personales a terceros. Solo los compartimos con los proveedores de servicios estrictamente necesarios para el funcionamiento de la plataforma, que actúan como encargados del tratamiento bajo acuerdo contractual.</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 pr-4 font-semibold whitespace-nowrap">Proveedor</th>
                      <th className="text-left py-2 pr-4 font-semibold">Finalidad</th>
                      <th className="text-left py-2 pr-4 font-semibold whitespace-nowrap">País</th>
                      <th className="text-left py-2 font-semibold whitespace-nowrap">Garantía</th>
                    </tr>
                  </thead>
                  <tbody className="text-muted-foreground">
                    <tr className="border-b">
                      <td className="py-2 pr-4 font-medium text-foreground whitespace-nowrap">Supabase, Inc.</td>
                      <td className="py-2 pr-4">Base de datos, autenticación y almacenamiento</td>
                      <td className="py-2 pr-4 whitespace-nowrap">EE. UU.</td>
                      <td className="py-2 whitespace-nowrap">CCT UE</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 pr-4 font-medium text-foreground whitespace-nowrap">Vercel, Inc.</td>
                      <td className="py-2 pr-4">Alojamiento y despliegue de la aplicación</td>
                      <td className="py-2 pr-4 whitespace-nowrap">EE. UU.</td>
                      <td className="py-2 whitespace-nowrap">CCT UE</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 pr-4 font-medium text-foreground whitespace-nowrap">Stripe Payments Europe, Ltd.</td>
                      <td className="py-2 pr-4">Procesamiento de pagos</td>
                      <td className="py-2 pr-4 whitespace-nowrap">Irlanda (UE)</td>
                      <td className="py-2 whitespace-nowrap">Adecuación UE</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 pr-4 font-medium text-foreground whitespace-nowrap">Google LLC</td>
                      <td className="py-2 pr-4">Autenticación OAuth (si la usas)</td>
                      <td className="py-2 pr-4 whitespace-nowrap">EE. UU.</td>
                      <td className="py-2 whitespace-nowrap">CCT UE</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4 font-medium text-foreground whitespace-nowrap">Resend, Inc.</td>
                      <td className="py-2 pr-4">Envío de correos transaccionales</td>
                      <td className="py-2 pr-4 whitespace-nowrap">EE. UU.</td>
                      <td className="py-2 whitespace-nowrap">CCT UE</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-muted-foreground">Las transferencias internacionales de datos a proveedores en EE. UU. se amparan en las Cláusulas Contractuales Tipo aprobadas por la Comisión Europea, garantizando un nivel de protección equivalente al del RGPD.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-base font-semibold">4. Durante cuánto tiempo conservamos tus datos</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 pr-4 font-semibold">Categoría</th>
                      <th className="text-left py-2 font-semibold">Plazo</th>
                    </tr>
                  </thead>
                  <tbody className="text-muted-foreground">
                    <tr className="border-b">
                      <td className="py-2 pr-4 font-medium text-foreground">Datos de cuenta y cartera</td>
                      <td className="py-2">Mientras la cuenta esté activa; si la eliminas, en un plazo máximo de 30 días</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 pr-4 font-medium text-foreground">Datos de facturación y pagos</td>
                      <td className="py-2">5 años desde la fecha de la transacción (obligación fiscal, art. 30 Código de Comercio)</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 pr-4 font-medium text-foreground">Logs técnicos</td>
                      <td className="py-2">90 días</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4 font-medium text-foreground">Comunicaciones de soporte</td>
                      <td className="py-2">2 años desde la última interacción</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-muted-foreground">Puedes solicitar la eliminación de tu cuenta en cualquier momento desde los ajustes de la aplicación o escribiendo a <a href="mailto:soporte@crowdfolio.es" className="text-[#79c6fa] underline">soporte@crowdfolio.es</a>.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-base font-semibold">5. Tus derechos</h2>
              <p className="text-muted-foreground">Como usuario residente en España o en la Unión Europea, tienes los siguientes derechos sobre tus datos:</p>
              <ul className="list-disc pl-5 text-muted-foreground space-y-1">
                <li><strong className="text-foreground">Acceso</strong> — saber qué datos tuyos tenemos y cómo los usamos.</li>
                <li><strong className="text-foreground">Rectificación</strong> — corregir datos inexactos o incompletos.</li>
                <li><strong className="text-foreground">Supresión</strong> — solicitar el borrado de tus datos ("derecho al olvido").</li>
                <li><strong className="text-foreground">Oposición</strong> — oponerte al tratamiento basado en interés legítimo.</li>
                <li><strong className="text-foreground">Limitación</strong> — solicitar que suspendamos temporalmente el tratamiento.</li>
                <li><strong className="text-foreground">Portabilidad</strong> — recibir tus datos en un formato estructurado y legible por máquina.</li>
                <li><strong className="text-foreground">No ser objeto de decisiones automatizadas</strong> — Crowdfolio no toma decisiones que produzcan efectos jurídicos sobre ti de forma exclusivamente automatizada.</li>
              </ul>
              <p className="text-muted-foreground">Para ejercer cualquiera de estos derechos, escribe a <a href="mailto:soporte@crowdfolio.es" className="text-[#79c6fa] underline">soporte@crowdfolio.es</a> indicando tu solicitud y adjuntando una copia de tu documento de identidad. Responderemos en un plazo máximo de 30 días naturales.</p>
              <p className="text-muted-foreground">Si consideras que el tratamiento de tus datos no es conforme al RGPD, tienes derecho a presentar una reclamación ante la Agencia Española de Protección de Datos (AEPD) en <a href="https://www.aepd.es" className="text-[#79c6fa] underline" target="_blank" rel="noopener noreferrer">www.aepd.es</a>.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-base font-semibold">6. Seguridad</h2>
              <p className="text-muted-foreground">Aplicamos medidas técnicas y organizativas adecuadas para proteger tus datos:</p>
              <ul className="list-disc pl-5 text-muted-foreground space-y-1">
                <li>Comunicaciones cifradas mediante TLS/HTTPS en todo momento.</li>
                <li>Contraseñas almacenadas con hash seguro (bcrypt), nunca en texto plano.</li>
                <li>Acceso a la base de datos restringido mediante Row Level Security (RLS) — cada usuario solo puede acceder a sus propios datos.</li>
                <li>Autenticación de dos factores disponible.</li>
                <li>Copias de seguridad automáticas de la base de datos.</li>
              </ul>
              <p className="text-muted-foreground">Ningún sistema es infalible. En caso de brecha de seguridad que afecte a tus datos, te notificaremos en un plazo máximo de 72 horas desde que tengamos conocimiento de ella, conforme a lo exigido por el RGPD.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold">7. Menores de edad</h2>
              <p className="text-muted-foreground">Crowdfolio está dirigido exclusivamente a personas mayores de 18 años. No recogemos conscientemente datos de menores. Si detectamos que un usuario es menor de edad, procederemos a eliminar su cuenta y sus datos.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold">8. Cambios en esta política</h2>
              <p className="text-muted-foreground">Podemos actualizar esta Política de Privacidad para reflejar cambios legales, técnicos o en el servicio. Cuando realicemos cambios significativos, te lo notificaremos por correo electrónico o mediante un aviso destacado en la aplicación con al menos 15 días de antelación. La fecha de "última actualización" al inicio del documento siempre refleja la versión vigente.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold">9. Contacto</h2>
              <p className="text-muted-foreground">Daniel Sánchez Ramírez · <a href="mailto:soporte@crowdfolio.es" className="text-[#79c6fa] underline">soporte@crowdfolio.es</a> · Valencia, España.</p>
            </section>

          </CardContent>
        </Card>
      </div>
    </div>
  );
}
