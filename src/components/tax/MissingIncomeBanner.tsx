import { AlertTriangle, Info } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { countInstallments, MissingIncome, MissingIncomeItem } from '@/lib/tax/missingIncome';

/**
 * Lo que le falta al informe del año (ver lib/tax/missingIncome.ts):
 *  - cuotas cobradas sin detalle → el informe está INCOMPLETO (rojo);
 *  - cuotas vencidas sin cobro registrado → aviso (gris).
 */
export function MissingIncomeBanner({ year, missing, onOpenInvestment, onViewPayments }: {
  year: number;
  missing: MissingIncome;
  onOpenInvestment?: (investmentId: string) => void;
  onViewPayments?: () => void;
}) {
  const assumedCount = countInstallments(missing.assumed);
  const unconfirmedCount = countInstallments(missing.unconfirmed);
  if (assumedCount === 0 && unconfirmedCount === 0) return null;

  return (
    <div className="space-y-2">
      {assumedCount > 0 && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-900 dark:border-red-800 dark:bg-red-950/30 dark:text-red-200">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="space-y-1">
              <p className="font-semibold">Informe {year} incompleto: faltan los cobros de {assumedCount === 1 ? '1 cuota' : `${assumedCount} cuotas`} de intereses</p>
              <p>
                Las marcaste como cobradas, pero sin registrar su importe ni su retención, así que no están en este informe.
                Si lo exportas, saldrá como borrador.
              </p>
              <ItemList items={missing.assumed} onOpenInvestment={onOpenInvestment} />
              {onViewPayments && (
                <button type="button" onClick={onViewPayments} className="font-medium underline underline-offset-2">
                  Importar los cobros desde el extracto de la plataforma
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {unconfirmedCount > 0 && (
        <div className="rounded-lg border bg-muted/50 p-3 text-sm text-muted-foreground">
          <div className="flex items-start gap-2">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="space-y-1">
              <p>
                {unconfirmedCount === 1 ? '1 cuota de intereses' : `${unconfirmedCount} cuotas de intereses`} de {year} vencida{unconfirmedCount === 1 ? '' : 's'} sin cobro
                registrado: cuentan como retrasos y no suman en el informe. Si las cobraste, regístralas.
              </p>
              <ItemList items={missing.unconfirmed} onOpenInvestment={onOpenInvestment} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ItemList({ items, onOpenInvestment }: { items: MissingIncomeItem[]; onOpenInvestment?: (id: string) => void }) {
  return (
    <ul className="space-y-0.5 text-xs">
      {items.slice(0, 8).map(item => (
        <li key={item.investmentId}>
          {onOpenInvestment ? (
            <button type="button" className="font-medium underline underline-offset-2" onClick={() => onOpenInvestment(item.investmentId)}>
              {item.projectName}
            </button>
          ) : <span className="font-medium">{item.projectName}</span>}
          {': '}
          {item.dates.map(d => format(parseISO(d), 'dd/MM')).join(', ')}
        </li>
      ))}
      {items.length > 8 && <li>y {items.length - 8} inversiones más</li>}
    </ul>
  );
}
