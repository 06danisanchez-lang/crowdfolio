import { useState } from 'react';
import { buildMaturityChange } from '@/lib/investment/maturityChange';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, CheckCircle2, XCircle, ChevronLeft } from 'lucide-react';
import { Investment, Payment } from '@/types/investment';
import { Button } from '@/components/ui/button';
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
import { getPlatformLabel } from '@/lib/labels';
import type { EquityExitPlan } from '@/lib/investment/equityExit';
import { EquityExitForm } from './EquityExitForm';

type RejectOption = 'extended' | 'delayed' | 'disputed' | 'defaulted';

interface Props {
  investment: Investment | null;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<Investment>) => Promise<unknown>;
  /** Cierre equity: registra el resultado y solo entonces completa (useInvestments.closeEquityInvestment). */
  onCloseEquity?: (
    investmentId: string,
    payments: Omit<Payment, 'id'>[],
    closeUpdates: Pick<Partial<Investment>, 'actualEndDate' | 'closeReason'>,
  ) => Promise<{ error?: string }>;
  /** 'Pérdida total o parcial' no guarda directamente: abre el cuestionario de
   * calificación fiscal (DefaultLossQuestionnaire), que es quien guarda. */
  onDefaulted: (investment: Investment) => void;
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
    description: 'La plataforma ha ampliado el plazo y sigue pagando intereses hasta la nueva fecha',
    needsDate: true,
    emoji: '📅',
  },
  {
    value: 'delayed',
    label: 'Pago retrasado',
    description: 'Cobrarás lo prometido, pero más tarde (sin intereses extra)',
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

export function MaturityConfirmationModal({ investment, onClose, onUpdate, onCloseEquity, onDefaulted }: Props) {
  const [step, setStep] = useState<'confirm' | 'equity-close' | 'reject'>('confirm');
  const [selectedOption, setSelectedOption] = useState<RejectOption | null>(null);
  const [newDate, setNewDate] = useState<Date | undefined>();
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setStep('confirm');
    setSelectedOption(null);
    setNewDate(undefined);
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

    // 'defaulted' no se guarda aquí: abre el cuestionario de calificación
    // fiscal, que es quien hace la actualización real (status + loss_*).
    if (selectedOption === 'defaulted') {
      const inv = investment;
      reset();
      onClose();
      onDefaulted(inv);
      return;
    }

    setSaving(true);
    const newDateStr = newDate ? format(newDate, 'yyyy-MM-dd') : undefined;

    switch (selectedOption) {
      case 'extended':
      case 'delayed':
        if (!newDateStr) break;
        await onUpdate(investment.id, {
          status: 'active',
          ...buildMaturityChange(investment, newDateStr, selectedOption),
        });
        break;
      case 'disputed':
        await onUpdate(investment.id, {
          status: 'active',
          notes: `[DISPUTA] ${investment.notes ?? ''}`.trim(),
        });
        break;
    }
    setSaving(false);
    reset();
    onClose();
  };

  const handleEquityClose = async (plan: EquityExitPlan, exitDate: string): Promise<{ error?: string }> => {
    if (!investment || !onCloseEquity) return { error: 'No se puede cerrar la inversión desde aquí.' };
    setSaving(true);
    const result = await onCloseEquity(investment.id, plan.payments, {
      actualEndDate: exitDate,
      closeReason: 'on_time',
    });
    setSaving(false);
    if (result.error) return result;
    reset();
    onClose();
    return {};
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
                  {getPlatformLabel(investment.platform, investment.customPlatformName)}
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
            <EquityExitForm
              investment={investment}
              closeReason="on_time"
              saving={saving}
              onBack={() => setStep('confirm')}
              onConfirm={handleEquityClose}
            />
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
