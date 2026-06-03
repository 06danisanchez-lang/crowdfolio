import { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, CheckCircle2, XCircle, ChevronLeft, AlertTriangle } from 'lucide-react';
import { Investment, Payment } from '@/types/investment';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

type RejectOption = 'extended' | 'delayed' | 'disputed' | 'defaulted';

interface Props {
  investment: Investment | null;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<Investment>) => Promise<unknown>;
  onAddPayment?: (investmentId: string, payment: Omit<Payment, 'id'>) => Promise<unknown>;
}

const REJECT_OPTIONS: {
  value: RejectOption;
  label: string;
  description: string;
  needsDate: boolean;
  emoji: string;
}[] = [
  {
    value: 'extended',
    label: 'Proyecto prorrogado',
    description: 'La plataforma ha extendido el plazo oficialmente',
    needsDate: true,
    emoji: '📅',
  },
  {
    value: 'delayed',
    label: 'Pago retrasado',
    description: 'El cobro llegará, pero con retraso',
    needsDate: true,
    emoji: '⏳',
  },
  {
    value: 'disputed',
    label: 'En disputa con la plataforma',
    description: 'Hay un conflicto activo; seguirás vigilándola',
    needsDate: false,
    emoji: '⚠️',
  },
  {
    value: 'defaulted',
    label: 'Pérdida total o parcial',
    description: 'La inversión no se recuperará',
    needsDate: false,
    emoji: '💔',
  },
];

