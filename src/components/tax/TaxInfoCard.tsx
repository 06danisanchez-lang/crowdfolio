import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { FileText, Info, AlertCircle, Calculator, ArrowLeftRight, Clock } from 'lucide-react';

export function TaxInfoCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="h-5 w-5" />
          Información Fiscal España - IRPF 2025
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          {/* Tax Brackets */}
          <AccordionItem value="brackets">
            <AccordionTrigger className="text-sm">
              <span className="flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                Tramos del Ahorro 2025
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2 text-sm">
                <p className="text-muted-foreground mb-3">
                  Los rendimientos del capital mobiliario tributan con estos tramos progresivos:
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-muted/50 p-2">
                    <span className="text-muted-foreground">0 - 6.000€</span>
                    <span className="float-right font-medium">19%</span>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-2">
                    <span className="text-muted-foreground">6.000 - 50.000€</span>
                    <span className="float-right font-medium">21%</span>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-2">
                    <span className="text-muted-foreground">50.000 - 200.000€</span>
                    <span className="float-right font-medium">23%</span>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-2">
                    <span className="text-muted-foreground">200.000 - 300.000€</span>
                    <span className="float-right font-medium">27%</span>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-2 col-span-2">
                    <span className="text-muted-foreground">Más de 300.000€</span>
                    <span className="float-right font-medium">30%</span>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* RCM vs GPP */}
          <AccordionItem value="buckets">
            <AccordionTrigger className="text-sm">
              <span className="flex items-center gap-2">
                <ArrowLeftRight className="h-4 w-4" />
                Cajones: RCM vs GPP
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4 text-sm">
                <div className="rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/30 p-3">
                  <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-1">
                    RCM - Rendimientos del Capital Mobiliario
                  </h4>
                  <ul className="text-blue-700 dark:text-blue-300 text-xs space-y-1">
                    <li>• Intereses de préstamos y cuentas</li>
                    <li>• Dividendos de acciones y participaciones</li>
                    <li>• Se resta: gastos de administración y custodia</li>
                  </ul>
                </div>
                
                <div className="rounded-lg border border-purple-200 dark:border-purple-900 bg-purple-50 dark:bg-purple-950/30 p-3">
                  <h4 className="font-medium text-purple-800 dark:text-purple-200 mb-1">
                    GPP - Ganancias y Pérdidas Patrimoniales
                  </h4>
                  <ul className="text-purple-700 dark:text-purple-300 text-xs space-y-1">
                    <li>• Ganancias por venta de participaciones</li>
                    <li>• Pérdidas por ventas o impagos</li>
                    <li>• Se calcula: precio venta - coste adquisición</li>
                  </ul>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* 25% Rule */}
          <AccordionItem value="compensation">
            <AccordionTrigger className="text-sm">
              <span className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Regla del 25% - Compensación Cruzada
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  <strong className="text-foreground">¿Qué es?</strong> Si tienes pérdidas en un cajón (RCM o GPP), 
                  puedes usarlas para reducir los beneficios del otro cajón.
                </p>
                <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 p-3">
                  <p className="text-amber-800 dark:text-amber-200 font-medium">
                    ⚠️ Límite: Máximo el 25% de los beneficios del cajón destino.
                  </p>
                </div>
                <p>
                  <strong className="text-foreground">Ejemplo:</strong> Si tienes 4.000€ de pérdidas en GPP 
                  y 8.000€ de beneficios en RCM, solo puedes compensar 2.000€ (25% de 8.000€).
                  Los otros 2.000€ de pérdidas se arrastran a años siguientes.
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Loss Carryforward */}
          <AccordionItem value="carryforward">
            <AccordionTrigger className="text-sm">
              <span className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Pérdidas Compensables (4 años)
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  Las pérdidas que no puedas compensar en un año pueden arrastrarse a los 
                  <strong className="text-foreground"> 4 años siguientes</strong>.
                </p>
                <p>
                  Primero se compensan las pérdidas más antiguas. Es importante registrar 
                  correctamente las pérdidas de cada año para no perder este derecho.
                </p>
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs">
                    <strong>Importante:</strong> Si no declaras las pérdidas en el año que se producen, 
                    pierdes el derecho a compensarlas en ejercicios futuros.
                  </p>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Devengo */}
          <AccordionItem value="devengo">
            <AccordionTrigger className="text-sm">
              <span className="flex items-center gap-2">
                <Info className="h-4 w-4" />
                Devengo vs Cobro
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3 text-sm text-muted-foreground">
                <div className="rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 p-3">
                  <h4 className="font-medium text-green-800 dark:text-green-200 mb-1">
                    Fecha de Devengo (para impuestos)
                  </h4>
                  <p className="text-green-700 dark:text-green-300 text-xs">
                    Cuando el dinero está disponible en la plataforma para ti, aunque no lo retires a tu banco.
                  </p>
                </div>
                
                <div className="rounded-lg bg-muted/50 p-3">
                  <h4 className="font-medium mb-1">Fecha de Cobro (no relevante)</h4>
                  <p className="text-xs">
                    Cuando transfieres el dinero de la plataforma a tu cuenta bancaria. 
                    Este momento NO es relevante fiscalmente.
                  </p>
                </div>

                <p className="text-xs">
                  <strong className="text-foreground">En resumen:</strong> Tributas cuando el dinero está disponible 
                  en la plataforma, no cuando lo retiras al banco.
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
        
        <p className="text-xs text-muted-foreground mt-4 pt-4 border-t">
          * Esta información es orientativa. Consulta con un asesor fiscal para tu situación particular.
        </p>
      </CardContent>
    </Card>
  );
}
