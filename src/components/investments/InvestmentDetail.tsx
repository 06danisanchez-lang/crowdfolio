import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Plus, Trash2, CalendarIcon } from 'lucide-react';
import { Investment, Payment, PLATFORMS, STATUS_OPTIONS } from '@/types/investment';
import { 
  getInvestmentDurationYears, 
  calculateInvestmentTotalReturn,
  calculateInvestmentTotalReturnPercent 
} from '@/lib/investment/calculations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface InvestmentDetailProps {
  investment: Investment | null;
  onClose: () => void;
  onAddPayment: (investmentId: string, payment: { date: string; amount: number; type: 'dividend' | 'principal' | 'interest'; notes?: string }) => void;
  onDeletePayment: (investmentId: string, paymentId: string) => void;
}

export function InvestmentDetail({ investment, onClose, onAddPayment, onDeletePayment }: InvestmentDetailProps) {
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [paymentDate, setPaymentDate] = useState<Date>(new Date());
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentType, setPaymentType] = useState<'dividend' | 'principal' | 'interest'>('dividend');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const getPlatformLabel = (platform: string, customName?: string) => {
    if (platform === 'other' && customName) return customName;
    return PLATFORMS.find(p => p.value === platform)?.label || platform;
  };

  const getPaymentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      dividend: 'Dividendo',
      principal: 'Principal',
      interest: 'Intereses',
    };
    return labels[type] || type;
  };

  const handleAddPayment = () => {
    if (investment && paymentAmount) {
      onAddPayment(investment.id, {
        date: paymentDate.toISOString(),
        amount: parseFloat(paymentAmount),
        type: paymentType,
      });
      setPaymentAmount('');
      setShowAddPayment(false);
    }
  };

  if (!investment) return null;

  const totalPayments = investment.payments.reduce((sum, p) => sum + p.amount, 0);
  const durationYears = getInvestmentDurationYears(investment.investmentDate, investment.expectedEndDate);
  const totalReturnAmount = calculateInvestmentTotalReturn(investment);
  const totalReturnPercent = calculateInvestmentTotalReturnPercent(investment);
  const expectedTotal = investment.amount + totalReturnAmount;
  const actualReturn = investment.amount > 0 ? ((totalPayments / investment.amount) * 100) : 0;

  return (
    <Dialog open={!!investment} onOpenChange={() => onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-xl">{investment.projectName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Investment Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Plataforma</p>
              <p className="font-medium">{getPlatformLabel(investment.platform, investment.customPlatformName)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Estado</p>
              <Badge className={cn(
                investment.status === 'active' && 'bg-status-active text-white',
                investment.status === 'pending' && 'bg-status-pending text-white',
                investment.status === 'completed' && 'bg-status-completed text-white',
                investment.status === 'defaulted' && 'bg-status-defaulted text-white',
              )}>
                {STATUS_OPTIONS.find(s => s.value === investment.status)?.label}
              </Badge>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Monto Invertido</p>
              <p className="font-medium">{formatCurrency(investment.amount)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Rentabilidad Anual</p>
              <p className="font-medium">{investment.expectedReturn.toFixed(1)}%</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Duración Estimada</p>
              <p className="font-medium">{durationYears.toFixed(1)} años</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Rentabilidad Total</p>
              <p className="font-medium">{totalReturnPercent.toFixed(1)}%</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Fecha de Inversión</p>
              <p className="font-medium">{format(parseISO(investment.investmentDate), 'dd MMM yyyy', { locale: es })}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Vencimiento</p>
              <p className="font-medium">
                {investment.expectedEndDate 
                  ? format(parseISO(investment.expectedEndDate), 'dd MMM yyyy', { locale: es })
                  : 'No especificado'}
              </p>
            </div>
          </div>

          {/* Returns Summary */}
          <div className="rounded-lg bg-muted/50 p-4">
            <h4 className="mb-3 font-semibold">Resumen de Retornos</h4>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-status-active">{formatCurrency(totalPayments)}</p>
                <p className="text-xs text-muted-foreground">Recibido</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">{formatCurrency(expectedTotal)}</p>
                <p className="text-xs text-muted-foreground">Esperado</p>
              </div>
              <div>
                <p className={cn(
                  "text-2xl font-bold",
                  actualReturn >= investment.expectedReturn ? "text-status-active" : "text-muted-foreground"
                )}>
                  {actualReturn.toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground">Rendimiento Real</p>
              </div>
            </div>
          </div>

          {/* Payments List */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h4 className="font-semibold">Pagos Recibidos</h4>
              <Button size="sm" variant="outline" onClick={() => setShowAddPayment(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Añadir Pago
              </Button>
            </div>

            {showAddPayment && (
              <div className="mb-4 rounded-lg border bg-card p-4">
                <div className="grid gap-4 sm:grid-cols-4">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(paymentDate, 'dd/MM/yyyy')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={paymentDate}
                        onSelect={(date) => date && setPaymentDate(date)}
                      />
                    </PopoverContent>
                  </Popover>
                  <Input
                    type="number"
                    placeholder="Monto"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                  />
                  <Select value={paymentType} onValueChange={(v) => setPaymentType(v as typeof paymentType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dividend">Dividendo</SelectItem>
                      <SelectItem value="principal">Principal</SelectItem>
                      <SelectItem value="interest">Intereses</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex gap-2">
                    <Button onClick={handleAddPayment} disabled={!paymentAmount}>
                      Añadir
                    </Button>
                    <Button variant="ghost" onClick={() => setShowAddPayment(false)}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {investment.payments.length === 0 ? (
              <p className="py-4 text-center text-muted-foreground">
                No hay pagos registrados
              </p>
            ) : (
              <div className="space-y-2">
                {investment.payments
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between rounded-lg border bg-card p-3"
                    >
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="font-medium">{formatCurrency(payment.amount)}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(parseISO(payment.date), 'dd MMM yyyy', { locale: es })}
                          </p>
                        </div>
                        <Badge variant="secondary">
                          {getPaymentTypeLabel(payment.type)}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => onDeletePayment(investment.id, payment.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Notes */}
          {investment.notes && (
            <div>
              <h4 className="mb-2 font-semibold">Notas</h4>
              <p className="text-muted-foreground">{investment.notes}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
