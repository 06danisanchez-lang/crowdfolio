import { useState } from 'react';
import { buildMaturityChange } from '@/lib/investment/maturityChange';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { Investment, CloseReasonType, Payment } from '@/types/investment';
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
import type { EquityExitPlan } from '@/lib/investment/equityExit';
import { EquityExitForm } from './EquityExitForm';

type CloseSelection = CloseReasonType | 'defaulted';

interface CloseOption {
  value: CloseSelection;
  label: string;
  description: string;
  emoji: string;
}

const CLOSE_OPTIONS: CloseOption[] = [
  {
    value: 'on_time',
    label: 'En fecha',
    description: 'La plataforma ha devuelto el capital en la fecha prevista',
    emoji: '✅',
  },
  {
    value: 'early',
    label: 'Anticipada',
    description: 'La plataforma ha devuelto el capital antes de lo previsto',
    emoji: '🚀',
  },
  {
    value: 'extended',
    label: 'Prorrogada',
    description: 'La plataforma ha extendido el plazo del proyecto',
    emoji: '📅',
  },
  {
    value: 'sold',
    label: 'Vendida en secundario',
    description: 'Has vendido tu participación en el mercado secundario',
    emoji: '💱',
  },
  {
    value: 'defaulted',
    label: 'Impago',
    description: 'La plataforma ha dejado de pagar y no se espera recuperar todo el capital',
    emoji: '💔',
  },
];

interface Props {
  investment: Investment | null;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<Investment>) => Promise<unknown>;
  /** 'Impago' no se guarda aquí: abre el cuestionario de calificación fiscal
   * (o T9 para equity), igual que desde la confirmación de vencimiento. */
  onDefaulted: (investment: Investment) => void;
  /** Cierre equity: registra el resultado y solo entonces completa
   * (useInvestments.closeEquityInvestment). Sin esto, un equity no se puede
   * cerrar desde aquí: cerrarlo sin resultado lo dejaría fuera del informe fiscal. */
  onCloseEquity?: (
    investmentId: string,
    payments: Omit<Payment, 'id'>[],
    closeUpdates: Pick<Partial<Investment>, 'actualEndDate' | 'closeReason'>,
  ) => Promise<{ error?: string }>;
}

