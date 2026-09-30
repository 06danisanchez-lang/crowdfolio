import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, Plus, AlertTriangle, Info } from 'lucide-react';
import { Investment, Platform, InvestmentStatus, PLATFORMS, STATUS_OPTIONS, INCOME_MODEL_OPTIONS, PAYMENT_FREQUENCY_OPTIONS, PRINCIPAL_RETURN_TYPE_OPTIONS, EQUITY_TYPE_OPTIONS, IncomeModel, PaymentFrequency, PrincipalReturnType, EquityType } from '@/types/investment';
import { getInvestmentCompletionStatus } from '@/lib/investment/completeness';
import { generateSchedule } from '@/lib/investment/scheduleGenerator';
import { parseSpanishNumber, formatSpanishNumber } from '@/lib/investment/parseSpanishNumber';
import { PLAN_FEATURES } from '@/lib/stripe/config';
import { toDateOnlyString } from '@/lib/dateOnly';

// 'Impago' no es seleccionable desde este formulario genérico: solo se puede
// llegar a 'defaulted' completando el cuestionario de calificación fiscal
// (DefaultLossQuestionnaire), que guarda las columnas loss_* que esta
// pantalla no conoce. Ver isBlockedDefaultedTransition.
const EDITABLE_STATUS_OPTIONS = STATUS_OPTIONS.filter(s => s.value !== 'defaulted');

export interface FutureInvestmentFormData {
  platform: Platform;
  customPlatformName?: string;
  projectName: string;
  amount?: number;
  expectedReturn?: number;
  investmentDate?: Date;
  expectedEndDate?: Date;
  sourceUrl?: string;
  notes?: string;
}
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
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
import { useAuth } from '@/contexts/AuthContext';
import { useInvestmentDraft } from '@/hooks/useInvestmentDraft';
import { useLanguage } from '@/contexts/LanguageContext';

const END_DATE_REQUIRED_MODELS = ['bullet', 'periodic_fixed', 'amortizing'] as const;

/**
 * Input numérico controlado por react-hook-form, en formato español (punto
 * de millares, coma decimal — ver parseSpanishNumber.ts) y que representa
 * "vacío" siempre con `null`, nunca `undefined`: si un campo Controller de
 * react-hook-form llega a mostrar alguna vez un valor real (al editar una
 * inversión existente, o al restaurar un borrador), su valor "vacío" interno
 * queda fijado a ese primer valor para siempre — internamente cae de vuelta a
 * él en cuanto el valor pasa a ser undefined, así que el campo parece
 * imposible de vaciar del todo. null sí es un valor "real" para
 * react-hook-form (no dispara ese fallback) y ya es lo que esperan
 * investmentSchema/draftInvestmentSchema y el resto del flujo de guardado.
 *
 * El texto mostrado vive en un estado local propio (lo que el usuario ve tal
 * cual lo escribe) en vez de derivarse directamente de `value` en cada
 * render: reformatear "10," a "10" en cuanto se interpreta como 10 le
 * impediría completar "10,5". Se resincroniza desde `value` solo cuando este
 * cambia por una causa EXTERNA a este input (editar otra inversión, restaurar
 * un borrador) — nunca como reacción al propio tecleo del usuario — y se
 * reformatea al estilo español al perder el foco, para que el usuario vea
 * exactamente lo que se va a guardar. Una entrada ambigua o no reconocida
 * (ver parseSpanishNumber) nunca se adivina en silencio: se muestra un error
 * y el valor comprometido pasa a null, para que el guardado quede bloqueado
 * por la misma validación de "campo obligatorio" de siempre.
 */
