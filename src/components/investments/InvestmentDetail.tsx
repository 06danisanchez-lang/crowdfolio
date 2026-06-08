import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Plus, Trash2, CalendarIcon, Pencil } from 'lucide-react';
import { Investment, Payment, PLATFORMS, STATUS_OPTIONS, InvestmentScheduleEntry, IncomeModel } from '@/types/investment';
import {
  getInvestmentDurationYears,
  calculateInvestmentTotalReturn,
  calculateInvestmentTotalReturnPercent,
  calculateExpectedReturnFromSchedule,
  calculateAccruedReturn,
  calculateRealTAE,
  calculateEstimatedTAEToday,
  getDelayDays,
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { HelpTooltip } from '@/components/ui/help-tooltip';
import { InvestmentForm } from './InvestmentForm';
import { toast } from 'sonner';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

type ActionForm = 'extend' | 'partial-return' | 'update-return' | null;

interface InvestmentDetailProps {
  investment: Investment | null;
  schedule?: InvestmentScheduleEntry[];
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<Investment>) => Promise<unknown>;
  onDelete: (id: string) => void;
  onAddPayment: (investmentId: string, payment: { date: string; amount: number; type: 'dividend' | 'principal' | 'interest'; notes?: string }) => void;
  onDeletePayment: (investmentId: string, paymentId: string) => void;
  onOpenCloseModal?: (id: string) => void;
}