export function MaturityConfirmationModal({ investment, onClose, onUpdate, onAddPayment }: Props) {
  const [step, setStep] = useState<'confirm' | 'equity-close' | 'reject'>('confirm');
  const [selectedOption, setSelectedOption] = useState<RejectOption | null>(null);
  const [newDate, setNewDate] = useState<Date | undefined>();
  const [amountReceived, setAmountReceived] = useState('');
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setStep('confirm');
    setSelectedOption(null);
    setNewDate(undefined);
    setAmountReceived('');
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) { reset(); onClose(); }
  };

  const handleComplete = async () => {
    setSaving(true);
    await onUpdate(investment!.id, { status: 'completed' });
    setSaving(false);
    reset();
    onClose();
  };

  const currentOption = REJECT_OPTIONS.find(o => o.value === selectedOption);

  const handleRejectConfirm = async () => {
    if (!selectedOption || !investment) return;
    if (currentOption?.needsDate && !newDate) return;
    setSaving(true);
    const newDateStr = newDate ? format(newDate, 'yyyy-MM-dd') : undefined;

    switch (selectedOption) {
      case 'extended':
      case 'delayed':
        await onUpdate(investment.id, { status: 'active', expectedEndDate: newDateStr });
        break;
      case 'disputed':
        await onUpdate(investment.id, {
          status: 'active',
          notes: `[DISPUTA] ${investment.notes ?? ''}`.trim(),
        });
        break;
      case 'defaulted':
        await onUpdate(investment.id, { status: 'defaulted', defaultedAt: new Date().toISOString() });
        break;
    }
    setSaving(false);
    reset();
    onClose();
  };

  const handleEquityClose = async () => {
    if (!investment || !onAddPayment) return;
    const parsed = parseFloat(amountReceived.replace(',', '.'));
    if (isNaN(parsed) || parsed < 0) return;
    setSaving(true);
    const accumulatedCapitalReturn = (investment.payments ?? [])
      .filter(p => p.type === 'capital_return')
      .reduce((sum, p) => sum + p.amount, 0);
    const netCapital = investment.amount - accumulatedCapitalReturn;
    const profit = parsed - netCapital;
    const today = format(new Date(), 'yyyy-MM-dd');
    await onAddPayment(investment.id, { date: today, amount: profit, type: 'dividend' });
    await onUpdate(investment.id, { status: 'completed' });
    setSaving(false);
    reset();
    onClose();
  };

  const isEquity = investment?.incomeModel === 'equity';
  const equityConfirmQuestion = () => {
    if (!isEquity) return '¿Ha vencido esta inversión?';
    switch (investment?.equityType) {
      case 'plusvalia': return '¿Has recibido la liquidación del proyecto y la plusvalía?';
      case 'rentas': return '¿Se ha vendido el activo y has recibido la plusvalía final?';
      case 'liquidacion': return '¿Has recibido la cuota de liquidación de la sociedad?';
      default: return '¿Ha vencido esta inversión?';
    }
  };

  if (!investment) return null;

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('es-ES', {
      style: 'currency', currency: 'EUR',
      minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(v);

  const accumulatedCapitalReturn = (investment.payments ?? [])
    .filter(p => p.type === 'capital_return')
    .reduce((sum, p) => sum + p.amount, 0);
  const netCapital = investment.amount - accumulatedCapitalReturn;
  const parsedAmount = parseFloat(amountReceived.replace(',', '.'));
  const profit = !isNaN(parsedAmount) ? parsedAmount - netCapital : null;

  return (
    <Dialog open={!!investment} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        {step === 'confirm' ? (
          <>
            <DialogHeader>
              <DialogTitle>{equityConfirmQuestion()}</DialogTitle>
              <DialogDescription>
                La fecha de vencimiento de <strong>{investment.projectName}</strong> ya ha pasado.
                Confirma su estado para mantener tu cartera al día.
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-lg border bg-muted/30 p-4 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Capital</span>
                <span className="font-medium">{formatCurrency(investment.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Vencimiento previsto</span>
                <span className="font-medium">
                  {investment.expectedEndDate
                    ? format(new Date(investment.expectedEndDate + 'T00:00:00'), "d 'de' MMMM 'de' yyyy", { locale: es })
                    : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Rentabilidad esperada</span>
                <span className="font-medium">{investment.expectedReturn}% anual</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Plataforma</span>
                <span className="font-medium">
                  {investment.customPlatformName ?? investment.platform}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              <Button
                className="flex-1"
                onClick={isEquity ? () => setStep('equity-close') : handleComplete}
                disabled={saving}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Sí, está completada
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setStep('reject')}
                disabled={saving}
              >
                <XCircle className="mr-2 h-4 w-4" />
                No, algo ha pasado
              </Button>
            </div>
          </>
        ) : step === 'equity-close' ? (
          <>
            <DialogHeader>
              <DialogTitle>Registrar importe recibido</DialogTitle>
              <DialogDescription>
                Introduce el importe total que has recibido al cierre de{' '}
                <strong>{investment.projectName}</strong>. Crowdfolio calculará el beneficio automáticamente.
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-lg border bg-muted/30 p-4 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Capital invertido original</span>
                <span className="font-medium">{formatCurrency(investment.amount)}</span>
              </div>
              {accumulatedCapitalReturn > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Rentas devueltas previamente</span>
                  <span className="font-medium text-muted-foreground">− {formatCurrency(accumulatedCapitalReturn)}</span>
                </div>
              )}
              <div className="flex justify-between font-medium">
                <span>Capital neto pendiente</span>
                <span>{formatCurrency(netCapital)}</span>
              </div>
              {profit !== null && (
                <div className={`flex justify-between font-semibold border-t pt-1.5 ${profit >= 0 ? 'text-green-700 dark:text-green-400' : 'text-destructive'}`}>
                  <span>{profit >= 0 ? 'Beneficio registrado' : 'Pérdida registrada'}</span>
                  <span>{formatCurrency(profit)}</span>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <p className="text-sm font-medium">Importe total recibido (€)</p>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0,00"
                value={amountReceived}
                onChange={e => setAmountReceived(e.target.value)}
              />
            </div>

            {investment.equityType === 'liquidacion' && (
              <div className="flex gap-2 rounded-lg border border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30 p-3 text-sm text-amber-800 dark:text-amber-300">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>Este pago puede no llevar retención previa. Recuerda declararlo manualmente en tu IRPF.</span>
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep('confirm')}
                disabled={saving}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Atrás
              </Button>
              <Button
                className="flex-1"
                onClick={handleEquityClose}
                disabled={saving || !amountReceived || isNaN(parseFloat(amountReceived.replace(',', '.')))}
              >
                Confirmar y cerrar inversión
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>¿Qué ha ocurrido?</DialogTitle>
              <DialogDescription>
                Selecciona la situación para actualizar el estado de{' '}
                <strong>{investment.projectName}</strong>.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              {REJECT_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { setSelectedOption(opt.value); setNewDate(undefined); }}
                  className={cn(
                    'w-full text-left rounded-lg border p-3 transition-colors hover:bg-accent',
                    selectedOption === opt.value && 'border-primary bg-primary/5',
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-xl mt-0.5">{opt.emoji}</span>
                    <div>
                      <p className="text-sm font-medium">{opt.label}</p>
                      <p className="text-xs text-muted-foreground">{opt.description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {currentOption?.needsDate && (
              <div className="space-y-1.5">
                <p className="text-sm font-medium">
                  {selectedOption === 'extended'
                    ? 'Nueva fecha de vencimiento'
                    : 'Fecha estimada de cobro'}
                </p>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                      {newDate
                        ? format(newDate, "d 'de' MMMM 'de' yyyy", { locale: es })
                        : 'Selecciona una fecha'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={newDate}
                      onSelect={setNewDate}
                      initialFocus
                      fromDate={new Date()}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setStep('confirm'); setSelectedOption(null); setNewDate(undefined); }}
                disabled={saving}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Atrás
              </Button>
              <Button
                className="flex-1"
                onClick={handleRejectConfirm}
                disabled={saving || !selectedOption || (currentOption?.needsDate === true && !newDate)}
              >
                Confirmar
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
