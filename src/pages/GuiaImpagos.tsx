import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';

export default function GuiaImpagos() {
  const navigate = useNavigate();

  useDocumentMeta(
    'Qué pasa en la renta si un proyecto de crowdfunding no te paga | Crowdfolio',
    'Cuándo puedes declarar la pérdida de un préstamo de crowdlending impagado según el art. 14.2.k de la Ley del IRPF: concurso, quita o ejecución judicial.',
  );

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="mx-auto max-w-3xl">
        <Button variant="ghost" onClick={() => navigate('/landing')} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Qué pasa en la renta si un proyecto de crowdfunding no te paga</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert max-w-none space-y-8 text-sm leading-relaxed">
            <p className="text-muted-foreground">
              Cuando un proyecto de crowdlending deja de pagar, el dinero perdido es real, pero Hacienda no
              permite declararlo como pérdida en cualquier momento. La ley exige que ocurra un hecho formal
              que demuestre que el dinero no se va a recuperar.
            </p>

            <section className="space-y-3">
              <h2 className="text-base font-semibold">Los tres casos en los que puedes declarar la pérdida</h2>
              <ol className="list-decimal space-y-4 pl-5 text-muted-foreground">
                <li>
                  <strong className="text-foreground">Termina el concurso de acreedores sin que cobres.</strong>{' '}
                  Si la sociedad que recibió el préstamo entra en concurso, hay que esperar a que el
                  procedimiento termine. Si termina sin que hayas cobrado, la pérdida se declara en el año en
                  que concluye.
                </li>
                <li>
                  <strong className="text-foreground">Se aprueba una quita.</strong> Si dentro del concurso o
                  en un acuerdo con los acreedores se reduce la deuda, puedes declarar como pérdida el importe
                  de esa reducción en el año en que se hace efectiva. El resto sigue pendiente.
                </li>
                <li>
                  <strong className="text-foreground">Pasa un año desde que empezó una ejecución judicial sin
                  cobrar.</strong> Si no hay concurso pero se ha iniciado un procedimiento judicial para
                  cobrar el préstamo, como una ejecución hipotecaria, la pérdida se puede declarar cuando se
                  cumple un año desde su inicio sin haber cobrado. En crowdfunding inmobiliario, este
                  procedimiento suele iniciarlo la plataforma en nombre de los inversores.
                </li>
              </ol>
            </section>

            <section className="space-y-3">
              <h2 className="text-base font-semibold">¿Y si no se da ninguno?</h2>
              <p className="text-muted-foreground">
                Entonces, aunque el proyecto lleve meses sin pagar, todavía no puedes declarar la pérdida. No
                la pierdes: podrás declararla en el año en que ocurra alguno de estos hechos.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-base font-semibold">¿Dónde se declara?</h2>
              <p className="text-muted-foreground">
                En la base imponible general, en el apartado de ganancias y pérdidas patrimoniales que no
                derivan de la transmisión de elementos patrimoniales. No se compensa con los intereses que
                cobras de otros proyectos, porque estos van a la base del ahorro. Primero se compensa con
                otras ganancias patrimoniales de la base general y, si queda saldo negativo, con rendimientos
                como el salario hasta el 25 % de estos. Lo que no se compense se puede aplicar en los cuatro
                años siguientes.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-base font-semibold">¿Y si luego recupero algo?</h2>
              <p className="text-muted-foreground">
                Si ya habías declarado la pérdida, lo que recuperes se declara como ganancia patrimonial en el
                año en que lo cobres.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-base font-semibold">¿Y en participaciones (equity)?</h2>
              <p className="text-muted-foreground">
                Si invertiste comprando participaciones de una sociedad, no es un préstamo y estas reglas no
                aplican. La pérdida se declara, por lo general, al vender las participaciones o cuando se
                liquida la sociedad.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-base font-semibold">Cómo te ayuda Crowdfolio</h2>
              <p className="text-muted-foreground">
                Cuando marcas una inversión como impago, te hacemos unas preguntas, te decimos si ya puedes
                declararla y desde cuándo, y te avisamos cuando se cumplan los plazos. En tu informe fiscal
                verás cada pérdida en el ejercicio que le corresponde.
              </p>
            </section>

            <p className="text-xs text-muted-foreground border-t pt-4">
              Esta guía es información general y no sustituye el consejo de un asesor fiscal.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
