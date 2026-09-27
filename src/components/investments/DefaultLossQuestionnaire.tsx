import { useMemo, useState } from 'react';
import { z } from 'zod';
import { format, parseISO } from 'date-fns';
import { ChevronDown, ChevronLeft, Info, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Investment, Payment } from '@/types/investment';
import {
  InsolvencyStatus,
  EnforcementInitiator,
  DefaultLossPayment,
  assessDefaultLoss,
  DefaultLossResult,
} from '@/lib/tax/defaultLoss';
import { answersToLossColumns, DefaultLossAnswers } from '@/lib/tax/answersToLossColumns';
import { getPrincipalReturned } from '@/lib/tax/principalReturned';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

type Step = 'equity' | 'p0' | 'p1' | 'p2' | 'pq' | 'p3' | 'p4' | 'result';

interface WizardAnswers {
  insolvencyChoice: 'yes' | 'no' | 'unknown' | null; // P1
  insolvencyConcludedDate: string; // P2
  insolvencyOpen: boolean | null; // P2: false = 'Ha terminado', true = 'Sigue abierto', null = sin responder
  quitaChoice: 'yes' | 'no' | 'unknown' | null; // PQ
  quitaAmount: string;
  quitaDate: string;
  enforcementChoice: 'user' | 'platform' | 'no' | 'unknown' | null; // P3
  enforcementDate: string; // P4
}

const EMPTY_ANSWERS: WizardAnswers = {
  insolvencyChoice: null,
  insolvencyConcludedDate: '',
  insolvencyOpen: null,
  quitaChoice: null,
  quitaAmount: '',
  quitaDate: '',
  enforcementChoice: null,
  enforcementDate: '',
};

interface Props {
  investment: Investment | null;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<Investment>) => Promise<unknown>;
  onAddPayment?: (investmentId: string, payment: Omit<Payment, 'id'>) => Promise<unknown>;
  /** Respuestas previas, para reabrir el cuestionario ya relleno (Fase 4). No se usa en la Fase 3. */
  initialAnswers?: DefaultLossAnswers | null;
}

function formatCurrency(v: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency', currency: 'EUR',
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(v);
}

function formatDate(dateStr: string): string {
  return format(parseISO(dateStr), 'dd/MM/yyyy');
}

function todayStr(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

function dateSchema(investmentDate: string) {
  return z
    .string()
    .min(1, 'La fecha es obligatoria')
    .refine((d) => d <= todayStr(), 'La fecha no puede ser futura')
    .refine((d) => !investmentDate || d >= investmentDate, 'La fecha no puede ser anterior a la fecha de inversión');
}

function amountSchema(max: number) {
  return z
    .string()
    .min(1, 'El importe es obligatorio')
    .transform((v) => parseFloat(v.replace(',', '.')))
    .refine((v) => !isNaN(v) && v > 0, 'El importe debe ser mayor que 0')
    .refine((v) => isNaN(v) || v <= max, `El importe no puede superar ${formatCurrency(max)}`);
}

function WhyWeAsk({ text }: { text: string }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <Info className="h-3.5 w-3.5" />
          {t('defaultLoss.q.whyWeAsk')}
          <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
        {text}
      </CollapsibleContent>
    </Collapsible>
  );
}

function ChoiceButton({
  label, selected, onClick,
}: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full text-left rounded-lg border p-3 text-sm transition-colors hover:bg-accent',
        selected && 'border-primary bg-primary/5',
      )}
    >
      {label}
    </button>
  );
}