export function CloseInvestmentModal({ investment, onClose, onUpdate, onDefaulted, onCloseEquity }: Props) {
  const [selectedReason, setSelectedReason] = useState<CloseSelection | null>(null);
  const [equityStep, setEquityStep] = useState(false);
  const [closeError, setCloseError] = useState<string | null>(null);
  const [newEndDate, setNewEndDate] = useState<Date | undefined>();
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setSelectedReason(null);
    setNewEndDate(undefined);
    setSaving(false);
    setEquityStep(false);
    setCloseError(null);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) { reset(); onClose(); }
  };

  const handleConfirmDefaulted = () => {
    if (!investment) return;
    const inv = investment;
    reset();
    onClose();
    onDefaulted(inv);
  };

  const isEquityInvestment = investment?.incomeModel === 'equity';

  const handleConfirmClose = async () => {
    if (!investment || !selectedReason || selectedReason === 'extended' || selectedReason === 'defaulted') return;
    // Un equity no puede cerrarse sin registrar lo recibido: el beneficio o la
    // pérdida no llegaría nunca al informe fiscal.
    if (isEquityInvestment) { setEquityStep(true); return; }
    setSaving(true);
    setCloseError(null);
    const today = format(new Date(), 'yyyy-MM-dd');
    const result = await onUpdate(investment.id, {
      status: 'completed',
      actualEndDate: today,
      closeReason: selectedReason,
    });
    setSaving(false);
    if (result && typeof result === 'object' && 'error' in result && typeof result.error === 'string') {
      setCloseError(result.error);
      return;
    }
    reset();
    onClose();
  };

  const handleEquityClose = async (plan: EquityExitPlan, exitDate: string): Promise<{ error?: string }> => {
    if (!investment || !onCloseEquity || !selectedReason || selectedReason === 'extended' || selectedReason === 'defaulted') {
      return { error: 'No se puede cerrar la inversión desde aquí.' };
    }
    setSaving(true);
    const result = await onCloseEquity(investment.id, plan.payments, {
      actualEndDate: exitDate,
      closeReason: selectedReason,
    });
    setSaving(false);
    if (result.error) return result;
    reset();
    onClose();
    return {};
  };

  const handleExtend = async () => {
    if (!investment || !newEndDate) return;
    setSaving(true);
    await onUpdate(investment.id, {
      status: 'active',
      ...buildMaturityChange(investment, format(newEndDate, 'yyyy-MM-dd'), 'extended'),
      actualEndDate: null,
      closeReason: null,
    });
    setSaving(false);
    reset();
    onClose();
  };

  const isExtended = selectedReason === 'extended';
  const isDefaulted = selectedReason === 'defaulted';

  if (!investment) return null;

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('es-ES', {
      style: 'currency', currency: 'EUR',
      minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(v);

  return (
    <Dialog open={!!investment} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        {equityStep && selectedReason && selectedReason !== 'extended' && selectedReason !== 'defaulted' ? (
          <EquityExitForm
            investment={investment}
            closeReason={selectedReason}
            saving={saving}
            onBack={() => setEquityStep(false)}
            onConfirm={handleEquityClose}
          />
        ) : (
        <>
        <DialogHeader>
          <DialogTitle>Cerrar inversión</DialogTitle>
          <DialogDescription>
            Selecciona cómo ha finalizado <strong>{investment.projectName}</strong>.
          </DialogDescription>
        </DialogHeader>

        {/* Investment summary */}
        <div className="rounded-lg border bg-muted/30 p-3 space-y-1 text-sm">
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
        </div>

        {/* Reason selector */}
        <div className="space-y-2">
          {CLOSE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { setSelectedReason(opt.value); setNewEndDate(undefined); }}
              className={cn(
                'w-full text-left rounded-lg border p-3 transition-colors hover:bg-accent',
                selectedReason === opt.value && 'border-primary bg-primary/5',
              )}
            >
              <div className="flex items-start gap-3">
                <span className="text-lg mt-0.5">{opt.emoji}</span>
                <div>
                  <p className="text-sm font-medium">{opt.label}</p>
                  <p className="text-xs text-muted-foreground">{opt.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Date picker — only for extended */}
        {isExtended && (
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Nueva fecha prevista de vencimiento</p>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                  {newEndDate
                    ? format(newEndDate, "d 'de' MMMM 'de' yyyy", { locale: es })
                    : 'Selecciona una fecha'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={newEndDate}
                  onSelect={setNewEndDate}
                  initialFocus
                  fromDate={new Date()}
                />
              </PopoverContent>
            </Popover>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <Button variant="outline" className="flex-1" onClick={() => { reset(); onClose(); }} disabled={saving}>
            Cancelar
          </Button>

          {isExtended ? (
            <Button
              className="flex-1"
              onClick={handleExtend}
              disabled={saving || !newEndDate}
            >
              Actualizar prórroga
            </Button>
          ) : isDefaulted ? (
            <Button
              className="flex-1"
              onClick={handleConfirmDefaulted}
              disabled={saving}
            >
              Continuar
            </Button>
          ) : (
            <Button
              className="flex-1"
              onClick={handleConfirmClose}
              disabled={saving || !selectedReason || (isEquityInvestment && !onCloseEquity)}
            >
              {isEquityInvestment ? 'Continuar' : 'Confirmar cierre'}
            </Button>
          )}
        </div>
        {closeError && <p className="text-sm text-destructive">{closeError}</p>}
        </>
        )}
      </DialogContent>
    </Dialog>
  );
}