function NumericTextInput({
  value,
  onChange,
  placeholder,
  suffix,
}: {
  value: number | null | undefined;
  onChange: (value: number | null) => void;
  placeholder?: string;
  suffix?: string;
}) {
  const [text, setText] = useState(value != null ? formatSpanishNumber(value) : '');
  const [error, setError] = useState<string | null>(null);

  // No resincroniza mientras el texto actual esté a medio escribir (p.ej.
  // "1.234," recién tecleada la coma, antes de los decimales) — eso también
  // es técnicamente un error de parseSpanishNumber, pero solo se resuelve al
  // perder el foco (onBlur), nunca sobrescribiendo en pleno tecleo.
  const parsedFromText = parseSpanishNumber(text);
  if (!parsedFromText.error && (value ?? null) !== parsedFromText.value) {
    setText(value != null ? formatSpanishNumber(value) : '');
    setError(null);
  }

  return (
    <div>
      <div className="relative">
        <Input
          type="text"
          inputMode="decimal"
          placeholder={placeholder}
          className={suffix ? 'pr-8' : undefined}
          value={text}
          onChange={(e) => {
            const raw = e.target.value;
            setText(raw);
            const result = parseSpanishNumber(raw);
            if (!result.error) {
              setError(null);
              onChange(result.value);
            }
            // Si hay error, no se toca el valor comprometido todavía —
            // permite seguir escribiendo un número en curso (p.ej. "1.500,"
            // antes del último dígito) sin borrar lo ya válido. Se resuelve
            // definitivamente al perder el foco (onBlur).
          }}
          onBlur={() => {
            const result = parseSpanishNumber(text);
            if (result.error) {
              setError(result.error);
              onChange(null);
            } else {
              setError(null);
              onChange(result.value);
              setText(result.value != null ? formatSpanishNumber(result.value) : '');
            }
          }}
        />
        {suffix && (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
      {error && <p className="text-sm font-medium text-destructive mt-1">{error}</p>}
    </div>
  );
}

// Refleja exactamente la constraint SQL investments_first_payment_date_range_check
// (NULL-tolerante igual que ella) para que una fecha inválida nunca llegue a
// intentar guardarse en la BD — el mensaje del constraint no debe verse nunca.
function checkFirstPaymentDateRange(
  data: { incomeModel?: string; investmentDate?: Date; expectedEndDate?: Date; firstPaymentDate?: Date },
  ctx: z.RefinementCtx,
) {
  if (!data.firstPaymentDate) return;
  if (data.incomeModel !== 'periodic_fixed' && data.incomeModel !== 'amortizing') return;
  const afterInvestment = !data.investmentDate || data.firstPaymentDate > data.investmentDate;
  const beforeOrOnEnd = !data.expectedEndDate || data.firstPaymentDate <= data.expectedEndDate;
  if (!afterInvestment || !beforeOrOnEnd) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['firstPaymentDate'],
      message: 'La fecha del primer cobro debe estar entre la fecha de inversión y el vencimiento',
    });
  }
}

const investmentSchema = z.object({
  platform: z.enum(['urbanitae', 'housers', 'estateguru', 'crowdcube', 'brickstarter', 'wecity', 'other'] as const),
  customPlatformName: z.string().optional(),
  projectName: z.string().min(1, 'El nombre del proyecto es requerido'),
  amount: z.number().min(1, 'El monto debe ser mayor a 0'),
  investmentDate: z.date(),
  expectedEndDate: z.date().optional(),
  expectedReturn: z.number().min(0, 'El rendimiento debe ser mayor o igual a 0'),
  incomeModel: z.enum(['bullet', 'periodic_fixed', 'amortizing', 'variable_or_unknown', 'equity'] as const),
  paymentFrequency: z.enum(['monthly', 'quarterly', 'semiannual', 'annual'] as const).optional(),
  firstPaymentDate: z.date().optional(),
  principalReturnType: z.enum(['at_maturity', 'amortizing', 'unknown'] as const).optional(),
  equityType: z.enum(['plusvalia', 'rentas', 'liquidacion'] as const).optional(),
  status: z.enum(['active', 'pending', 'completed', 'defaulted', 'draft'] as const),
  notes: z.string().optional(),
  sourceUrl: z.string().optional(),
}).superRefine((data, ctx) => {
  if ((END_DATE_REQUIRED_MODELS as readonly string[]).includes(data.incomeModel) && !data.expectedEndDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['expectedEndDate'],
      message: 'La fecha de vencimiento es obligatoria para este tipo de inversión',
    });
  }
  if (data.incomeModel === 'equity' && !data.equityType) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['equityType'],
      message: 'Selecciona el tipo de inversión equity',
    });
  }
  checkFirstPaymentDateRange(data, ctx);
});

const draftInvestmentSchema = z.object({
  platform: z.enum(['urbanitae', 'housers', 'estateguru', 'crowdcube', 'brickstarter', 'wecity', 'other'] as const).optional(),
  customPlatformName: z.string().optional(),
  projectName: z.string().min(1, 'El nombre del proyecto es requerido'),
  amount: z.number().nullable().optional(),
  investmentDate: z.date().optional(),
  expectedEndDate: z.date().optional(),
  expectedReturn: z.number().nullable().optional(),
  incomeModel: z.enum(['bullet', 'periodic_fixed', 'amortizing', 'variable_or_unknown', 'equity'] as const).optional(),
  paymentFrequency: z.enum(['monthly', 'quarterly', 'semiannual', 'annual'] as const).optional(),
  firstPaymentDate: z.date().optional(),
  principalReturnType: z.enum(['at_maturity', 'amortizing', 'unknown'] as const).optional(),
  equityType: z.enum(['plusvalia', 'rentas', 'liquidacion'] as const).optional(),
  status: z.enum(['active', 'pending', 'completed', 'defaulted', 'draft'] as const).optional(),
  notes: z.string().optional(),
  sourceUrl: z.string().optional(),
}).superRefine((data, ctx) => {
  checkFirstPaymentDateRange(data, ctx);
});

