import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Plus, Trash2, CalendarIcon, Pencil, Check, X } from 'lucide-react';
import { Investment, Payment, PLATFORMS, STATUS_OPTIONS, InvestmentScheduleEntry, IncomeModel, InvestmentStatus } from '@/types/investment';
import { toDateOnlyString } from '@/lib/dateOnly';
import { parseSpanishNumber, formatSpanishNumber } from '@/lib/investment/parseSpanishNumber';
import { ForeignAmountField } from '@/components/common/ForeignAmountField';
import {
  EMPTY_FOREIGN_AMOUNT, buildForeignPaymentFields, formatExchangeRate, formatForeignAmount,
  isForeignCurrency, type ForeignAmountInput,
} from '@/lib/currency/fx';

/** Importe escrito por el usuario en formato español ("1.500,50"). NaN si está
 * vacío o no se puede interpretar: nunca parseFloat, que lee "1.500" como 1,5. */
function parseAmountInput(raw: string): number {
  const { value, error } = parseSpanishNumber(raw);
  return error || value == null ? NaN : value;
}
import {
  getInvestmentDurationYears,
  calculateInvestmentTotalReturnPercent,
  calculateExpectedTotalReturn,
  calculateAccruedReturn,
  calculateRealTAE,
  calculateDelayAdjustedTAE,
  getDelayDays,
  getOriginalEndDate,
  isDelayedWithoutExtraInterest,
  sumIncomePayments,
} from '@/lib/investment/calculations';
import { getPrincipalReturned } from '@/lib/tax/principalReturned';
import { getDefaultWithholding, getDefaultWithholdingRate, isWithholdingApplicable, validateWithholding } from '@/lib/tax/withholding';
import { DefaultLossStatusCard } from './DefaultLossStatusCard';
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
import { buildMaturityChange, MaturityChangeKind } from '@/lib/investment/maturityChange';
import { formatPercent } from '@/lib/formatPercent';

type ActionForm = 'extend' | 'partial-return' | 'update-return' | null;

interface InvestmentDetailProps {
  investment: Investment | null;
  schedule?: InvestmentScheduleEntry[];
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<Investment>) => Promise<{ demotedToDraft?: boolean; error?: string } | undefined>;
  onDelete: (id: string) => void;
  onAddPayment: (investmentId: string, payment: Omit<Payment, 'id'>) => void;
  onDeletePayment: (investmentId: string, paymentId: string) => void;
  /** Corrige la retención de un cobro ya registrado. */
  onUpdatePaymentWithholding?: (investmentId: string, paymentId: string, withholdingApplied: number) => Promise<boolean>;
  onOpenCloseModal?: (id: string) => void;
  /** Abre DefaultLossQuestionnaire en modo 'update' para esta inversión (Fase 4). */
  onUpdateFiscalStatus?: (investment: Investment) => void;
}