export function DefaultLossQuestionnaire({ investment, onClose, onUpdate, onAddPayment, initialAnswers }: Props) {
  const { t } = useLanguage();

  const buildInitialWizard = (): WizardAnswers => {
    if (!initialAnswers) return EMPTY_ANSWERS;
    return {
      insolvencyChoice:
        initialAnswers.insolvencyStatus === 'none' ? 'no'
        : initialAnswers.insolvencyStatus === 'unknown' ? 'unknown'
        : 'yes',
      insolvencyConcludedDate: initialAnswers.insolvencyConcludedDate ?? '',
      insolvencyOpen: initialAnswers.insolvencyStatus === 'open',
      quitaChoice: initialAnswers.quitaAmount != null ? 'yes' : 'no',
      quitaAmount: initialAnswers.quitaAmount != null ? String(initialAnswers.quitaAmount) : '',
      quitaDate: initialAnswers.quitaDate ?? '',
      enforcementChoice: !initialAnswers.enforcementStarted
        ? 'no'
        : initialAnswers.enforcementInitiator ?? 'user',
      enforcementDate: initialAnswers.enforcementDate ?? '',
    };
  };

  const isEquity = investment?.incomeModel === 'equity';
  const [history, setHistory] = useState<Step[]>([isEquity ? 'equity' : 'p0']);
  const [answers, setAnswers] = useState<WizardAnswers>(buildInitialWizard);
  const [showRecoveryForm, setShowRecoveryForm] = useState(false);
  const [recoveryAmount, setRecoveryAmount] = useState('');
  const [recoveryDate, setRecoveryDate] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const step = history[history.length - 1];

  // ── Derivar DefaultLossAnswers a partir del wizard ─────────────────────
  // (Hooks: deben ejecutarse siempre, antes del `if (!investment) return null`.)
  const derivedAnswers: DefaultLossAnswers = useMemo(() => {
    const insolvencyStatus: InsolvencyStatus =
      answers.insolvencyChoice === 'no' ? 'none'
      : answers.insolvencyChoice === 'unknown' ? 'unknown'
      : answers.insolvencyOpen === true ? 'open'
      : 'concluded_unpaid';
    const enforcementStarted = answers.enforcementChoice === 'user' || answers.enforcementChoice === 'platform';
    return {
      insolvencyStatus,
      insolvencyConcludedDate: insolvencyStatus === 'concluded_unpaid' ? answers.insolvencyConcludedDate : null,
      quitaAmount: answers.quitaChoice === 'yes' ? parseFloat(answers.quitaAmount.replace(',', '.')) : null,
      quitaDate: answers.quitaChoice === 'yes' ? answers.quitaDate : null,
      enforcementStarted,
      enforcementDate: enforcementStarted ? answers.enforcementDate : null,
      enforcementInitiator: enforcementStarted ? (answers.enforcementChoice as EnforcementInitiator) : null,
    };
  }, [answers]);

  // ── Vista previa del resultado (incluye la recuperación de P0 si se añadió) ─
  const previewResult: DefaultLossResult | null = useMemo(() => {
    if (!investment || isEquity || step !== 'result') return null;
    const pendingPayments: DefaultLossPayment[] = (investment.payments ?? []).map((p) => ({
      type: p.type, amount: p.amount, date: p.date,
    }));
    if (showRecoveryForm && recoveryAmount && recoveryDate) {
      const parsed = parseFloat(recoveryAmount.replace(',', '.'));
      if (!isNaN(parsed)) pendingPayments.push({ type: 'principal', amount: parsed, date: recoveryDate });
    }
    return assessDefaultLoss({
      incomeModel: investment.incomeModel,
      amountInvested: investment.amount,
      payments: pendingPayments,
      lossAssessedAt: new Date().toISOString(),
      ...derivedAnswers,
    });
  }, [investment, isEquity, step, derivedAnswers, showRecoveryForm, recoveryAmount, recoveryDate]);

  const reset = () => {
    setHistory([isEquity ? 'equity' : 'p0']);
    setAnswers(EMPTY_ANSWERS);
    setShowRecoveryForm(false);
    setRecoveryAmount('');
    setRecoveryDate('');
    setFieldError(null);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) { reset(); onClose(); }
  };

  const goTo = (next: Step) => {
    setFieldError(null);
    setHistory((h) => [...h, next]);
  };

  const goBack = () => {
    setFieldError(null);
    setHistory((h) => (h.length > 1 ? h.slice(0, -1) : h));
  };

  if (!investment) return null;

  const investmentDate = investment.investmentDate ?? '';
  const principalReturnedSoFar = getPrincipalReturned(investment.payments ?? []);
  const pendingLossSoFar = investment.amount - principalReturnedSoFar;

  // ── P0: recuperación opcional ──────────────────────────────────────────
  const handleP0Continue = () => {
    if (showRecoveryForm) {
      const amountResult = amountSchema(Math.max(pendingLossSoFar, 0)).safeParse(recoveryAmount);
      if (!amountResult.success) { setFieldError(amountResult.error.issues[0].message); return; }
      const dateResult = dateSchema(investmentDate).safeParse(recoveryDate);
      if (!dateResult.success) { setFieldError(dateResult.error.issues[0].message); return; }
    }
    goTo('p1');
  };

  // ── P1: concurso ────────────────────────────────────────────────────────
  const handleP1Continue = () => {
    if (!answers.insolvencyChoice) { setFieldError('Selecciona una opción.'); return; }
    if (answers.insolvencyChoice === 'yes') { goTo('p2'); return; }
    goTo('pq');
  };

  // ── P2: situación del concurso ─────────────────────────────────────────
  const handleP2Continue = () => {
    if (answers.insolvencyOpen === null) { setFieldError('Selecciona una opción.'); return; }
    if (answers.insolvencyOpen === false) {
      const dateResult = dateSchema(investmentDate).safeParse(answers.insolvencyConcludedDate);
      if (!dateResult.success) { setFieldError(dateResult.error.issues[0].message); return; }
    }
    goTo('pq');
  };

  // ── PQ: quita (siempre se pregunta) ────────────────────────────────────
  const handlePqContinue = () => {
    if (!answers.quitaChoice) { setFieldError('Selecciona una opción.'); return; }
    if (answers.quitaChoice === 'yes') {
      const amountResult = amountSchema(investment.amount).safeParse(answers.quitaAmount);
      if (!amountResult.success) { setFieldError(amountResult.error.issues[0].message); return; }
      const dateResult = dateSchema(investmentDate).safeParse(answers.quitaDate);
      if (!dateResult.success) { setFieldError(dateResult.error.issues[0].message); return; }
    }
    // El concurso prevalece: si P1 = Sí, no se pregunta por la ejecución.
    if (answers.insolvencyChoice === 'yes') { goTo('result'); return; }
    goTo('p3');
  };

  // ── P3: ejecución judicial ──────────────────────────────────────────────
  const handleP3Continue = () => {
    if (!answers.enforcementChoice) { setFieldError('Selecciona una opción.'); return; }
    if (answers.enforcementChoice === 'user' || answers.enforcementChoice === 'platform') { goTo('p4'); return; }
    goTo('result');
  };

  // ── P4: fecha de inicio de la ejecución ────────────────────────────────
  const handleP4Continue = () => {
    const dateResult = dateSchema(investmentDate).safeParse(answers.enforcementDate);
    if (!dateResult.success) { setFieldError(dateResult.error.issues[0].message); return; }
    goTo('result');
  };

  // ── Guardado final ──────────────────────────────────────────────────────
  const handleConfirm = async (answersForSave: DefaultLossAnswers | null) => {
    setSaving(true);
    setFieldError(null);
    const lossColumns = answersToLossColumns(answersForSave);
    const result = await onUpdate(investment.id, {
      status: 'defaulted',
      defaultedAt: new Date().toISOString(),
      ...lossColumns,
    });
    const errorMessage =
      result && typeof result === 'object' && 'error' in result && typeof result.error === 'string'
        ? result.error
        : null;
    if (errorMessage) {
      setSaving(false);
      setFieldError(errorMessage);
      toast.error(errorMessage);
      return;
    }
    if (showRecoveryForm && recoveryAmount && recoveryDate && onAddPayment) {
      const parsed = parseFloat(recoveryAmount.replace(',', '.'));
      const paymentResult = await onAddPayment(investment.id, {
        type: 'principal', amount: parsed, date: recoveryDate,
      });
      if (!paymentResult) {
        setSaving(false);
        const message = 'La inversión se marcó como impago, pero no se pudo guardar la recuperación. Vuelve a intentarlo.';
        setFieldError(message);
        toast.error(message);
        return;
      }
    }
    setSaving(false);
    toast.success('Inversión marcada como impago.');
    reset();
    onClose();
  };

  const formatAmountFixed = (v: number) => new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(v);

  // ── Render: equity ───────────────────────────────────────────────────────
  if (isEquity) {
    return (
      <Dialog open={!!investment} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('defaultLoss.title')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm">{t('defaultLoss.equity.text')}</p>
          <p className="text-xs text-muted-foreground">{t('defaultLoss.disclaimer')}</p>
          {fieldError && (
            <div className="flex gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{fieldError}</span>
            </div>
          )}
          <div className="flex gap-3 pt-1">
            <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={saving}>
              {t('common.cancel')}
            </Button>
            <Button className="flex-1" onClick={() => handleConfirm(null)} disabled={saving}>
              {t('defaultLoss.nav.confirm')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={!!investment} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('defaultLoss.title')}</DialogTitle>
        </DialogHeader>

        {step === 'p0' && (
          <div className="space-y-4">
            <p className="text-sm font-medium">{t('defaultLoss.q.p0.title')}</p>
            <p className="text-sm text-muted-foreground">
              {t('defaultLoss.q.p0.capitalReceived').replace('{amount}', formatAmountFixed(principalReturnedSoFar))}
            </p>
            <WhyWeAsk text={t('defaultLoss.q.p0.help')} />
            {!showRecoveryForm ? (
              <Button type="button" variant="outline" size="sm" onClick={() => setShowRecoveryForm(true)}>
                {t('defaultLoss.q.p0.addRecoveryButton')}
              </Button>
            ) : (
              <div className="space-y-3 rounded-lg border p-3">
                <div className="space-y-1.5">
                  <p className="text-sm font-medium">{t('defaultLoss.q.p0.recoveryAmountLabel')}</p>
                  <Input
                    type="text" inputMode="decimal" placeholder="0,00"
                    value={recoveryAmount}
                    onChange={(e) => setRecoveryAmount(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <p className="text-sm font-medium">{t('defaultLoss.q.p0.recoveryDateLabel')}</p>
                  <Input
                    type="date"
                    value={recoveryDate}
                    onChange={(e) => setRecoveryDate(e.target.value)}
                  />
                </div>
                <Button
                  type="button" variant="ghost" size="sm"
                  onClick={() => { setShowRecoveryForm(false); setRecoveryAmount(''); setRecoveryDate(''); }}
                >
                  {t('defaultLoss.q.p0.removeRecovery')}
                </Button>
              </div>
            )}
            {fieldError && <p className="text-sm text-destructive">{fieldError}</p>}
            <div className="flex justify-end pt-1">
              <Button onClick={handleP0Continue}>{t('defaultLoss.nav.continue')}</Button>
            </div>
          </div>
        )}

        {step === 'p1' && (
          <div className="space-y-4">
            <p className="text-sm font-medium">{t('defaultLoss.q.p1.title')}</p>
            <WhyWeAsk text={t('defaultLoss.q.p1.help')} />
            <div className="space-y-2">
              <ChoiceButton
                label={t('common.yes')}
                selected={answers.insolvencyChoice === 'yes'}
                onClick={() => setAnswers((a) => ({ ...a, insolvencyChoice: 'yes' }))}
              />
              <ChoiceButton
                label={t('common.no')}
                selected={answers.insolvencyChoice === 'no'}
                onClick={() => setAnswers((a) => ({ ...a, insolvencyChoice: 'no' }))}
              />
              <ChoiceButton
                label={t('common.dontKnow')}
                selected={answers.insolvencyChoice === 'unknown'}
                onClick={() => setAnswers((a) => ({ ...a, insolvencyChoice: 'unknown' }))}
              />
            </div>
            {fieldError && <p className="text-sm text-destructive">{fieldError}</p>}
            <div className="flex gap-3 pt-1">
              <Button variant="outline" size="sm" onClick={goBack} disabled={saving}>
                <ChevronLeft className="mr-1 h-4 w-4" />{t('defaultLoss.nav.back')}
              </Button>
              <Button className="flex-1" onClick={handleP1Continue}>{t('defaultLoss.nav.continue')}</Button>
            </div>
          </div>
        )}

        {step === 'p2' && (
          <div className="space-y-4">
            <p className="text-sm font-medium">{t('defaultLoss.q.p2.title')}</p>
            <WhyWeAsk text={t('defaultLoss.q.p2.help')} />
            <div className="space-y-2">
              <ChoiceButton
                label={t('defaultLoss.q.p2.concludedOption')}
                selected={answers.insolvencyOpen === false}
                onClick={() => setAnswers((a) => ({ ...a, insolvencyOpen: false }))}
              />
              <ChoiceButton
                label={t('defaultLoss.q.p2.openOption')}
                selected={answers.insolvencyOpen === true}
                onClick={() => setAnswers((a) => ({ ...a, insolvencyOpen: true, insolvencyConcludedDate: '' }))}
              />
            </div>
            {answers.insolvencyOpen === false && (
              <div className="space-y-1.5">
                <p className="text-sm font-medium">{t('defaultLoss.q.p2.dateLabel')}</p>
                <Input
                  type="date"
                  value={answers.insolvencyConcludedDate}
                  onChange={(e) => setAnswers((a) => ({ ...a, insolvencyConcludedDate: e.target.value }))}
                />
              </div>
            )}
            {fieldError && <p className="text-sm text-destructive">{fieldError}</p>}
            <div className="flex gap-3 pt-1">
              <Button variant="outline" size="sm" onClick={goBack} disabled={saving}>
                <ChevronLeft className="mr-1 h-4 w-4" />{t('defaultLoss.nav.back')}
              </Button>
              <Button className="flex-1" onClick={handleP2Continue}>{t('defaultLoss.nav.continue')}</Button>
            </div>
          </div>
        )}

        {step === 'pq' && (
          <div className="space-y-4">
            <p className="text-sm font-medium">{t('defaultLoss.q.pq.title')}</p>
            <WhyWeAsk text={t('defaultLoss.q.pq.help')} />
            <div className="space-y-2">
              <ChoiceButton
                label={t('common.yes')}
                selected={answers.quitaChoice === 'yes'}
                onClick={() => setAnswers((a) => ({ ...a, quitaChoice: 'yes' }))}
              />
              <ChoiceButton
                label={t('common.no')}
                selected={answers.quitaChoice === 'no'}
                onClick={() => setAnswers((a) => ({ ...a, quitaChoice: 'no', quitaAmount: '', quitaDate: '' }))}
              />
              <ChoiceButton
                label={t('common.dontKnow')}
                selected={answers.quitaChoice === 'unknown'}
                onClick={() => setAnswers((a) => ({ ...a, quitaChoice: 'unknown', quitaAmount: '', quitaDate: '' }))}
              />
            </div>
            {answers.quitaChoice === 'yes' && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <p className="text-sm font-medium">{t('defaultLoss.q.pq.amountLabel')}</p>
                  <Input
                    type="text" inputMode="decimal" placeholder="0,00"
                    value={answers.quitaAmount}
                    onChange={(e) => setAnswers((a) => ({ ...a, quitaAmount: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <p className="text-sm font-medium">{t('defaultLoss.q.pq.dateLabel')}</p>
                  <Input
                    type="date"
                    value={answers.quitaDate}
                    onChange={(e) => setAnswers((a) => ({ ...a, quitaDate: e.target.value }))}
                  />
                </div>
              </div>
            )}
            {fieldError && <p className="text-sm text-destructive">{fieldError}</p>}
            <div className="flex gap-3 pt-1">
              <Button variant="outline" size="sm" onClick={goBack} disabled={saving}>
                <ChevronLeft className="mr-1 h-4 w-4" />{t('defaultLoss.nav.back')}
              </Button>
              <Button className="flex-1" onClick={handlePqContinue}>{t('defaultLoss.nav.continue')}</Button>
            </div>
          </div>
        )}

        {step === 'p3' && (
          <div className="space-y-4">
            <p className="text-sm font-medium">{t('defaultLoss.q.p3.title')}</p>
            <WhyWeAsk text={t('defaultLoss.q.p3.help')} />
            <div className="space-y-2">
              <ChoiceButton
                label={t('defaultLoss.q.p3.userOption')}
                selected={answers.enforcementChoice === 'user'}
                onClick={() => setAnswers((a) => ({ ...a, enforcementChoice: 'user' }))}
              />
              <ChoiceButton
                label={t('defaultLoss.q.p3.platformOption')}
                selected={answers.enforcementChoice === 'platform'}
                onClick={() => setAnswers((a) => ({ ...a, enforcementChoice: 'platform' }))}
              />
              <ChoiceButton
                label={t('common.no')}
                selected={answers.enforcementChoice === 'no'}
                onClick={() => setAnswers((a) => ({ ...a, enforcementChoice: 'no', enforcementDate: '' }))}
              />
              <ChoiceButton
                label={t('common.dontKnow')}
                selected={answers.enforcementChoice === 'unknown'}
                onClick={() => setAnswers((a) => ({ ...a, enforcementChoice: 'unknown', enforcementDate: '' }))}
              />
            </div>
            {fieldError && <p className="text-sm text-destructive">{fieldError}</p>}
            <div className="flex gap-3 pt-1">
              <Button variant="outline" size="sm" onClick={goBack} disabled={saving}>
                <ChevronLeft className="mr-1 h-4 w-4" />{t('defaultLoss.nav.back')}
              </Button>
              <Button className="flex-1" onClick={handleP3Continue}>{t('defaultLoss.nav.continue')}</Button>
            </div>
          </div>
        )}

        {step === 'p4' && (
          <div className="space-y-4">
            <p className="text-sm font-medium">{t('defaultLoss.q.p4.title')}</p>
            <WhyWeAsk text={t('defaultLoss.q.p4.help')} />
            <Input
              type="date"
              value={answers.enforcementDate}
              onChange={(e) => setAnswers((a) => ({ ...a, enforcementDate: e.target.value }))}
            />
            {fieldError && <p className="text-sm text-destructive">{fieldError}</p>}
            <div className="flex gap-3 pt-1">
              <Button variant="outline" size="sm" onClick={goBack} disabled={saving}>
                <ChevronLeft className="mr-1 h-4 w-4" />{t('defaultLoss.nav.back')}
              </Button>
              <Button className="flex-1" onClick={handleP4Continue}>{t('defaultLoss.nav.continue')}</Button>
            </div>
          </div>
        )}

        {step === 'result' && previewResult && (
          <div className="space-y-4">
            {previewResult.status === 'no_loss' ? (
              <p className="text-sm">{t('defaultLoss.result.noLoss')}</p>
            ) : (
              <>
                <p className="text-sm font-medium">
                  {t('defaultLoss.result.headline')
                    .replace('{loss}', formatAmountFixed(previewResult.lossAmount))
                    .replace('{project}', investment.projectName)}
                </p>

                {previewResult.imputations.map((imp, i) => {
                  const key =
                    imp.trigger === 'quita' ? 'defaultLoss.result.imputation.quita'
                    : imp.trigger === 'insolvency_concluded' ? 'defaultLoss.result.imputation.insolvencyConcluded'
                    : 'defaultLoss.result.imputation.enforcement';
                  return (
                    <p key={i} className="text-sm">
                      {t(key)
                        .replace('{date}', formatDate(imp.triggerDate))
                        .replace('{amount}', formatAmountFixed(imp.amount))
                        .replace('{year}', String(imp.year))}
                    </p>
                  );
                })}

                {previewResult.imputations.length > 0 && (
                  <p className="text-sm text-muted-foreground">{t('defaultLoss.result.generalBaseNote')}</p>
                )}

                {previewResult.flags.platformInitiatedEnforcement && (
                  <div className="flex gap-2 rounded-lg border border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30 p-3 text-sm text-amber-800 dark:text-amber-300">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{t('defaultLoss.result.platformEnforcementWarning')}</span>
                  </div>
                )}

                {previewResult.pendingAmount > 0 && (
                  <div className="rounded-lg border bg-muted/30 p-3 space-y-1.5">
                    <p className="text-sm font-medium">
                      {(previewResult.imputations.length > 0
                        ? t('defaultLoss.result.pendingHeader.withImputations')
                        : t('defaultLoss.result.pendingHeader.withoutImputations')
                      ).replace('{pending}', formatAmountFixed(previewResult.pendingAmount))}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {previewResult.pendingReason === 'pending_deadline'
                        ? t('defaultLoss.result.pending.deadline')
                            .replace('{startDate}', answers.enforcementDate ? formatDate(answers.enforcementDate) : '')
                            .replace('{deadline}', previewResult.deadlineDate ? formatDate(previewResult.deadlineDate) : '')
                        : previewResult.pendingReason === 'pending_insolvency'
                        ? t('defaultLoss.result.pending.insolvency')
                        : previewResult.pendingReason === 'unknown'
                        ? t('defaultLoss.result.pending.unknown')
                        : t('defaultLoss.result.pending.notYet')}
                    </p>
                  </div>
                )}
              </>
            )}

            <p className="text-xs text-muted-foreground">{t('defaultLoss.disclaimer')}</p>
            {fieldError && (
              <div className="flex gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{fieldError}</span>
              </div>
            )}
            <div className="flex gap-3 pt-1">
              <Button variant="outline" size="sm" onClick={goBack} disabled={saving}>
                <ChevronLeft className="mr-1 h-4 w-4" />{t('defaultLoss.nav.back')}
              </Button>
              <Button className="flex-1" onClick={() => handleConfirm(derivedAnswers)} disabled={saving}>
                {t('defaultLoss.nav.confirm')}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