const futureInvestmentSchema = z.object({
  platform: z.enum(['urbanitae', 'housers', 'estateguru', 'crowdcube', 'brickstarter', 'wecity', 'other'] as const),
  customPlatformName: z.string().optional(),
  projectName: z.string().min(1, 'El nombre del proyecto es requerido'),
  amount: z.number().nullable().optional(),
  investmentDate: z.date().optional(),
  expectedEndDate: z.date().optional(),
  expectedReturn: z.number().nullable().optional(),
  status: z.enum(['active', 'pending', 'completed', 'defaulted'] as const).optional(),
  notes: z.string().optional(),
  sourceUrl: z.string().optional(),
});

type InvestmentFormData = z.infer<typeof investmentSchema>;

interface EditFormValues {
  platform?: Platform;
  customPlatformName?: string;
  projectName?: string;
  amount?: number;
  investmentDate?: Date;
  expectedEndDate?: Date;
  expectedReturn?: number;
  incomeModel?: IncomeModel;
  paymentFrequency?: PaymentFrequency;
  firstPaymentDate?: Date;
  principalReturnType?: PrincipalReturnType;
  equityType?: EquityType;
  status?: InvestmentStatus;
  notes?: string;
  sourceUrl?: string;
}

/**
 * Única fuente de verdad para convertir `initialData` (la inversión real,
 * tal y como llega del padre) en valores de formulario — usada al montar, en
 * CADA apertura del diálogo y al cerrarlo. Antes había dos copias de este
 * mapeo (defaultValues al montar y el reset al cerrar) y la segunda omitía
 * incomeModel/paymentFrequency/principalReturnType/equityType: al reabrir el
 * formulario para la MISMA inversión sin haber recargado la página, esos 4
 * campos quedaban en `undefined` en vez de reflejar el dato real — y como el
 * formulario envía siempre el objeto completo (no solo lo tocado), guardar
 * cualquier otro cambio podía sobrescribirlos en la BD con un valor obsoleto.
 */
function buildEditFormValues(initialData: Investment | FutureInvestmentFormData): EditFormValues {
  return {
    platform: initialData.platform,
    customPlatformName: initialData.customPlatformName,
    projectName: initialData.projectName,
    amount: initialData.amount || undefined,
    investmentDate: initialData.investmentDate
      ? (initialData.investmentDate instanceof Date ? initialData.investmentDate : new Date(initialData.investmentDate))
      : undefined,
    expectedEndDate: initialData.expectedEndDate
      ? (initialData.expectedEndDate instanceof Date ? initialData.expectedEndDate : new Date(initialData.expectedEndDate))
      : undefined,
    expectedReturn: initialData.expectedReturn || undefined,
    incomeModel: 'incomeModel' in initialData ? initialData.incomeModel || undefined : undefined,
    paymentFrequency: 'paymentFrequency' in initialData ? initialData.paymentFrequency || undefined : undefined,
    firstPaymentDate: 'firstPaymentDate' in initialData && initialData.firstPaymentDate
      ? new Date(initialData.firstPaymentDate)
      : undefined,
    principalReturnType: 'principalReturnType' in initialData ? initialData.principalReturnType || undefined : undefined,
    equityType: 'equityType' in initialData ? (initialData as Investment).equityType : undefined,
    status: 'status' in initialData ? initialData.status : undefined,
    notes: initialData.notes,
    sourceUrl: 'sourceUrl' in initialData ? initialData.sourceUrl : undefined,
  };
}

export type InvestmentFormMode = 'real' | 'future';

interface InvestmentFormProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSubmit: (data: any) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSubmitDraft?: (data: any) => void;
  initialData?: Investment | FutureInvestmentFormData;
  isDraft?: boolean;
  trigger?: React.ReactNode;
  investmentCount?: number;
  isPro?: boolean;
  onProRequired?: () => void;
  mode?: InvestmentFormMode;
  defaultOpen?: boolean;
}