export function InvestmentDetail({ investment, schedule = [], onClose, onUpdate, onDelete, onAddPayment, onDeletePayment, onOpenCloseModal }: InvestmentDetailProps) {
  const { t } = useLanguage();
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [paymentDate, setPaymentDate] = useState<Date>(new Date());
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentType, setPaymentType] = useState<'dividend' | 'principal' | 'interest'>('dividend');

  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Action forms
  const [activeForm, setActiveForm] = useState<ActionForm>(null);
  const [newEndDate, setNewEndDate] = useState<Date | undefined>(undefined);
  const [partialAmount, setPartialAmount] = useState('');
  const [partialDate, setPartialDate] = useState<Date>(new Date());
  const [newReturnRate, setNewReturnRate] = useState('');

  const openForm = (form: ActionForm) => setActiveForm(prev => prev === form ? null : form);
  const resetForms = () => {
    setActiveForm(null);
    setNewEndDate(undefined);
    setPartialAmount('');
    setNewReturnRate('');
  };

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

  const getIncomeModelLabel = (model: IncomeModel): string => {
    const map: Record<IncomeModel, string> = {
      bullet: 'investments.incomeModel.bullet',
      periodic_fixed: 'investments.incomeModel.periodicFixed',
      amortizing: 'investments.incomeModel.amortizing',
      variable_or_unknown: 'investments.incomeModel.variableOrUnknown',
    };
    return t(map[model]);
  };

  const getFrequencyLabel = (freq: string): string => {
    const map: Record<string, string> = {
      monthly: 'investments.frequency.monthly',
      quarterly: 'investments.frequency.quarterly',
      semiannual: 'investments.frequency.semiannual',
      annual: 'investments.frequency.annual',
    };
    return t(map[freq] || freq);
  };

  const getPrincipalReturnLabel = (type: string): string => {
    const map: Record<string, string> = {
      at_maturity: 'investments.principalReturn.atMaturity',
      amortizing: 'investments.principalReturn.amortizing',
      unknown: 'investments.principalReturn.unknown',
    };
    return t(map[type] || type);
  };

  const getScheduleTypeLabel = (type: string): string => {
    const map: Record<string, string> = {
      interest: 'investments.schedule.type.interest',
      principal: 'investments.schedule.type.principal',
      mixed: 'investments.schedule.type.mixed',
    };
    return t(map[type] || type);
  };

  const getScheduleStatusBadge = (status: string) => {
    const map: Record<string, { key: string; className: string }> = {
      pending: { key: 'investments.schedule.status.pending', className: 'bg-muted text-muted-foreground' },
      matched: { key: 'investments.schedule.status.matched', className: 'bg-status-active text-white' },
      missed: { key: 'investments.schedule.status.missed', className: 'bg-status-defaulted text-white' },
      skipped: { key: 'investments.schedule.status.skipped', className: 'bg-muted text-muted-foreground' },
    };
    const cfg = map[status] || map.pending;
    return <Badge className={cn('text-xs', cfg.className)}>{t(cfg.key)}</Badge>;
  };

  const handleExtend = async () => {
    if (!investment || !newEndDate) return;
    await onUpdate(investment.id, { expectedEndDate: newEndDate.toISOString().split('T')[0] });
    resetForms();
  };

  const handlePartialReturn = async () => {
    if (!investment || !partialAmount) return;
    const amount = parseFloat(partialAmount);
    await onAddPayment(investment.id, {
      date: partialDate.toISOString(),
      amount,
      type: 'principal',
    });
    const existingPrincipal = investment.payments
      .filter(p => p.type === 'principal')
      .reduce((sum, p) => sum + p.amount, 0);
    await onUpdate(investment.id, { amountRecovered: existingPrincipal + amount });
    resetForms();
  };

  const handleUpdateReturn = async () => {
    if (!investment || !newReturnRate) return;
    await onUpdate(investment.id, { expectedReturn: parseFloat(newReturnRate) });
    resetForms();
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

  // D5: Calculate returns based on income model
  let totalReturnAmount: number;
  let totalReturnPercent: number;

  if (
    (investment.incomeModel === 'periodic_fixed' || investment.incomeModel === 'amortizing') &&
    schedule.length > 0
  ) {
    totalReturnAmount = calculateExpectedReturnFromSchedule(schedule, investment.amount, investment.incomeModel);
    totalReturnPercent = investment.amount > 0 ? (totalReturnAmount / investment.amount) * 100 : 0;
  } else if (investment.incomeModel === 'variable_or_unknown') {
    totalReturnAmount = 0;
    totalReturnPercent = 0;
  } else {
    totalReturnAmount = calculateInvestmentTotalReturn(investment);
    totalReturnPercent = calculateInvestmentTotalReturnPercent(investment);
  }

  const expectedTotal = investment.amount + totalReturnAmount;
  const accruedReturn = calculateAccruedReturn(investment, schedule);
  const actualReturn = investment.amount > 0 ? ((totalPayments / investment.amount) * 100) : 0;

  // TAE ajustada por retraso (solo se muestra si hay retraso real)
  const delayDays = getDelayDays(investment);
  const today = new Date();
  const isCompletedWithDelay = investment.status === 'completed' && !!investment.actualEndDate && delayDays > 0;
  const isRunningWithDelay =
    (investment.status === 'active' || investment.status === 'pending') &&
    !!investment.expectedEndDate &&
    today > new Date(investment.expectedEndDate) &&
    delayDays > 0;
  const realTAE = isCompletedWithDelay ? calculateRealTAE(investment, investment.payments) : 0;
  const estimatedTAEToday = isRunningWithDelay ? calculateEstimatedTAEToday(investment, investment.payments, today) : 0;
  const taeDiffPp = realTAE - investment.expectedReturn;

  const sortedSchedule = [...schedule].sort(
    (a, b) => new Date(a.expectedDate).getTime() - new Date(b.expectedDate).getTime()
  );

  return (
    <Dialog open={!!investment} onOpenChange={() => onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <div className="flex items-start justify-between gap-3 pr-8">
            <DialogTitle className="text-xl leading-tight">{investment.projectName}</DialogTitle>
            <InvestmentForm
              initialData={investment}
              onSubmit={async (data) => {
                const result = await onUpdate(investment.id, data);
                if (result && 'demotedToDraft' in result && result.demotedToDraft) {
                  toast.warning('La inversión ha pasado a pendientes por faltar datos obligatorios.');
                }
              }}
              trigger={
                <Button variant="outline" size="sm" className="shrink-0">
                  <Pencil className="h-3.5 w-3.5 mr-1.5" />{t('common.edit')}
                </Button>
              }
            />
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Investment Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">{t('investments.detail.platform')}</p>
              <p className="font-medium">{getPlatformLabel(investment.platform, investment.customPlatformName)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">{t('investments.detail.status')}</p>
              <Badge className={cn(
                investment.status === 'active' && 'bg-status-active text-white',
                investment.status === 'pending' && 'bg-status-pending text-white',
                investment.status === 'completed' && 'bg-status-completed text-white',
                investment.status === 'defaulted' && 'bg-status-defaulted text-white',
              )}>
                {STATUS_OPTIONS.find(s => s.value === investment.status)?.label}
              </Badge>
            </div>
            {/* D3: Income model info */}
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">{t('investments.detail.incomeModel')}</p>
              <p className="font-medium">{getIncomeModelLabel(investment.incomeModel)}</p>
            </div>
            {investment.paymentFrequency && (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">{t('investments.detail.paymentFrequency')}</p>
                <p className="font-medium">{getFrequencyLabel(investment.paymentFrequency)}</p>
              </div>
            )}
            {investment.principalReturnType && (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">{t('investments.detail.principalReturnType')}</p>
                <p className="font-medium">{getPrincipalReturnLabel(investment.principalReturnType)}</p>
              </div>
            )}
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">{t('investments.detail.invested')}</p>
              <p className="font-medium">{formatCurrency(investment.amount)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">{t('investments.detail.annualReturn')}</p>
              <p className="font-medium">{investment.expectedReturn.toFixed(1)}%</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">{t('investments.detail.duration')}</p>
              <p className="font-medium">{durationYears.toFixed(1)} {t('investments.detail.years')}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">{t('investments.detail.totalReturn')}</p>
              <p className="font-medium">
                {investment.incomeModel === 'variable_or_unknown' ? '—' : `${totalReturnPercent.toFixed(1)}%`}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">{t('investments.detail.investmentDate')}</p>
              <p className="font-medium">{format(parseISO(investment.investmentDate), 'dd MMM yyyy', { locale: es })}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">{t('investments.detail.maturity')}</p>
              <p className="font-medium">
                {investment.expectedEndDate 
                  ? format(parseISO(investment.expectedEndDate), 'dd MMM yyyy', { locale: es })
                  : t('investments.detail.notSpecified')}
              </p>
            </div>
          </div>

          {/* Returns Summary */}
          <div className="rounded-lg bg-muted/50 p-4">
            <h4 className="mb-3 font-semibold">{t('investments.detail.returnsSummary')}</h4>
            {investment.incomeModel === 'variable_or_unknown' ? (
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-xl font-bold text-status-active">{formatCurrency(totalPayments)}</p>
                  <p className="text-xs text-muted-foreground">{t('investments.detail.received')}</p>
                </div>
                <div>
                  <p className={cn(
                    "text-xl font-bold",
                    actualReturn > 0 ? "text-status-active" : "text-muted-foreground"
                  )}>
                    {actualReturn.toFixed(1)}%
                  </p>
                  <p className="text-xs text-muted-foreground">{t('investments.detail.realReturn')}</p>
                </div>
                <div className="col-span-2 rounded-md border border-muted-foreground/20 bg-background px-3 py-2 text-center">
                  <p className="text-xs text-muted-foreground italic">{t('investments.detail.variableNote')}</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-xl font-bold text-status-active">{formatCurrency(totalPayments)}</p>
                  <p className="text-xs text-muted-foreground">{t('investments.detail.received')}</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-primary">{formatCurrency(accruedReturn)}</p>
                  <p className="text-xs text-muted-foreground">{t('investments.detail.accrued')}</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-foreground">{formatCurrency(expectedTotal)}</p>
                  <p className="text-xs text-muted-foreground">{t('investments.detail.expected')}</p>
                </div>
                <div>
                  <p className={cn(
                    "text-xl font-bold",
                    actualReturn >= investment.expectedReturn ? "text-status-active" : "text-muted-foreground"
                  )}>
                    {actualReturn.toFixed(1)}%
                  </p>
                  <p className="text-xs text-muted-foreground">{t('investments.detail.realReturn')}</p>
                </div>
              </div>
            )}
          </div>

          {/* TAE ajustada por retraso — solo si hay retraso real */}
          {isCompletedWithDelay && (
            <div className="rounded-lg border p-4" style={{ borderColor: '#e4ddcf' }}>
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{t('investments.detail.expectedTAE')}</p>
                  <p className="text-lg font-semibold" style={{ color: '#253765' }}>{investment.expectedReturn.toFixed(1)}%</p>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-xs text-muted-foreground">{t('investments.detail.realTAE')}</p>
                  <p className="text-lg font-semibold" style={{ color: '#253765' }}>{realTAE.toFixed(1)}%</p>
                </div>
              </div>
              <p className={cn(
                "mt-2 text-sm font-medium",
                taeDiffPp >= 0 ? "text-emerald-600" : "text-red-600"
              )}>
                {taeDiffPp >= 0 ? '+' : ''}{taeDiffPp.toFixed(1)} pp
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {t('investments.detail.closedWithDelayPrefix')} {delayDays} {t('investments.detail.closedWithDelaySuffix')}
              </p>
            </div>
          )}

          {isRunningWithDelay && (
            <div className="rounded-lg border p-4" style={{ borderColor: '#e4ddcf' }}>
              <div className="flex items-center gap-2">
                <span aria-hidden="true">⚠️</span>
                <p className="text-sm font-semibold" style={{ color: '#79c6fa' }}>
                  {t('investments.detail.estimatedTAEToday')}: {estimatedTAEToday.toFixed(1)}%
                </p>
                <HelpTooltip content={t('investments.detail.estimatedTAETooltip')} />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {t('investments.detail.runningDelayPrefix')} {delayDays} {t('investments.detail.runningDelaySuffix')}
              </p>
            </div>
          )}

          {/* D4: Expected Schedule (read-only) */}
          {sortedSchedule.length > 0 && (
            <div>
              <h4 className="mb-3 font-semibold">{t('investments.detail.expectedSchedule')}</h4>
              <div className="rounded-lg border bg-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('investments.schedule.date')}</TableHead>
                      <TableHead>{t('investments.schedule.amount')}</TableHead>
                      <TableHead>{t('investments.schedule.type')}</TableHead>
                      <TableHead>{t('investments.schedule.status')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedSchedule.map((entry, idx) => (
                      <TableRow key={entry.id || idx}>
                        <TableCell className="text-sm">
                          {format(parseISO(entry.expectedDate), 'dd MMM yyyy', { locale: es })}
                        </TableCell>
                        <TableCell className="text-sm font-medium">
                          {formatCurrency(entry.expectedAmount)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {getScheduleTypeLabel(entry.type)}
                        </TableCell>
                        <TableCell>
                          {getScheduleStatusBadge(entry.status || 'pending')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Payments List */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h4 className="font-semibold">{t('investments.detail.payments')}</h4>
              <Button size="sm" variant="outline" onClick={() => setShowAddPayment(true)}>
                <Plus className="mr-2 h-4 w-4" />
                {t('investments.detail.addPayment')}
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
                    placeholder={t('investments.detail.amount')}
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                  />
                  <Select value={paymentType} onValueChange={(v) => setPaymentType(v as typeof paymentType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dividend">{t('investments.detail.dividend')}</SelectItem>
                      <SelectItem value="principal">{t('investments.detail.principal')}</SelectItem>
                      <SelectItem value="interest">{t('investments.detail.interest')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex gap-2">
                    <Button onClick={handleAddPayment} disabled={!paymentAmount}>
                      {t('common.add')}
                    </Button>
                    <Button variant="ghost" onClick={() => setShowAddPayment(false)}>
                      {t('common.cancel')}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {investment.payments.length === 0 ? (
              <p className="py-4 text-center text-muted-foreground">
                {t('investments.detail.noPayments')}
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
              <h4 className="mb-2 font-semibold">{t('common.notes')}</h4>
              <p className="text-muted-foreground">{investment.notes}</p>
            </div>
          )}

          {/* Actions — only for active investments */}
          {investment.status === 'active' && (
            <div>
              <h4 className="mb-3 font-semibold">{t('investments.action.title')}</h4>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => openForm('extend')}>
                  {t('investments.action.extend')}
                </Button>
                <Button variant="outline" size="sm" onClick={() => openForm('partial-return')}>
                  {t('investments.action.partialReturn')}
                </Button>
                <Button variant="outline" size="sm" onClick={() => openForm('update-return')}>
                  {t('investments.action.updateReturn')}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => { onOpenCloseModal?.(investment.id); onClose(); }}
                >
                  {t('investments.action.close')}
                </Button>
              </div>

              {/* Prorrogar */}
              {activeForm === 'extend' && (
                <div className="mt-3 rounded-lg border bg-card p-4 space-y-3">
                  <p className="text-sm font-medium">{t('investments.action.newEndDate')}</p>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {newEndDate ? format(newEndDate, 'dd/MM/yyyy') : t('common.select')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={newEndDate} onSelect={setNewEndDate} initialFocus />
                    </PopoverContent>
                  </Popover>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleExtend} disabled={!newEndDate}>{t('common.save')}</Button>
                    <Button size="sm" variant="ghost" onClick={resetForms}>{t('common.cancel')}</Button>
                  </div>
                </div>
              )}

              {/* Devolución parcial */}
              {activeForm === 'partial-return' && (
                <div className="mt-3 rounded-lg border bg-card p-4 space-y-3">
                  <p className="text-sm font-medium">{t('investments.action.partialReturnTitle')}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">{t('investments.action.returnedAmount')}</p>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={partialAmount}
                        onChange={e => setPartialAmount(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">{t('investments.action.date')}</p>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start text-left font-normal">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {format(partialDate, 'dd/MM/yyyy')}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar mode="single" selected={partialDate} onSelect={d => d && setPartialDate(d)} initialFocus />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handlePartialReturn} disabled={!partialAmount}>{t('common.save')}</Button>
                    <Button size="sm" variant="ghost" onClick={resetForms}>{t('common.cancel')}</Button>
                  </div>
                </div>
              )}

              {/* Actualizar rentabilidad */}
              {activeForm === 'update-return' && (
                <div className="mt-3 rounded-lg border bg-card p-4 space-y-3">
                  <p className="text-sm font-medium">{t('investments.action.updateReturnTitle')}</p>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">{t('investments.action.newReturnRate')}</p>
                    <Input
                      type="number"
                      min="0"
                      step="0.1"
                      placeholder={investment.expectedReturn.toFixed(1)}
                      value={newReturnRate}
                      onChange={e => setNewReturnRate(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleUpdateReturn} disabled={!newReturnRate}>{t('common.save')}</Button>
                    <Button size="sm" variant="ghost" onClick={resetForms}>{t('common.cancel')}</Button>
                  </div>
                </div>
              )}

            </div>
          )}
          {/* Delete */}
          <div className="border-t pt-4">
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="h-4 w-4 mr-1.5" />{t('common.delete')}
            </Button>
          </div>
        </div>
      </DialogContent>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('investments.deleteConfirm')}</AlertDialogTitle>
            <AlertDialogDescription>{t('investments.deleteDesc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { onDelete(investment.id); onClose(); }}
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