export function InvestmentDetail({ investment, schedule = [], onClose, onUpdate, onDelete, onAddPayment, onDeletePayment, onUpdatePaymentWithholding, onOpenCloseModal, onUpdateFiscalStatus }: InvestmentDetailProps) {
  const { t } = useLanguage();
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [paymentDate, setPaymentDate] = useState<Date>(new Date());
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentType, setPaymentType] = useState<'dividend' | 'principal' | 'interest'>('dividend');
  // Retención del cobro nuevo: se propone sola (19 % en plataformas españolas)
  // hasta que el usuario la toca.
  const [paymentWithholding, setPaymentWithholding] = useState('');
  const [withholdingTouched, setWithholdingTouched] = useState(false);
  // Inversión en otra divisa: importe del cobro en su divisa + tipo del día,
  // y la retención practicada en el país de la plataforma.
  const [paymentFx, setPaymentFx] = useState<ForeignAmountInput>(EMPTY_FOREIGN_AMOUNT);
  const [partialFx, setPartialFx] = useState<ForeignAmountInput>(EMPTY_FOREIGN_AMOUNT);
  const [foreignWithholding, setForeignWithholding] = useState('');
  // Edición de la retención de un cobro ya registrado
  const [editingWithholdingId, setEditingWithholdingId] = useState<string | null>(null);
  const [editingWithholdingValue, setEditingWithholdingValue] = useState('');
  const [withholdingError, setWithholdingError] = useState<string | null>(null);

  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Deshacer impago (Fase 4)
  const [showUndoDefaultConfirm, setShowUndoDefaultConfirm] = useState(false);
  const [undoingDefault, setUndoingDefault] = useState(false);

  // Action forms
  const [activeForm, setActiveForm] = useState<ActionForm>(null);
  const [newEndDate, setNewEndDate] = useState<Date | undefined>(undefined);
  const [extendKind, setExtendKind] = useState<MaturityChangeKind>('extended');
  const [partialAmount, setPartialAmount] = useState('');
  const [partialDate, setPartialDate] = useState<Date>(new Date());
  const [newReturnRate, setNewReturnRate] = useState('');

  const openForm = (form: ActionForm) => setActiveForm(prev => prev === form ? null : form);
  const resetForms = () => {
    setActiveForm(null);
    setNewEndDate(undefined);
    setExtendKind('extended');
    setPartialAmount('');
    setPartialFx(EMPTY_FOREIGN_AMOUNT);
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

  // Mismas claves que PaymentsView: antes faltaba capital_return y se mostraba la key cruda
  const getPaymentTypeLabel = (type: Payment['type']): string => {
    const labels: Record<Payment['type'], string> = {
      dividend: t('investments.detail.dividend'),
      principal: t('investments.detail.principal'),
      interest: t('investments.detail.interest'),
      capital_return: t('investments.detail.capitalReturn'),
      capital_gain: t('investments.detail.capitalGain'),
    };
    return labels[type] ?? type;
  };

  const getIncomeModelLabel = (model: IncomeModel): string => {
    const map: Record<IncomeModel, string> = {
      bullet: 'investments.incomeModel.bullet',
      periodic_fixed: 'investments.incomeModel.periodicFixed',
      amortizing: 'investments.incomeModel.amortizing',
      variable_or_unknown: 'investments.incomeModel.variableOrUnknown',
      equity: 'investments.incomeModel.equity',
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
    const result = await onUpdate(investment.id, buildMaturityChange(investment, toDateOnlyString(newEndDate), extendKind));
    if (result?.error) {
      toast.error(result.error);
      return;
    }
    resetForms();
  };

  const handlePartialReturn = async () => {
    if (!investment || (!partialAmount && !isForeign)) return;
    const dateStr = toDateOnlyString(partialDate);
    let payment: Omit<Payment, 'id'>;
    if (isForeign) {
      const fx = buildForeignPaymentFields(investment.currency!, partialFx, dateStr);
      if (!fx) return;
      payment = { date: dateStr, type: 'principal', ...fx };
    } else {
      const parsed = parseAmountInput(partialAmount);
      if (!Number.isFinite(parsed) || parsed <= 0) return;
      payment = { date: dateStr, amount: parsed, type: 'principal' };
    }
    const amount = payment.amount;
    await onAddPayment(investment.id, payment);
    const existingPrincipal = investment.payments
      .filter(p => p.type === 'principal')
      .reduce((sum, p) => sum + p.amount, 0);
    await onUpdate(investment.id, { amountRecovered: existingPrincipal + amount });
    resetForms();
  };

  const handleUpdateReturn = async () => {
    if (!investment || !newReturnRate) return;
    const rate = parseAmountInput(newReturnRate);
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) return;
    await onUpdate(investment.id, { expectedReturn: rate });
    resetForms();
  };

  const isForeign = !!investment && isForeignCurrency(investment.currency);
  const paymentDateStr = toDateOnlyString(paymentDate);
  const foreignPaymentFields = isForeign ? buildForeignPaymentFields(investment!.currency!, paymentFx, paymentDateStr) : null;
  const parsedPaymentAmount = isForeign ? (foreignPaymentFields?.amount ?? NaN) : parseAmountInput(paymentAmount);
  const parsedForeignWithholding = foreignWithholding.trim() === '' ? 0 : parseAmountInput(foreignWithholding);
  const foreignWithholdingError = !Number.isFinite(parsedForeignWithholding) || parsedForeignWithholding < 0
    ? 'Retención no válida (ej. 12,50)'
    : null;
  // Retención en origen: plataformas no españolas (las españolas retienen el 19 % aquí).

  const paymentAmountError = paymentAmount.trim() !== '' && !(parsedPaymentAmount > 0)
    ? 'Importe no válido (ej. 1.500,50)'
    : null;
  const withholdingApplies = isWithholdingApplicable(paymentType);
  // Retención en origen: plataformas no españolas (las españolas retienen el 19 % aquí).
  const showForeignWithholding = !!investment && withholdingApplies && (isForeign || getDefaultWithholdingRate(investment.platform) === 0);
  const proposedWithholding = investment
    ? getDefaultWithholding(parsedPaymentAmount, paymentType, isForeign ? 'other' : investment.platform)
    : 0;
  const effectivePaymentWithholding = !withholdingApplies
    ? 0
    : withholdingTouched
      ? (paymentWithholding.trim() === '' ? 0 : parseAmountInput(paymentWithholding))
      : proposedWithholding;
  const newPaymentWithholdingError = withholdingApplies && Number.isFinite(parsedPaymentAmount)
    ? validateWithholding(effectivePaymentWithholding, parsedPaymentAmount)
    : null;

  const resetPaymentForm = () => {
    setPaymentAmount('');
    setPaymentFx(EMPTY_FOREIGN_AMOUNT);
    setForeignWithholding('');
    setPaymentWithholding('');
    setWithholdingTouched(false);
    setShowAddPayment(false);
  };

  const handleAddPayment = () => {
    if (investment && parsedPaymentAmount > 0 && !newPaymentWithholdingError && !(showForeignWithholding && foreignWithholdingError)) {
      const foreignWh = showForeignWithholding && parsedForeignWithholding > 0
        ? { foreignWithholdingAmount: Math.round(parsedForeignWithholding * 100) / 100, foreignWithholdingCurrency: investment.currency || 'EUR' }
        : {};
      onAddPayment(investment.id, {
        date: paymentDateStr,
        amount: parsedPaymentAmount,
        type: paymentType,
        withholdingApplied: effectivePaymentWithholding,
        ...(foreignPaymentFields ?? {}),
        ...foreignWh,
      });
      resetPaymentForm();
    }
  };

  const startEditWithholding = (payment: Payment) => {
    setEditingWithholdingId(payment.id);
    setEditingWithholdingValue(formatSpanishNumber(payment.withholdingApplied ?? 0));
    setWithholdingError(null);
  };

  const saveWithholding = async (payment: Payment) => {
    if (!investment || !onUpdatePaymentWithholding) return;
    const value = editingWithholdingValue.trim() === '' ? 0 : parseAmountInput(editingWithholdingValue);
    const validation = validateWithholding(value, payment.amount);
    if (validation) { setWithholdingError(validation); return; }
    const ok = await onUpdatePaymentWithholding(investment.id, payment.id, Math.round(value * 100) / 100);
    if (!ok) { setWithholdingError('No se ha podido guardar la retención.'); return; }
    setEditingWithholdingId(null);
  };

  const handleUndoDefault = async () => {
    if (!investment) return;
    setUndoingDefault(true);
    const todayStr = toDateOnlyString(new Date());
    const newStatus: InvestmentStatus =
      investment.expectedEndDate && investment.expectedEndDate < todayStr ? 'pending' : 'active';
    const result = await onUpdate(investment.id, {
      status: newStatus,
      defaultedAt: null,
      lossInsolvencyStatus: null,
      lossInsolvencyConcludedDate: null,
      lossQuitaAmount: null,
      lossQuitaDate: null,
      lossEnforcementStarted: null,
      lossEnforcementDate: null,
      lossEnforcementInitiator: null,
      lossAssessedAt: null,
      lossRulesVersion: null,
      // Reenviar incomeModel fuerza a updateInvestment a regenerar
      // investment_schedule (useInvestments.ts) — no se toca solo al entrar
      // o salir de impago, así que hay que pedirlo explícitamente aquí.
      incomeModel: investment.incomeModel,
    });
    const errorMessage =
      result && typeof result === 'object' && 'error' in result && typeof (result as { error?: unknown }).error === 'string'
        ? (result as { error: string }).error
        : null;
    setUndoingDefault(false);
    if (errorMessage) {
      toast.error(errorMessage);
      return;
    }
    toast.success('Impago deshecho.');
    setShowUndoDefaultConfirm(false);
  };

  if (!investment) return null;

  const totalPayments = investment.payments.reduce((sum, p) => sum + p.amount, 0);
  const durationYears = getInvestmentDurationYears(investment.investmentDate, investment.expectedEndDate);

  // Resumen de retornos para inversiones en impago (Fase 4, punto 5): capital
  // recuperado SIEMPRE desde getPrincipalReturned (pagos type 'principal'),
  // nunca de amount_recovered (caché desnormalizada, puede desincronizarse —
  // ver principalReturned.ts). La pérdida nunca se muestra negativa: si lo
  // recuperado cubre lo invertido, 0 €.
  const recoveredCapital = getPrincipalReturned(investment.payments ?? []);
  const defaultedLoss = Math.max(investment.amount - recoveredCapital, 0);
  // Rendimiento real = todo lo cobrado (capital recuperado + intereses/dividendos
  // cobrados antes del impago) frente a lo invertido. La "Pérdida" de arriba es
  // solo de capital (lo que cuenta a efectos del art. 14.2.k); los intereses ya
  // tributaron como RCM y no la compensan.
  const defaultedIncomeReceived = sumIncomePayments(investment.payments ?? []);
  const defaultedRealReturnPercent =
    investment.amount > 0 ? ((recoveredCapital + defaultedIncomeReceived - investment.amount) / investment.amount) * 100 : 0;

  // D5: Calculate returns based on income model.
  // totalReturnAmount extraído a calculateExpectedTotalReturn (src/lib/investment/calculations.ts)
  // — se reutiliza también en la columna "Beneficio" de InvestmentList. El % se deja igual
  // que antes (mismas 3 ramas), solo cambia de dónde sale el importe.
  const totalReturnAmount = calculateExpectedTotalReturn(investment, schedule);
  const totalReturnPercent =
    (investment.incomeModel === 'periodic_fixed' || investment.incomeModel === 'amortizing') && schedule.length > 0
      ? (investment.amount > 0 ? (totalReturnAmount / investment.amount) * 100 : 0)
      : investment.incomeModel === 'variable_or_unknown'
        ? 0
        : calculateInvestmentTotalReturnPercent(investment);

  const expectedTotal = investment.amount + totalReturnAmount;
  const accruedReturn = calculateAccruedReturn(investment, schedule);
  const actualReturn = investment.amount > 0 ? ((totalPayments / investment.amount) * 100) : 0;

  // Retraso respecto al vencimiento prometido al invertir (aunque se haya movido)
  const delayDays = getDelayDays(investment);
  const today = new Date();
  const promisedEndDate = getOriginalEndDate(investment);
  const maturityMoved = !!promisedEndDate && !!investment.expectedEndDate && promisedEndDate !== investment.expectedEndDate;
  const isCompletedWithDelay = investment.status === 'completed' && !!investment.actualEndDate && delayDays > 0;
  const isRunningWithDelay = (investment.status === 'active' || investment.status === 'pending') && delayDays > 0;
  const isPastCurrentMaturity = !!investment.expectedEndDate && toDateOnlyString(today) > investment.expectedEndDate;
  const realTAE = isCompletedWithDelay ? calculateRealTAE(investment, investment.payments) : 0;
  const delayAdjustedTAE = isRunningWithDelay ? calculateDelayAdjustedTAE(investment, investment.payments, today) : 0;
  const isDelayed = isDelayedWithoutExtraInterest(investment);
  // La comparación de TAE solo tiene sentido si baja: retraso o fecha ya pasada,
  // y con una rentabilidad prevista conocida (no en variable/desconocida).
  const showDelayTAE = investment.expectedReturn > 0 && (isDelayed || isPastCurrentMaturity);
  const formatDay = (d: string) => format(parseISO(d), 'dd MMM yyyy', { locale: es });
  const formatDelay = (days: number) =>
    days < 60
      ? `${days} ${t('investments.detail.delayDays')}`
      : `${Math.round(days / 30.44)} ${t('investments.detail.delayMonths')}`;
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
                if (result?.error) {
                  toast.error(result.error);
                  return;
                }
                if (result?.demotedToDraft) {
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
              {isForeign && investment.originalAmount != null && (
                <p className="text-xs text-muted-foreground">
                  {formatForeignAmount(investment.originalAmount, investment.currency!)}
                  {investment.exchangeRate ? ` · ${formatExchangeRate(investment.exchangeRate, investment.currency!)}` : ''}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">{t('investments.detail.annualReturn')}</p>
              <p className="font-medium">{formatPercent(investment.expectedReturn)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">{t('investments.detail.duration')}</p>
              <p className="font-medium">{durationYears.toFixed(1)} {t('investments.detail.years')}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">{t('investments.detail.totalReturn')}</p>
              <p className="font-medium">
                {investment.incomeModel === 'variable_or_unknown' ? '—' : formatPercent(totalReturnPercent)}
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
              {maturityMoved && (
                <p className="text-xs text-muted-foreground">
                  {t('investments.detail.promisedMaturity')}: <span className="line-through">{formatDay(promisedEndDate!)}</span>
                </p>
              )}
            </div>
          </div>

          {/* Returns Summary */}
          <div className="rounded-lg bg-muted/50 p-4">
            <h4 className="mb-3 font-semibold">{t('investments.detail.returnsSummary')}</h4>
            {investment.status === 'defaulted' ? (
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-xl font-bold text-foreground">{formatCurrency(investment.amount)}</p>
                  <p className="text-xs text-muted-foreground">{t('investments.detail.investedCapital')}</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-foreground">{formatCurrency(recoveredCapital)}</p>
                  <p className="text-xs text-muted-foreground">{t('investments.detail.recoveredCapital')}</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-destructive">{formatCurrency(defaultedLoss)}</p>
                  <p className="text-xs text-muted-foreground">{t('investments.detail.loss')}</p>
                </div>
                <div>
                  <p className={`text-xl font-bold ${defaultedRealReturnPercent < 0 ? 'text-destructive' : 'text-foreground'}`}>{formatPercent(defaultedRealReturnPercent)}</p>
                  <p className="text-xs text-muted-foreground">{t('investments.detail.realReturnDefaulted')}</p>
                </div>
              </div>
            ) : investment.incomeModel === 'variable_or_unknown' ? (
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
                    {formatPercent(actualReturn)}
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
                    {formatPercent(actualReturn)}
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
                  <p className="text-lg font-semibold" style={{ color: '#253765' }}>{formatPercent(investment.expectedReturn)}</p>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-xs text-muted-foreground">{t('investments.detail.realTAE')}</p>
                  <p className="text-lg font-semibold" style={{ color: '#253765' }}>{formatPercent(realTAE)}</p>
                </div>
              </div>
              <p className={cn(
                "mt-2 text-sm font-medium",
                taeDiffPp >= 0 ? "text-emerald-600" : "text-red-600"
              )}>
                {taeDiffPp >= 0 ? '+' : ''}{taeDiffPp.toFixed(1)} pp
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {t('investments.detail.closedWithDelayPrefix')} {formatDelay(delayDays)} {t('investments.detail.closedWithDelaySuffix')}
              </p>
            </div>
          )}

          {isRunningWithDelay && (
            <div className="rounded-lg border p-4" style={{ borderColor: '#e4ddcf' }}>
              {showDelayTAE && (
                <div className="mb-2 flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">{t('investments.detail.expectedTAE')}</p>
                    <p className="text-lg font-semibold" style={{ color: '#253765' }}>{formatPercent(investment.expectedReturn)}</p>
                  </div>
                  <div className="space-y-1 text-right">
                    <p className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                      {t('investments.detail.delayAdjustedTAE')}
                      <HelpTooltip content={t('investments.detail.delayAdjustedTooltip')} />
                    </p>
                    <p className="text-lg font-semibold" style={{ color: '#253765' }}>{formatPercent(delayAdjustedTAE)}</p>
                  </div>
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                {isPastCurrentMaturity
                  ? `${t('investments.detail.runningDelayPrefix')} ${formatDelay(delayDays)} ${t('investments.detail.runningDelaySuffix')}`
                  : `${t(isDelayed ? 'investments.detail.movedDelayPrefix' : 'investments.detail.extendedPrefix')} ${formatDelay(delayDays)}: ${t('investments.detail.movedDelayWas')} ${formatDay(promisedEndDate!)}, ${t('investments.detail.movedDelayNow')} ${formatDay(investment.expectedEndDate!)}.`}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t(isDelayed ? 'investments.detail.delayNoExtraInterest' : 'investments.detail.extendedKeepsInterest')}
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
                <div className="grid gap-4 sm:grid-cols-3">
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
                  {!isForeign && (
                  <div>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder={t('investments.detail.amount')}
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                    />
                    {paymentAmountError && <p className="mt-1 text-xs text-destructive">{paymentAmountError}</p>}
                  </div>
                  )}
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
                </div>
                {isForeign && (
                  <div className="mt-3 rounded-md border bg-muted/30 p-3">
                    <ForeignAmountField
                      idPrefix="payment"
                      currency={investment.currency!}
                      date={paymentDateStr}
                      value={paymentFx}
                      onChange={setPaymentFx}
                      amountLabel="Importe cobrado"
                    />
                  </div>
                )}
                {withholdingApplies && (
                  <div className="mt-3 grid gap-1.5 sm:max-w-xs">
                    <label className="text-sm font-medium" htmlFor="payment-withholding">
                      Retención practicada (€)
                    </label>
                    <Input
                      id="payment-withholding"
                      type="text"
                      inputMode="decimal"
                      value={withholdingTouched ? paymentWithholding : (proposedWithholding ? formatSpanishNumber(proposedWithholding) : '')}
                      placeholder="0,00"
                      onChange={(e) => { setWithholdingTouched(true); setPaymentWithholding(e.target.value); }}
                    />
                    <p className="text-xs text-muted-foreground">
                      {getDefaultWithholdingRate(investment.platform) > 0
                        ? 'Propuesta: 19 % del importe bruto, lo que retienen las plataformas españolas. Cámbiala si tu certificado dice otra cosa.'
                        : 'Las plataformas extranjeras no practican retención española. Si la tuya es española, normalmente retiene el 19 %.'}
                    </p>
                    {newPaymentWithholdingError && (
                      <p className="text-xs text-destructive">{newPaymentWithholdingError}</p>
                    )}
                  </div>
                )}
                {showForeignWithholding && (
                  <div className="mt-3 grid gap-1.5 sm:max-w-xs">
                    <label className="text-sm font-medium" htmlFor="payment-foreign-withholding">
                      Retención en origen ({investment.currency || 'EUR'})
                    </label>
                    <Input
                      id="payment-foreign-withholding"
                      type="text"
                      inputMode="decimal"
                      value={foreignWithholding}
                      placeholder="0,00"
                      onChange={(e) => setForeignWithholding(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Lo que te retuvo el país de la plataforma, si te retuvo algo. Sirve para la deducción por doble imposición (art. 80 LIRPF).
                    </p>
                    {foreignWithholdingError && <p className="text-xs text-destructive">{foreignWithholdingError}</p>}
                  </div>
                )}
                {/* Botones al final: en móvil la retención quedaba debajo de "Añadir" */}
                <div className="mt-3 flex gap-2">
                  <Button onClick={handleAddPayment} disabled={!(parsedPaymentAmount > 0) || !!newPaymentWithholdingError || (showForeignWithholding && !!foreignWithholdingError)}>
                    {t('common.add')}
                  </Button>
                  <Button variant="ghost" onClick={resetPaymentForm}>
                    {t('common.cancel')}
                  </Button>
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
                          {payment.originalCurrency && payment.originalAmount != null && (
                            <p className="text-xs text-muted-foreground">
                              {formatForeignAmount(payment.originalAmount, payment.originalCurrency)}
                              {payment.exchangeRate ? ` · ${formatExchangeRate(payment.exchangeRate, payment.originalCurrency)}` : ''}
                            </p>
                          )}
                          {!!payment.foreignWithholdingAmount && (
                            <p className="text-xs text-muted-foreground">
                              Retención en origen: {formatForeignAmount(payment.foreignWithholdingAmount, payment.foreignWithholdingCurrency || 'EUR')}
                            </p>
                          )}
                          <p className="text-sm text-muted-foreground">
                            {format(parseISO(payment.date), 'dd MMM yyyy', { locale: es })}
                          </p>
                        </div>
                        <Badge variant="secondary">
                          {getPaymentTypeLabel(payment.type)}
                        </Badge>
                        {isWithholdingApplicable(payment.type) && (
                          editingWithholdingId === payment.id ? (
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1">
                                <Input
                                  type="text"
                                  inputMode="decimal"
                                  className="h-8 w-28"
                                  aria-label="Retención practicada (€)"
                                  value={editingWithholdingValue}
                                  onChange={(e) => { setEditingWithholdingValue(e.target.value); setWithholdingError(null); }}
                                />
                                <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Guardar retención" onClick={() => saveWithholding(payment)}>
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Cancelar" onClick={() => setEditingWithholdingId(null)}>
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                              {withholdingError && <p className="text-xs text-destructive">{withholdingError}</p>}
                            </div>
                          ) : (
                            <span className="flex items-center gap-1 text-sm text-muted-foreground">
                              Retención: {formatCurrency(payment.withholdingApplied ?? 0)}
                              {onUpdatePaymentWithholding && (
                                <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Editar retención" onClick={() => startEditWithholding(payment)}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </span>
                          )
                        )}
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
              <h4 className="mb-2 font-semibold">{t('investments.form.notes')}</h4>
              <p className="text-muted-foreground">{investment.notes}</p>
            </div>
          )}

          {/* Ficha fiscal del impago (Fase 4) */}
          {investment.status === 'defaulted' && (
            <div>
              <h4 className="mb-3 font-semibold">{t('defaultLoss.title')}</h4>
              <DefaultLossStatusCard
                investment={investment}
                onUpdateFiscalStatus={(inv) => onUpdateFiscalStatus?.(inv)}
              />
              <div className="mt-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => setShowUndoDefaultConfirm(true)}
                >
                  {t('defaultLoss.undo.button')}
                </Button>
              </div>
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
                  <p className="text-sm font-medium">{t('investments.action.extendKindQuestion')}</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {(['extended', 'delayed'] as const).map(kind => (
                      <button
                        key={kind}
                        type="button"
                        onClick={() => setExtendKind(kind)}
                        className={cn(
                          'rounded-md border p-3 text-left text-sm transition-colors',
                          extendKind === kind ? 'border-primary bg-primary/5' : 'hover:bg-muted/50',
                        )}
                        aria-pressed={extendKind === kind}
                      >
                        <span className="font-medium">{t(`investments.action.extendKind.${kind}`)}</span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">{t(`investments.action.extendKind.${kind}.hint`)}</span>
                      </button>
                    ))}
                  </div>
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
                      <p className="text-xs text-muted-foreground">{t('investments.action.returnedAmount')}{isForeign ? ' (abajo, en la divisa)' : ''}</p>
                      {!isForeign && <Input
                        type="text"
                        inputMode="decimal"
                        placeholder="0,00"
                        value={partialAmount}
                        onChange={e => setPartialAmount(e.target.value)}
                      />}
                      {partialAmount.trim() !== '' && !(parseAmountInput(partialAmount) > 0) && (
                        <p className="text-xs text-destructive">Importe no válido (ej. 1.500,50)</p>
                      )}
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
                  {isForeign && (
                    <ForeignAmountField
                      idPrefix="partial-return"
                      currency={investment.currency!}
                      date={toDateOnlyString(partialDate)}
                      value={partialFx}
                      onChange={setPartialFx}
                      amountLabel="Capital devuelto"
                    />
                  )}
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handlePartialReturn} disabled={isForeign ? !buildForeignPaymentFields(investment.currency!, partialFx, toDateOnlyString(partialDate)) : !(parseAmountInput(partialAmount) > 0)}>{t('common.save')}</Button>
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
                      type="text"
                      inputMode="decimal"
                      placeholder={formatSpanishNumber(investment.expectedReturn)}
                      value={newReturnRate}
                      onChange={e => setNewReturnRate(e.target.value)}
                    />
                    {newReturnRate.trim() !== '' && !(parseAmountInput(newReturnRate) >= 0 && parseAmountInput(newReturnRate) <= 100) && (
                      <p className="text-xs text-destructive">Rentabilidad no válida (entre 0 y 100, ej. 9,5)</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleUpdateReturn} disabled={!(parseAmountInput(newReturnRate) >= 0 && parseAmountInput(newReturnRate) <= 100)}>{t('common.save')}</Button>
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

      <AlertDialog open={showUndoDefaultConfirm} onOpenChange={setShowUndoDefaultConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('defaultLoss.undo.title')}</AlertDialogTitle>
            <AlertDialogDescription>{t('defaultLoss.undo.description')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={undoingDefault}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={undoingDefault}
              onClick={handleUndoDefault}
            >
              {t('defaultLoss.undo.button')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