export function InvestmentForm({
  onSubmit,
  onSubmitDraft,
  initialData,
  isDraft = false,
  trigger,
  investmentCount = 0,
  isPro = true,
  onProRequired,
  mode = 'real',
  defaultOpen = false,
}: InvestmentFormProps) {
  const isFuture = mode === 'future';
  const [open, setOpen] = useState(defaultOpen);

  // Draft persistence — only for new real investments (not edit, not future)
  const { user } = useAuth();
  const { t } = useLanguage();
  const draft = useInvestmentDraft(!initialData && !isFuture ? user?.id : undefined);

  const [draftExists, setDraftExists] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const draftLoadedRef = useRef(false);

  const freeLimit = isFuture ? PLAN_FEATURES.free.futureInvestments : PLAN_FEATURES.free.investments;
  const canAddInvestment = isPro || investmentCount < freeLimit || !!initialData;

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && !canAddInvestment) {
      onProRequired?.();
      return;
    }
    setOpen(newOpen);
  };

  const schema = isFuture ? futureInvestmentSchema : draftInvestmentSchema;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const form = useForm<any>({
    resolver: zodResolver(schema),
    defaultValues: initialData
      ? buildEditFormValues(initialData)
      : isFuture
        ? {}
        : {
            status: 'active',
            investmentDate: new Date(),
            
          },
  });

  const [validationError, setValidationError] = useState<string[] | null>(null);
  const [blockingModal, setBlockingModal] = useState<string[] | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const watchPlatform = form.watch('platform');
  const watchIncomeModel = form.watch('incomeModel') as IncomeModel | undefined;
  const watchEquityType = form.watch('equityType') as EquityType | undefined;
  const watchStatus = form.watch('status') as InvestmentStatus | undefined;
  const endDateRequired = !!watchIncomeModel &&
    (END_DATE_REQUIRED_MODELS as readonly string[]).includes(watchIncomeModel);
  // El modelo de ingresos condiciona por completo cómo assessDefaultLoss
  // califica la pérdida (equity nunca se evalúa, el resto sí) — cambiarlo en
  // una inversión ya en impago dejaría huérfano el cuestionario fiscal ya
  // respondido (loss_*) sin ningún aviso. Bloqueado igual que 'status'.
  const incomeModelLockedByDefault = watchStatus === 'defaulted';

  // B2 — Clear incompatible fields when incomeModel changes to bullet or variable_or_unknown
  const incomeModelMountRef = useRef(true);
  useEffect(() => {
    // Skip the initial mount to avoid clearing fields on edit of existing bullet/variable investments
    if (incomeModelMountRef.current) {
      incomeModelMountRef.current = false;
      return;
    }
    if (watchIncomeModel === 'bullet' || watchIncomeModel === 'variable_or_unknown' || watchIncomeModel === 'equity') {
      form.setValue('paymentFrequency', undefined);
      form.setValue('principalReturnType', undefined);
      form.setValue('firstPaymentDate', undefined);
    }
    if (watchIncomeModel !== 'equity') {
      form.setValue('equityType', undefined);
    }
  }, [watchIncomeModel, form]);

  // Clear validation error when form changes
  useEffect(() => {
    if (!validationError) return;
    const { unsubscribe } = form.watch(() => setValidationError(null));
    return () => unsubscribe();
  }, [validationError, form]);

  // Auto-save draft via form.watch(callback) subscription.
  // Only active for new real investments.
  useEffect(() => {
    if (isFuture || !!initialData) return;

    const { unsubscribe } = form.watch((values) => {
      const date = values.investmentDate instanceof Date ? values.investmentDate : null;
      if (!date) return;

      const end = values.expectedEndDate instanceof Date
        ? values.expectedEndDate
        : undefined;

      draft.save({
        platform:           (values.platform as string) || undefined,
        customPlatformName: values.customPlatformName,
        projectName:        values.projectName,
        amount:             values.amount,
        expectedReturn:     values.expectedReturn,
        status:             (values.status as string) || 'draft',
        notes:              values.notes,
        investmentDate:     date.toISOString(),
        expectedEndDate:    end?.toISOString(),
        incomeModel:        values.incomeModel as string | undefined,
        paymentFrequency:   values.paymentFrequency as string | undefined,
        firstPaymentDate:   values.firstPaymentDate instanceof Date ? values.firstPaymentDate.toISOString() : undefined,
        principalReturnType: values.principalReturnType as string | undefined,
        equityType:         values.equityType as string | undefined,
      });
    });

    return () => unsubscribe();
    // draft.save is stable; initialData is the real dep
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData]);

  // One-shot draft restore (new real investments only).
  useEffect(() => {
    if (isFuture || !!initialData || draftLoadedRef.current) return;
    draftLoadedRef.current = true;

    const saved = draft.load();
    if (!saved) return;

    form.reset({
      platform:           saved.formValues.platform as Platform,
      customPlatformName: saved.formValues.customPlatformName,
      projectName:        saved.formValues.projectName ?? '',
      amount:             saved.formValues.amount ?? undefined,
      expectedReturn:     saved.formValues.expectedReturn ?? undefined,
      status:             saved.formValues.status as InvestmentStatus,
      notes:              saved.formValues.notes,
      investmentDate:     new Date(saved.formValues.investmentDate),
      expectedEndDate:    saved.formValues.expectedEndDate
        ? new Date(saved.formValues.expectedEndDate)
        : undefined,
      incomeModel:        (saved.formValues.incomeModel as IncomeModel) || undefined,
      paymentFrequency:   (saved.formValues.paymentFrequency as PaymentFrequency) ?? undefined,
      firstPaymentDate:   saved.formValues.firstPaymentDate
        ? new Date(saved.formValues.firstPaymentDate)
        : undefined,
      principalReturnType: (saved.formValues.principalReturnType as PrincipalReturnType) ?? undefined,
    });

    setDraftExists(true);
    setDraftRestored(true);
    // draft.load is stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData]);

  // Full reset from the CURRENT initialData on every open — not just at
  // mount. useForm's defaultValues are only read once at mount, so without
  // this, reopening the SAME investment (or a different one, if this
  // component instance stayed mounted) could show stale values left over
  // from a previous open/close cycle. Only for edit forms (initialData set);
  // new-investment/future-investment drafts have their own restore effect.
  useEffect(() => {
    if (open && initialData) {
      form.reset(buildEditFormValues(initialData));
    }
    // form.reset is stable; buildEditFormValues is a pure top-level function
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialData]);

  // Reset state when dialog closes.
  // For new investments we intentionally skip form.reset() so the draft survives close/reopen.
  useEffect(() => {
    if (!open) {
      if (initialData) {
        form.reset(buildEditFormValues(initialData));
      }
      // new investment: intentionally NO form.reset() — draft survives close/reopen
      // Reset the incomeModel mount guard so it's ready for the next open
      incomeModelMountRef.current = true;
    }
  }, [open, initialData, form]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleSubmit = (data: any) => {
    if (isFuture) {
      onSubmit({
        platform: data.platform,
        customPlatformName: data.customPlatformName,
        projectName: data.projectName,
        amount: data.amount || null,
        expectedReturn: data.expectedReturn || null,
        investmentDate: data.investmentDate ? toDateOnlyString(data.investmentDate) : undefined,
        expectedEndDate: data.expectedEndDate ? toDateOnlyString(data.expectedEndDate) : undefined,
        sourceUrl: data.sourceUrl,
        notes: data.notes,
      });
    } else {
      // Manual validation for complete investment
      const manualResult = investmentSchema.safeParse(data);
      if (!manualResult.success) {
        // Set inline field error for expectedEndDate so it shows below the field
        for (const issue of manualResult.error.issues) {
          if (String(issue.path[0]) === 'expectedEndDate') {
            form.setError('expectedEndDate', { type: 'manual', message: issue.message });
          }
        }
        const fieldMap: Record<string, string> = {
          platform: 'investments.field.platform',
          projectName: 'investments.field.projectName',
          amount: 'investments.field.amount',
          investmentDate: 'investments.field.investmentDate',
          expectedEndDate: 'investments.field.expectedEndDate',
          expectedReturn: 'investments.field.expectedReturn',
          incomeModel: 'investments.field.incomeModel',
          status: 'investments.field.status',
        };
        const missing = [...new Set(manualResult.error.issues.map(i => {
          const key = String(i.path[0]);
          return fieldMap[key] || key;
        }))];
        setValidationError(missing);
        setBlockingModal(missing);
        return;
      }

      // Completeness check via centralized logic (handles schedule requirement for periodic/amortizing)
      const model = data.incomeModel as string | undefined;
      let hasSchedule = true; // default true for bullet/variable_or_unknown
      if (model === 'periodic_fixed' || model === 'amortizing') {
        const dryRunEntries = generateSchedule({
          id: 'dry-run',
          amount: data.amount,
          expectedReturn: data.expectedReturn,
          incomeModel: model as IncomeModel,
          paymentFrequency: data.paymentFrequency,
          principalReturnType: data.principalReturnType,
          investmentDate: data.investmentDate instanceof Date ? toDateOnlyString(data.investmentDate) : data.investmentDate,
          expectedEndDate: data.expectedEndDate instanceof Date ? toDateOnlyString(data.expectedEndDate) : (data.expectedEndDate || ''),
          firstPaymentDate: data.firstPaymentDate instanceof Date ? toDateOnlyString(data.firstPaymentDate) : (data.firstPaymentDate || undefined),
        });
        hasSchedule = dryRunEntries.length > 0;
      }

      const completionCheck = getInvestmentCompletionStatus({
        platform: data.platform,
        projectName: data.projectName,
        amount: data.amount,
        investmentDate: data.investmentDate instanceof Date ? toDateOnlyString(data.investmentDate) : data.investmentDate,
        expectedReturn: data.expectedReturn,
        expectedEndDate: data.expectedEndDate instanceof Date ? toDateOnlyString(data.expectedEndDate) : data.expectedEndDate,
        incomeModel: data.incomeModel,
        paymentFrequency: data.paymentFrequency,
        hasSchedule,
        status: isDraft ? 'active' : data.status,
      });

      if (!completionCheck.isTrackingReady) {
        setValidationError(completionCheck.missingFields);
        setBlockingModal(completionCheck.missingFields);
        return;
      }

      setValidationError(null);

      // When completing a draft, force status to active
      const finalStatus = isDraft ? 'active' : data.status;

      onSubmit({
        platform: data.platform,
        customPlatformName: data.customPlatformName,
        projectName: data.projectName,
        amount: data.amount,
        expectedReturn: data.expectedReturn,
        incomeModel: data.incomeModel,
        paymentFrequency: data.paymentFrequency || null,
        firstPaymentDate: data.firstPaymentDate ? toDateOnlyString(data.firstPaymentDate) : null,
        principalReturnType: data.principalReturnType || null,
        equityType: (data as any).equityType || null,
        status: finalStatus,
        notes: data.notes,
        sourceUrl: data.sourceUrl || undefined,
        investmentDate: toDateOnlyString(data.investmentDate),
        expectedEndDate: data.expectedEndDate ? toDateOnlyString(data.expectedEndDate) : undefined,
      });
    }

    // Clear draft after successful submission (only for real mode)
    if (!isFuture) {
      draft.clear();
      setDraftExists(false);
      setDraftRestored(false);
      draftLoadedRef.current = false;
    }

    setOpen(false);
    form.reset();
  };

  const handleSaveDraft = () => {
    const values = form.getValues();
    // Validate with draft schema (only projectName required)
    const result = draftInvestmentSchema.safeParse(values);
    if (!result.success) {
      // Show validation errors
      form.trigger();
      return;
    }
    if (onSubmitDraft) {
      onSubmitDraft({
        platform: values.platform || null,
        customPlatformName: values.customPlatformName,
        projectName: values.projectName,
        amount: values.amount ?? null,
        expectedReturn: values.expectedReturn ?? null,
        incomeModel: values.incomeModel || null,
        paymentFrequency: values.paymentFrequency || null,
        firstPaymentDate: values.firstPaymentDate ? toDateOnlyString(values.firstPaymentDate) : null,
        principalReturnType: values.principalReturnType || null,
        equityType: values.equityType || null,
        status: 'draft',
        notes: values.notes,
        investmentDate: values.investmentDate ? toDateOnlyString(values.investmentDate) : null,
        expectedEndDate: values.expectedEndDate ? toDateOnlyString(values.expectedEndDate) : null,
      });
      draft.clear();
      setDraftExists(false);
      setDraftRestored(false);
      draftLoadedRef.current = false;
      setOpen(false);
      form.reset();
    }
  };

  // Compute completeness status for the current initialData (for banners)
  const completionStatus = initialData && isDraft ? getInvestmentCompletionStatus({
    platform: initialData.platform,
    projectName: initialData.projectName,
    amount: initialData.amount,
    investmentDate: initialData.investmentDate
      ? (initialData.investmentDate instanceof Date ? toDateOnlyString(initialData.investmentDate) : initialData.investmentDate as string)
      : null,
    expectedReturn: initialData.expectedReturn,
    expectedEndDate: initialData.expectedEndDate
      ? (initialData.expectedEndDate instanceof Date ? toDateOnlyString(initialData.expectedEndDate) : initialData.expectedEndDate as string)
      : null,
    incomeModel: 'incomeModel' in initialData ? (initialData as Investment).incomeModel : null,
    status: 'status' in initialData ? (initialData as Investment).status : null,
  }) : null;

  const showDraftButtons = !isFuture && (isDraft || onSubmitDraft);

  const handleDiscardDraft = () => {
    draft.clear();
    setDraftExists(false);
    setDraftRestored(false);
    draftLoadedRef.current = false;
    form.reset({
      status: 'active',
      investmentDate: new Date(),
    });
  };

  // ─── B1: Render helpers ────────────────────────────────────────

  const renderBanners = () => (
    <>
      {/* Draft restored banner */}
      {draftExists && draftRestored && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border text-sm">
          <span className="text-muted-foreground">
            {t('investments.form.draft.restored')}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive h-auto py-1 px-2"
            onClick={handleDiscardDraft}
          >
            {t('investments.form.draft.discard')}
          </Button>
        </div>
      )}

      {/* Incomplete investment banner */}
      {isDraft && completionStatus && !completionStatus.isComplete && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border text-sm">
          <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-muted-foreground">{t('investments.incomplete.banner')}</p>
            <p className="text-muted-foreground mt-1">
              {t('investments.incomplete.missing')}: {completionStatus.missingFields.map(f => t(f)).join(', ')}
            </p>
          </div>
        </div>
      )}

      {/* Forecast warning: portfolio_ready but not forecast_ready */}
      {isDraft && completionStatus && completionStatus.isComplete && !completionStatus.isForecastReady && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border text-sm">
          <AlertTriangle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-muted-foreground">{t('investments.incomplete.forecastWarning')}</p>
        </div>
      )}

      {/* Validation error block — shown when "Guardar inversión" fails */}
      {validationError && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-sm">
          <Info className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p className="font-medium text-destructive">{t('investments.validation.cannotComplete')}</p>
            <p className="text-muted-foreground">{t('investments.validation.suggestDraft')}</p>
            <p className="text-muted-foreground">
              {t('investments.validation.missingFields')} {validationError.map(f => t(f)).join(', ')}
            </p>
          </div>
        </div>
      )}
    </>
  );

  const renderCommonFields = () => (
    <>
      <FormField
        control={form.control}
        name="platform"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Plataforma</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una plataforma" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {PLATFORMS.map((platform) => (
                  <SelectItem key={platform.value} value={platform.value}>
                    {platform.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {watchPlatform === 'other' && (
        <FormField
          control={form.control}
          name="customPlatformName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre de la Plataforma</FormLabel>
              <FormControl>
                <Input placeholder="Nombre de la plataforma" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      <FormField
        control={form.control}
        name="projectName"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Nombre del Proyecto</FormLabel>
            <FormControl>
              <Input placeholder="Ej: Promoción Residencial Madrid" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );

  const renderIncomeModelFields = () => (
    <>
      {/* Income Model selectors — only for real investments */}
      {!isFuture && (
        <>
          <FormField
            control={form.control}
            name="incomeModel"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('investments.field.incomeModel')}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={incomeModelLockedByDefault}>
                  <FormControl>
                    <SelectTrigger aria-label={t('investments.field.incomeModel')}>
                      <SelectValue placeholder={t('investments.incomeModel.placeholder')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {INCOME_MODEL_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {t(opt.labelKey)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {incomeModelLockedByDefault && (
                  <p className="text-xs text-muted-foreground">{t('investments.incomeModel.lockedDefaulted')}</p>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          {(watchIncomeModel === 'periodic_fixed' || watchIncomeModel === 'amortizing') && (
            <FormField
              control={form.control}
              name="paymentFrequency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('investments.field.paymentFrequency')}</FormLabel>
                  <Select onValueChange={(v) => field.onChange(v === '__none__' ? undefined : v)} value={field.value || ''}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('investments.frequency.placeholder')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__none__">{t('common.noSelection')}</SelectItem>
                      {PAYMENT_FREQUENCY_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {t(opt.labelKey)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {(watchIncomeModel === 'periodic_fixed' || watchIncomeModel === 'amortizing') && (
            <FormField
              control={form.control}
              name="firstPaymentDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>
                    {t('investments.field.firstPaymentDate')}
                    <span className="text-muted-foreground text-xs font-normal ml-1">({t('common.optional')})</span>
                  </FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "dd/MM/yyyy")
                          ) : (
                            <span>{t('common.optional')}</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <p className="text-xs text-muted-foreground">{t('investments.field.firstPaymentDate.help')}</p>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {watchIncomeModel === 'amortizing' && (
            <FormField
              control={form.control}
              name="principalReturnType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('investments.field.principalReturnType')}</FormLabel>
                  <Select onValueChange={(v) => field.onChange(v === '__none__' ? undefined : v)} value={field.value || ''}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('common.noSelection')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__none__">{t('common.noSelection')}</SelectItem>
                      {PRINCIPAL_RETURN_TYPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {t(opt.labelKey)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {watchIncomeModel === 'equity' && (
            <FormField
              control={form.control}
              name="equityType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('investments.field.equityType')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ''} disabled={incomeModelLockedByDefault}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('common.noSelection')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {EQUITY_TYPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {t(opt.labelKey)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {watchEquityType && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {t(EQUITY_TYPE_OPTIONS.find(o => o.value === watchEquityType)?.hintKey ?? '')}
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {isFuture ? t('future.form.estimatedAmount') : 'Monto (€)'}
              </FormLabel>
              <FormControl>
                <NumericTextInput
                  placeholder={isFuture ? '' : '1000'}
                  value={field.value}
                  onChange={field.onChange}
                  suffix={isFuture ? undefined : '€'}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="expectedReturn"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {isFuture
                  ? t('future.form.estimatedReturn')
                  : watchIncomeModel === 'variable_or_unknown'
                    ? t('investments.field.expectedReturnVariable')
                    : 'Rentabilidad Anual (%)'}
              </FormLabel>
              <FormControl>
                <NumericTextInput
                  placeholder={
                    isFuture ? '' :
                    watchIncomeModel === 'variable_or_unknown' ? t('common.optional') : '10'
                  }
                  value={field.value}
                  onChange={field.onChange}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {!isFuture && watchIncomeModel === 'variable_or_unknown' && (
          <div className="flex items-start gap-2 rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground -mt-2">
            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>{t('investments.form.variableReturnNote')}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="investmentDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>
                {isFuture ? t('future.form.openDate') : 'Fecha de Inversión'}
              </FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? (
                        format(field.value, "dd/MM/yyyy")
                      ) : (
                        <span>Seleccionar</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="expectedEndDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>
                Fecha de Vencimiento
                {endDateRequired ? (
                  <span className="text-destructive ml-1">*</span>
                ) : (
                  <span className="text-muted-foreground text-xs font-normal ml-1">(Opcional)</span>
                )}
              </FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? (
                        format(field.value, "dd/MM/yyyy")
                      ) : (
                        <span>{endDateRequired ? 'Selecciona una fecha' : 'Opcional'}</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </>
  );

  const renderActions = () => (
    <>
      {!isFuture && (
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Estado</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value}
                disabled={field.value === 'defaulted'}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un estado" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {(field.value === 'defaulted' ? STATUS_OPTIONS : EDITABLE_STATUS_OPTIONS).map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {field.value === 'defaulted' && (
                <p className="text-xs text-muted-foreground">
                  El estado de impago se gestiona desde el cuestionario de calificación fiscal, no desde aquí.
                </p>
              )}
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      <FormField
        control={form.control}
        name="sourceUrl"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              URL de la inversión
              <span className="text-muted-foreground text-xs font-normal ml-1">(Opcional)</span>
            </FormLabel>
            <FormControl>
              <Input type="url" placeholder="https://..." {...field} value={field.value ?? ''} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="notes"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Notas</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Notas adicionales..."
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="sticky bottom-0 bg-background pt-4 pb-2 border-t mt-4 -mx-1 px-1 flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
          {t('common.cancel')}
        </Button>
        {showDraftButtons && (
          <Button type="button" variant="outline" onClick={handleSaveDraft}>
            {t('investments.form.saveDraft')}
          </Button>
        )}
        <Button type="submit">
          {isFuture
            ? t('future.form.save')
            : isDraft ? t('investments.incomplete.cta') : (initialData ? t('investments.form.save.edit') : t('investments.form.save.new'))}
        </Button>
      </div>
    </>
  );

  // ─── Main render ───────────────────────────────────────────────

  const renderForm = () => (
    <Form {...form}>
      <form ref={formRef} onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        {renderBanners()}
        {renderCommonFields()}
        {renderIncomeModelFields()}
        {renderActions()}
      </form>
    </Form>
  );

  const handleBlockingContinueEditing = () => {
    setBlockingModal(null);
    // Scroll to validation banner at the top of the form
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleBlockingAsDraft = () => {
    // Reads fresh form.getValues() inside handleSaveDraft — no stale snapshot
    setBlockingModal(null);
    handleSaveDraft();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          {trigger || (
            <Button onClick={(e) => {
              if (!canAddInvestment) {
                e.preventDefault();
                onProRequired?.();
              }
            }}>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Inversión
              {!isPro && investmentCount >= 3 && (
                <span className="ml-1 text-xs opacity-70">(Pro)</span>
              )}
            </Button>
          )}
        </DialogTrigger>
        <DialogContent
          className="max-h-[90vh] overflow-y-auto sm:max-w-[500px]"
          onFocusOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>
              {isFuture
                ? t('future.form.title')
                : initialData ? t('investments.form.title.edit') : t('investments.form.title.new')}
            </DialogTitle>
          </DialogHeader>
          
          {showDraftButtons && (
            <p className="text-sm text-muted-foreground px-1 -mt-1 mb-2">
              {t('investments.form.draftHint')}
            </p>
          )}

          {renderForm()}
        </DialogContent>
      </Dialog>

      {/* Blocking modal when saving incomplete investment */}
      <AlertDialog open={!!blockingModal} onOpenChange={(o) => { if (!o) setBlockingModal(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('investments.blocking.title')}</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>{t('investments.blocking.description')}</p>
              <div className="mt-2">
                <p className="font-medium text-foreground text-sm mb-1">{t('investments.blocking.missingLabel')}</p>
                <ul className="list-disc list-inside text-sm space-y-0.5">
                  {blockingModal?.map((field) => (
                    <li key={field}>{t(field)}</li>
                  ))}
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleBlockingContinueEditing}>
              {t('investments.blocking.continueEditing')}
            </AlertDialogCancel>
            {onSubmitDraft && (
              <AlertDialogAction onClick={handleBlockingAsDraft}>
                {t('investments.blocking.saveAsPending')}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
