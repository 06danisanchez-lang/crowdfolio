import { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { Investment, CloseReasonType } from '@/types/investment';
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

interface CloseOption {
  value: CloseReasonType;
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
];

interface Props {
  investment: Investment | null;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<Investment>) => Promise<unknown>;
}

export function CloseInvestmentModal({ investment, onClose, onUpdate }: Props) {
  const [selectedReason, setSelectedReason] = useState<CloseReasonType | null>(null);
  const [newEndDate, setNewEndDate] = useState<Date | undefined>();
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setSelectedReason(null);
    setNewEndDate(undefined);
    setSaving(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) { reset(); onClose(); }
  };

  const handleConfirmClose = async () => {
    if (!investment || !selectedReason || selectedReason === 'extended') return;
    setSaving(true);
    const today = format(new Date(), 'yyyy-MM-dd');
    await onUpdate(investment.id, {
      status: 'completed',
      actualEndDate: today,
      closeReason: selectedReason,
    });
    setSaving(false);
    reset();
    onClose();
  };

  const handleExtend = async () => {
    if (!investment || !newEndDate) return;
    setSaving(true);
    await onUpdate(investment.id, {
      status: 'active',
      expectedEndDate: format(newEndDate, 'yyyy-MM-dd'),
      actualEndDate: null,
      closeReason: null,
      wasExtended: true,
    });
    setSaving(false);
    reset();
    onClose();
  };

  const isExtended = selectedReason === 'extended';

  if (!investment) return null;

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('es-ES', {
      style: 'currency', currency: 'EUR',
      minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(v);

  return (
    <Dialog open={!!investment} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
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
          ) : (
            <Button
              className="flex-1"
              onClick={handleConfirmClose}
              disabled={saving || !selectedReason}
            >
              Confirmar cierre
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
