import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';

export default function Terminos() {
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
            <CardTitle className="text-2xl">Términos y Condiciones de Uso</CardTitle>
            <p className="mt-1 text-sm font-medium text-[#79c6fa]">Última actualización: 6 de junio de 2026</p>
          </CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert max-w-none space-y-8 text-sm leading-relaxed">

            <section className="space-y-3">
              <h2 className="text-base font-semibold">1. Identificación del titular</h2>
              <p className="text-muted-foreground">El presente sitio web y la aplicación Crowdfolio (en adelante, "el Servicio") son titularidad de:</p>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-muted-foreground">
                <dt className="font-medium text-foreground">Nombre</dt><dd>Daniel Sánchez Ramírez</dd>
                <dt className="font-medium text-foreground">NIF</dt><dd>23322249L</dd>
                <dt className="font-medium text-foreground">Domicilio</dt><dd>Valencia, España</dd>
                <dt className="font-medium text-foreground">Correo electrónico</dt><dd><a href="mailto:soporte@crowdfolio.es" className="text-[#79c6fa] underline">soporte@crowdfolio.es</a></dd>
                <dt className="font-medium text-foreground">Sitio web</dt><dd><a href="https://crowdfolio.es" className="text-[#79c6fa] underline" target="_blank" rel="noopener noreferrer">https://crowdfolio.es</a></dd>
              </dl>
            </section>

            <section className="space-y-3">
              <h2 className="text-base font-semibold">2. Objeto y naturaleza del servicio</h2>
              <p className="text-muted-foreground">Crowdfolio es una herramienta de software como servicio (SaaS) que permite a los usuarios registrar, organizar y visualizar sus inversiones en plataformas de crowdfunding y crowdlending, así como obtener un resumen orientativo de su situación fiscal en el marco del IRPF español.</p>
              <p className="text-muted-foreground font-medium text-foreground">Crowdfolio NO es:</p>
              <ul className="list-disc pl-5 text-muted-foreground space-y-1">
                <li>Una entidad de inversión, intermediación financiera ni asesoramiento de inversiones.</li>
                <li>Un servicio de asesoramiento fiscal o legal.</li>
                <li>Una plataforma de crowdfunding.</li>
              </ul>
              <p className="text-muted-foreground">Toda la información generada por Crowdfolio tiene carácter meramente informativo y orientativo. Las decisiones de inversión y las obligaciones fiscales del usuario son responsabilidad exclusiva de este. Para decisiones financieras o fiscales de relevancia, recomendamos consultar con un profesional cualificado.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold">3. Aceptación de los términos</h2>
              <p className="text-muted-foreground">El acceso y uso del Servicio implica la aceptación plena y sin reservas de estos Términos y Condiciones, así como de la Política de Privacidad y la Política de Cookies. Si no estás de acuerdo con alguna de estas condiciones, debes abstenerte de usar el Servicio.</p>
              <p className="text-muted-foreground">El uso del Servicio está reservado a personas mayores de 18 años con capacidad legal para contratar.</p>
            </section>

            <section className="space-y-4">
              <h2 className="text-base font-semibold">4. Registro y cuenta de usuario</h2>

              <div className="space-y-2">
                <h3 className="font-semibold">4.1 Creación de cuenta</h3>
                <p className="text-muted-foreground">Para acceder al Servicio debes crear una cuenta proporcionando un correo electrónico válido y una contraseña, o autenticándote mediante Google OAuth. Eres responsable de mantener la confidencialidad de tus credenciales.</p>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold">4.2 Veracidad de los datos</h3>
                <p className="text-muted-foreground">Te comprometes a proporcionar información veraz y actualizada durante el registro. Crowdfolio se reserva el derecho de suspender o cancelar cuentas con datos falsos o fraudulentos.</p>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold">4.3 Seguridad de la cuenta</h3>
                <p className="text-muted-foreground">Eres el único responsable de todas las actividades que se realicen desde tu cuenta. Si detectas un acceso no autorizado, debes notificarlo inmediatamente a <a href="mailto:soporte@crowdfolio.es" className="text-[#79c6fa] underline">soporte@crowdfolio.es</a>.</p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-base font-semibold">5. Planes y precios</h2>

              <div className="space-y-2">
                <h3 className="font-semibold">5.1 Plan Gratuito (Free)</h3>
                <p className="text-muted-foreground">El plan gratuito incluye, sin coste y sin límite de tiempo:</p>
                <ul className="list-disc pl-5 text-muted-foreground space-y-1">
                  <li>Registro de hasta 3 inversiones activas o pendientes simultáneamente.</li>
                  <li>1 inversión futura.</li>
                  <li>Resumen fiscal orientativo (visible, no exportable).</li>
                  <li>Notificaciones ilimitadas.</li>
                  <li>Importación de inversiones vía CSV o Excel.</li>
                </ul>
                <p className="text-muted-foreground">Las inversiones en estado "completada" o "en mora" no computan a efectos del límite de 3.</p>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold">5.2 Plan Pro</h3>
                <p className="text-muted-foreground">El plan Pro incluye todas las funcionalidades del plan gratuito más: inversiones ilimitadas, informe fiscal completo y exportable (PDF y Excel), soporte prioritario.</p>
                <p className="text-muted-foreground">El precio del plan Pro es de <strong className="text-foreground">€5,99/mes</strong> o <strong className="text-foreground">€59/año</strong> (IVA incluido), sujeto a las condiciones vigentes en el momento de la contratación. Los precios pueden actualizarse con un preaviso mínimo de 30 días.</p>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold">5.3 Código promocional CROWDFOUNDER</h3>
                <p className="text-muted-foreground">Los usuarios que utilicen el código <strong className="text-foreground">CROWDFOUNDER</strong> durante el periodo promocional obtendrán acceso al plan Pro de forma gratuita durante 365 días. Este código es de uso único por cuenta, intransferible y no canjeable por dinero en efectivo. Crowdfolio se reserva el derecho de revocar la promoción en caso de uso fraudulento.</p>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold">5.4 Facturación y renovación</h3>
                <p className="text-muted-foreground">Los planes de pago se facturan de forma recurrente (mensual o anual) mediante Stripe. La suscripción se renueva automáticamente al final de cada periodo salvo cancelación previa. Puedes cancelar en cualquier momento desde el portal de cliente; el acceso Pro se mantiene hasta el fin del periodo ya pagado.</p>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold">5.5 Reembolsos</h3>
                <p className="text-muted-foreground">Dada la naturaleza digital del servicio, no se realizan reembolsos salvo error técnico imputable a Crowdfolio o en los casos legalmente exigidos por la normativa de consumidores (Ley 3/2014 y TRLGDCU). Las solicitudes de reembolso deben dirigirse a <a href="mailto:soporte@crowdfolio.es" className="text-[#79c6fa] underline">soporte@crowdfolio.es</a> en un plazo máximo de 14 días desde el cargo.</p>
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-base font-semibold">6. Uso aceptable</h2>
              <p className="text-muted-foreground">El usuario se compromete a usar el Servicio de conformidad con la ley y con estos Términos. Queda expresamente prohibido:</p>
              <ul className="list-disc pl-5 text-muted-foreground space-y-1">
                <li>Introducir datos falsos, datos de terceros sin su consentimiento, o datos obtenidos de forma ilícita.</li>
                <li>Intentar acceder a datos de otros usuarios o vulnerar la seguridad del sistema.</li>
                <li>Usar el Servicio para fines ilegales, fraudulentos o que perjudiquen a terceros.</li>
                <li>Realizar ingeniería inversa, descompilar o extraer el código fuente de la aplicación.</li>
                <li>Usar sistemas automatizados (bots, scrapers) para interactuar con el Servicio sin autorización expresa.</li>
                <li>Revender, sublicenciar o comercializar el acceso al Servicio.</li>
              </ul>
              <p className="text-muted-foreground">El incumplimiento de estas condiciones puede dar lugar a la suspensión o cancelación inmediata de la cuenta, sin derecho a reembolso.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-base font-semibold">7. Propiedad intelectual</h2>
              <p className="text-muted-foreground">Todo el contenido del Servicio (incluyendo el código fuente, diseño, logotipos, textos, gráficos y funcionalidades) es propiedad de Daniel Sánchez Ramírez o de sus licenciantes, y está protegido por la legislación española e internacional sobre propiedad intelectual e industrial.</p>
              <p className="text-muted-foreground">Se concede al usuario una licencia personal, no exclusiva, intransferible y revocable para usar el Servicio exclusivamente para sus fines personales y no comerciales.</p>
              <p className="text-muted-foreground">Los datos que el usuario introduce en el Servicio (inversiones, pagos, notas) son de su exclusiva propiedad. Crowdfolio no adquiere ningún derecho sobre ellos más allá de los necesarios para prestar el servicio.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold">8. Disponibilidad y mantenimiento</h2>
              <p className="text-muted-foreground">Crowdfolio se esfuerza por mantener el Servicio disponible de forma continua, pero no garantiza una disponibilidad del 100%. Pueden producirse interrupciones por mantenimiento, actualizaciones o causas de fuerza mayor. Cuando sea posible, se avisará con antelación de los periodos de mantenimiento programado.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-base font-semibold">9. Limitación de responsabilidad</h2>
              <p className="text-muted-foreground">En la máxima medida permitida por la legislación aplicable:</p>
              <ul className="list-disc pl-5 text-muted-foreground space-y-1">
                <li>Crowdfolio no garantiza la exactitud, integridad o idoneidad de la información fiscal generada por la aplicación para ningún caso concreto.</li>
                <li>Crowdfolio no es responsable de las decisiones de inversión o fiscales que el usuario tome basándose en la información proporcionada por el Servicio.</li>
                <li>Crowdfolio no es responsable de pérdidas de datos causadas por el usuario, por terceros, o por circunstancias fuera de su control razonable.</li>
                <li>La responsabilidad total de Crowdfolio frente al usuario, por cualquier causa, no excederá del importe pagado por el usuario durante los 12 meses anteriores al hecho que origina la reclamación.</li>
              </ul>
              <p className="text-muted-foreground">Nada en estos Términos excluye ni limita la responsabilidad de Crowdfolio en los casos en que dicha exclusión o limitación no esté permitida por ley (incluyendo muerte, lesiones personales por negligencia, o fraude).</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold">10. Cancelación y eliminación de cuenta</h2>
              <p className="text-muted-foreground">Puedes cancelar tu cuenta en cualquier momento desde los ajustes de la aplicación o escribiendo a <a href="mailto:soporte@crowdfolio.es" className="text-[#79c6fa] underline">soporte@crowdfolio.es</a>. Tras la cancelación, tus datos se eliminarán en un plazo máximo de 30 días, salvo los que deban conservarse por obligación legal (ver Política de Privacidad).</p>
              <p className="text-muted-foreground">Crowdfolio se reserva el derecho de suspender o cancelar cuentas que incumplan estos Términos, con notificación previa salvo en casos de gravedad que requieran acción inmediata.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold">11. Modificación de los términos</h2>
              <p className="text-muted-foreground">Podemos modificar estos Términos para reflejar cambios en el Servicio, en la legislación aplicable o en el modelo de negocio. Los cambios significativos se comunicarán por correo electrónico o mediante aviso en la aplicación con al menos 30 días de antelación. El uso continuado del Servicio tras la entrada en vigor de los nuevos Términos implica su aceptación.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold">12. Ley aplicable y jurisdicción</h2>
              <p className="text-muted-foreground">Estos Términos se rigen por la legislación española. Para cualquier controversia derivada del uso del Servicio, las partes se someten a los juzgados y tribunales de Valencia (España), sin perjuicio de los fueros imperativos que pudieran corresponder al usuario en su condición de consumidor conforme a la normativa vigente.</p>
              <p className="text-muted-foreground">Para la resolución extrajudicial de conflictos, la Comisión Europea pone a disposición de los consumidores la plataforma ODR: <a href="https://ec.europa.eu/consumers/odr" className="text-[#79c6fa] underline" target="_blank" rel="noopener noreferrer">https://ec.europa.eu/consumers/odr</a>.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold">13. Contacto</h2>
              <p className="text-muted-foreground">Daniel Sánchez Ramírez · <a href="mailto:soporte@crowdfolio.es" className="text-[#79c6fa] underline">soporte@crowdfolio.es</a> · Valencia, España.</p>
            </section>

          </CardContent>
        </Card>
      </div>
    </div>
  );
}
