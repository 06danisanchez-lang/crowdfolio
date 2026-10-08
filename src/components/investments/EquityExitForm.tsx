import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { AlertTriangle, CalendarIcon, ChevronLeft, Info } from 'lucide-react';
import { CloseReasonType, Investment } from '@/types/investment';
import { buildEquityExitPlan, EquityExitPlan, getEquityNetCapital } from '@/lib/investment/equityExit';
import { parseSpanishNumber } from '@/lib/investment/parseSpanishNumber';
import { toDateOnlyString } from '@/lib/dateOnly';
import { getDefaultWithholding, getDefaultWithholdingRate, validateWithholding } from '@/lib/tax/withholding';
import { ForeignAmountField } from '@/components/common/ForeignAmountField';
import { EMPTY_FOREIGN_AMOUNT, foreignAmountToEur, formatForeignAmount, isForeignCurrency, withForeignFields, type ForeignAmountInput } from '@/lib/currency/fx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface Props {
  investment: Investment;
  closeReason?: CloseReasonType | null;
  saving: boolean;
  onBack: () => void;
  /** Guarda el resultado y cierra. Debe devolver error si no se ha guardado. */
  onConfirm: (plan: EquityExitPlan, exitDate: string) => Promise<{ error?: string }>;
}

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('es-ES', {
    style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(v);

export function EquityExitForm({ investment, closeReason, saving, onBack, onConfirm }: Props) {
  const [amountInput, setAmountInput] = useState('');
  const [exitDate, setExitDate] = useState<Date>(() => new Date());
  const [submitError, setSubmitError] = useState<string | null>(null);
  // Retención sobre el beneficio repartido como dividendo. Se propone sola
  // (19 % en plataformas españolas) hasta que el usuario la cambia.
  const [withholdingInput, setWithholdingInput] = useState('');
  const [withholdingTouched, setWithholdingTouched] = useState(false);

  const netCapital = getEquityNetCapital(investment);
  const accumulatedCapitalReturn = Math.round((investment.amount - netCapital) * 100) / 100;
  const parsed = parseSpanishNumber(amountInput);
  const exitDateStr = toDateOnlyString(exitDate);
  // Equity en otra divisa (p. ej. Crowdcube en libras): el importe se escribe
  // en la divisa y se pasa a euros al tipo del día del cobro.
  const isForeign = isForeignCurrency(investment.currency);
  const [fx, setFx] = useState<ForeignAmountInput>(EMPTY_FOREIGN_AMOUNT);
  const amountReceivedEur = isForeign
    ? foreignAmountToEur(fx)
    : (parsed.error || parsed.value === null || parsed.value < 0 ? null : parsed.value);

  const basePlan = useMemo(() => {
    if (amountReceivedEur == null) return null;
    const p = buildEquityExitPlan({
      investment, amountReceived: amountReceivedEur, date: exitDateStr, closeReason,
    });
    if (!isForeign || !fx.exchangeRate) return p;
    return {
      ...p,
      payments: withForeignFields(p.payments, investment.currency!, fx.exchangeRate, fx.exchangeRateDate ?? exitDateStr, fx.exchangeRateSource ?? 'manual'),
    };
  }, [amountReceivedEur, investment, exitDateStr, closeReason, isForeign, fx.exchangeRate, fx.exchangeRateDate, fx.exchangeRateSource]);

  const dividendAmount = basePlan?.payments.find(p => p.type === 'dividend')?.amount ?? 0;
  const proposedWithholding = getDefaultWithholding(dividendAmount, 'dividend', isForeign ? 'other' : investment.platform);
  const parsedWithholding = parseSpanishNumber(withholdingInput);
  const withholding = !withholdingTouched
    ? proposedWithholding
    : (parsedWithholding.error ? NaN : (parsedWithholding.value ?? 0));
  const withholdingError = dividendAmount > 0
    ? (parsedWithholding.error && withholdingTouched ? parsedWithholding.error : validateWithholding(withholding, dividendAmount))
    : null;

  // El dividendo guarda la retención; el resto de pagos del cierre no llevan.
  const plan = useMemo<EquityExitPlan | null>(() => {
    if (!basePlan) return null;
    if (dividendAmount <= 0 || withholdingError) return basePlan;
    return {
      ...basePlan,
      payments: basePlan.payments.map(p => p.type === 'dividend' ? { ...p, withholdingApplied: withholding } : p),
    };
  }, [basePlan, dividendAmount, withholding, withholdingError]);

  const handleConfirm = async () => {
    if (!plan || withholdingError) return;
    setSubmitError(null);
    const result = await onConfirm(plan, exitDateStr);
    if (result.error) setSubmitError(result.error);
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Registrar importe recibido</DialogTitle>
        <DialogDescription>
          Introduce el importe total que has recibido al cierre de{' '}
          <strong>{investment.projectName}</strong>, incluido el capital. Crowdfolio separa el capital
          devuelto del beneficio o la pérdida.
        </DialogDescription>
      </DialogHeader>

      <div className="rounded-lg border bg-muted/30 p-4 space-y-1.5 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Capital invertido original</span>
          <span className="font-medium">
            {formatCurrency(investment.amount)}
            {isForeign && investment.originalAmount != null && (
              <span className="text-xs text-muted-foreground"> ({formatForeignAmount(investment.originalAmount, investment.currency!)})</span>
            )}
          </span>
        </div>
        {accumulatedCapitalReturn > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Prima de emisión ya devuelta</span>
            <span className="font-medium text-muted-foreground">− {formatCurrency(accumulatedCapitalReturn)}</span>
          </div>
        )}
        <div className="flex justify-between font-medium">
          <span>Capital pendiente de devolver</span>
          <span>{formatCurrency(netCapital)}</span>
        </div>
        {plan && (
          <div className={`flex justify-between font-semibold border-t pt-1.5 ${plan.result >= 0 ? 'text-green-700 dark:text-green-400' : 'text-destructive'}`}>
            <span>{plan.result >= 0 ? 'Beneficio' : 'Pérdida'}</span>
            <span>{formatCurrency(plan.result)}</span>
          </div>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {!isForeign && (
        <div className="space-y-1.5">
          <p className="text-sm font-medium">Importe total recibido (€)</p>
          <p className="text-xs text-muted-foreground">Bruto, antes de retenciones (como en el certificado de la plataforma).</p>
          <Input
            inputMode="decimal"
            placeholder="ej. 1.500,50"
            value={amountInput}
            onChange={e => { setAmountInput(e.target.value); setSubmitError(null); }}
            aria-invalid={!!parsed.error}
          />
          {parsed.error && <p className="text-xs text-destructive">{parsed.error}</p>}
        </div>
        )}
        <div className="space-y-1.5">
          <p className="text-sm font-medium">Fecha de cobro</p>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                {format(exitDate, 'dd/MM/yyyy', { locale: es })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={exitDate}
                onSelect={d => d && setExitDate(d)}
                initialFocus
                toDate={new Date()}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {isForeign && (
        <div className="rounded-lg border bg-muted/30 p-3">
          <ForeignAmountField
            idPrefix="equity-exit"
            currency={investment.currency!}
            date={exitDateStr}
            value={fx}
            onChange={(v) => { setFx(v); setSubmitError(null); }}
            amountLabel="Importe total recibido, bruto"
          />
        </div>
      )}

      {plan && plan.treatment === 'rcm_dividend' && dividendAmount > 0 && (
        <div className="space-y-1.5 sm:max-w-[50%]">
          <p className="text-sm font-medium">Retención sobre el beneficio (€)</p>
          <Input
            inputMode="decimal"
            aria-label="Retención sobre el beneficio (€)"
            placeholder="0,00"
            value={withholdingTouched ? withholdingInput : (proposedWithholding ? proposedWithholding.toFixed(2).replace('.', ',') : '')}
            onChange={e => { setWithholdingTouched(true); setWithholdingInput(e.target.value); setSubmitError(null); }}
            aria-invalid={!!withholdingError}
          />
          <p className="text-xs text-muted-foreground">
            {getDefaultWithholdingRate(investment.platform) > 0
              ? 'Propuesta: 19 % del beneficio, lo que retienen las plataformas españolas. Cámbiala si tu certificado dice otra cosa.'
              : 'Las plataformas extranjeras no practican retención española. Si la tuya es española, normalmente retiene el 19 %.'}
          </p>
          {withholdingError && <p className="text-xs text-destructive">{withholdingError}</p>}
        </div>
      )}
      {plan && plan.treatment === 'rcm_dividend' && (
        <div className="flex gap-2 rounded-lg border p-3 text-sm text-muted-foreground">
          <Info className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            El beneficio se registrará como dividendo (rendimiento del capital mobiliario), que es como lo
            reparten normalmente las plataformas. Comprueba en su certificado fiscal si es así en tu caso.
          </span>
        </div>
      )}
      {plan && plan.treatment === 'gpp_manual' && (
        <div className="flex gap-2 rounded-lg border border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30 p-3 text-sm text-amber-800 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            {plan.result > 0
              ? 'Es una ganancia patrimonial (liquidación de la sociedad o venta), no un dividendo.'
              : 'Es una pérdida patrimonial.'}{' '}
            Crowdfolio no la incluye en el cálculo automático: aparecerá en Fiscalidad como operación a
            declarar manualmente. Consúltalo con tu asesor.
          </span>
        </div>
      )}

      {submitError && <p className="text-sm text-destructive">{submitError}</p>}

      <div className="flex gap-3 pt-1">
        <Button variant="outline" size="sm" onClick={onBack} disabled={saving}>
          <ChevronLeft className="mr-1 h-4 w-4" />
          Atrás
        </Button>
        <Button className="flex-1" onClick={handleConfirm} disabled={saving || !plan || !!withholdingError}>
          Confirmar y cerrar inversión
        </Button>
      </div>
    </>
  );
}
