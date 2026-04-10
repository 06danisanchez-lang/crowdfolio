import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, Plus, AlertTriangle, Info } from 'lucide-react';
import { Investment, Platform, InvestmentStatus, PLATFORMS, STATUS_OPTIONS, INCOME_MODEL_OPTIONS, PAYMENT_FREQUENCY_OPTIONS, PRINCIPAL_RETURN_TYPE_OPTIONS, IncomeModel } from '@/types/investment';
import { getInvestmentCompletionStatus } from '@/lib/investment/completeness';

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

const investmentSchema = z.object({
  platform: z.enum(['urbanitae', 'housers', 'estateguru', 'crowdcube', 'brickstarter', 'wecity', 'other'] as const),
  customPlatformName: z.string().optional(),
  projectName: z.string().min(1, 'El nombre del proyecto es requerido'),
  amount: z.number().min(1, 'El monto debe ser mayor a 0'),
  investmentDate: z.date(),
  expectedEndDate: z.date().optional(),
  expectedReturn: z.number().min(0, 'El rendimiento debe ser mayor o igual a 0'),
  incomeModel: z.enum(['bullet', 'periodic_fixed', 'amortizing', 'variable_or_unknown'] as const),
  paymentFrequency: z.enum(['monthly', 'quarterly', 'semiannual', 'annual'] as const).optional(),
  principalReturnType: z.enum(['at_maturity', 'amortizing', 'unknown'] as const).optional(),
  status: z.enum(['active', 'pending', 'completed', 'defaulted', 'draft'] as const),
  notes: z.string().optional(),
  sourceUrl: z.string().optional(),
});

const draftInvestmentSchema = z.object({
  platform: z.enum(['urbanitae', 'housers', 'estateguru', 'crowdcube', 'brickstarter', 'wecity', 'other'] as const).optional(),
  customPlatformName: z.string().optional(),
  projectName: z.string().min(1, 'El nombre del proyecto es requerido'),
  amount: z.number().nullable().optional(),
  investmentDate: z.date().optional(),
  expectedEndDate: z.date().optional(),
  expectedReturn: z.number().nullable().optional(),
  incomeModel: z.enum(['bullet', 'periodic_fixed', 'amortizing', 'variable_or_unknown'] as const).optional(),
  paymentFrequency: z.enum(['monthly', 'quarterly', 'semiannual', 'annual'] as const).optional(),
  principalReturnType: z.enum(['at_maturity', 'amortizing', 'unknown'] as const).optional(),
  status: z.enum(['active', 'pending', 'completed', 'defaulted', 'draft'] as const).optional(),
  notes: z.string().optional(),
  sourceUrl: z.string().optional(),
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

export type InvestmentFormMode = 'real' | 'future';

interface InvestmentFormProps {
  onSubmit: (data: any) => void;
  onSubmitDraft?: (data: any) => void;
  initialData?: Investment | FutureInvestmentFormData;
  isDraft?: boolean;
  trigger?: React.ReactNode;
  investmentCount?: number;
  isPro?: boolean;
  onProRequired?: () => void;
  mode?: InvestmentFormMode;
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
  mode = 'real'
}: InvestmentFormProps) {
  const isFuture = mode === 'future';
  const [open, setOpen] = useState(false);

  // Draft persistence — only for new real investments (not edit, not future)
  const { user } = useAuth();
  const { t } = useLanguage();
  const draft = useInvestmentDraft(!initialData && !isFuture ? user?.id : undefined);

  const [draftExists, setDraftExists] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const draftLoadedRef = useRef(false);

  const canAddInvestment = isPro || investmentCount < 3 || !!initialData;

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && !canAddInvestment) {
      onProRequired?.();
      return;
    }
    setOpen(newOpen);
  };

  const schema = isFuture ? futureInvestmentSchema : draftInvestmentSchema;

  const form = useForm<any>({
    resolver: zodResolver(schema),
    defaultValues: initialData
      ? {
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
          paymentFrequency: 'paymentFrequency' in initialData ? initialData.paymentFrequency : undefined,
          principalReturnType: 'principalReturnType' in initialData ? initialData.principalReturnType : undefined,
          status: 'status' in initialData ? initialData.status : undefined,
          notes: initialData.notes,
          sourceUrl: 'sourceUrl' in initialData ? initialData.sourceUrl : undefined,
        }
      : isFuture
        ? {}
        : {
            status: 'active',
            investmentDate: new Date(),
            
          },
  });

  const [validationError, setValidationError] = useState<string[] | null>(null);
  const watchPlatform = form.watch('platform');
  const watchIncomeModel = form.watch('incomeModel') as IncomeModel | undefined;

  // B2 — Clear incompatible fields when incomeModel changes to bullet or variable_or_unknown
  const incomeModelMountRef = useRef(true);
  useEffect(() => {
    // Skip the initial mount to avoid clearing fields on edit of existing bullet/variable investments
    if (incomeModelMountRef.current) {
      incomeModelMountRef.current = false;
      return;
    }
    if (watchIncomeModel === 'bullet' || watchIncomeModel === 'variable_or_unknown') {
      form.setValue('paymentFrequency', undefined);
      form.setValue('principalReturnType', undefined);
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
        platform:           (values.platform as string) ?? 'urbanitae',
        customPlatformName: values.customPlatformName,
        projectName:        values.projectName,
        amount:             values.amount,
        expectedReturn:     values.expectedReturn,
        status:             (values.status as string) ?? 'active',
        notes:              values.notes,
        investmentDate:     date.toISOString(),
        expectedEndDate:    end?.toISOString(),
        incomeModel:        values.incomeModel as string | undefined,
        paymentFrequency:   values.paymentFrequency as string | undefined,
        principalReturnType: values.principalReturnType as string | undefined,
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
      incomeModel:        (saved.formValues.incomeModel as any) || undefined,
      paymentFrequency:   (saved.formValues.paymentFrequency as any) ?? undefined,
      principalReturnType: (saved.formValues.principalReturnType as any) ?? undefined,
    });

    setDraftExists(true);
    setDraftRestored(true);
    // draft.load is stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData]);

  // Reset state when dialog closes.
  // For new investments we intentionally skip form.reset() so the draft survives close/reopen.
  useEffect(() => {
    if (!open) {
      if (initialData) {
        form.reset({
          platform: initialData.platform,
          customPlatformName: initialData.customPlatformName,
          projectName: initialData.projectName,
          amount: initialData.amount,
          investmentDate: initialData.investmentDate
            ? (initialData.investmentDate instanceof Date ? initialData.investmentDate : new Date(initialData.investmentDate))
            : undefined,
          expectedEndDate: initialData.expectedEndDate
            ? (initialData.expectedEndDate instanceof Date ? initialData.expectedEndDate : new Date(initialData.expectedEndDate))
            : undefined,
          expectedReturn: initialData.expectedReturn,
          status: 'status' in initialData ? initialData.status : undefined,
          notes: initialData.notes,
          sourceUrl: 'sourceUrl' in initialData ? initialData.sourceUrl : undefined,
        });
      }
      // new investment: intentionally NO form.reset() — draft survives close/reopen
      // Reset the incomeModel mount guard so it's ready for the next open
      incomeModelMountRef.current = true;
    }
  }, [open, initialData, form]);

  const handleSubmit = (data: any) => {
    if (isFuture) {
      onSubmit({
        platform: data.platform,
        customPlatformName: data.customPlatformName,
        projectName: data.projectName,
        amount: data.amount || null,
        expectedReturn: data.expectedReturn || null,
        investmentDate: data.investmentDate?.toISOString(),
        expectedEndDate: data.expectedEndDate?.toISOString(),
        sourceUrl: data.sourceUrl,
        notes: data.notes,
      });
    } else {
      // Manual validation for complete investment
      const manualResult = investmentSchema.safeParse(data);
      if (!manualResult.success) {
        const fieldMap: Record<string, string> = {
          platform: 'investments.field.platform',
          projectName: 'investments.field.projectName',
          amount: 'investments.field.amount',
          investmentDate: 'investments.field.investmentDate',
          expectedReturn: 'investments.field.expectedReturn',
          incomeModel: 'investments.field.incomeModel',
          status: 'investments.field.status',
        };
        const missing = [...new Set(manualResult.error.issues.map(i => {
          const key = String(i.path[0]);
          return fieldMap[key] || key;
        }))];
        setValidationError(missing);
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
        principalReturnType: data.principalReturnType || null,
        status: finalStatus,
        notes: data.notes,
        investmentDate: data.investmentDate.toISOString(),
        expectedEndDate: data.expectedEndDate?.toISOString(),
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
        principalReturnType: values.principalReturnType || null,
        status: 'draft',
        notes: values.notes,
        investmentDate: values.investmentDate?.toISOString() || null,
        expectedEndDate: values.expectedEndDate?.toISOString() || null,
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
      ? (initialData.investmentDate instanceof Date ? initialData.investmentDate.toISOString() : initialData.investmentDate as string)
      : null,
    expectedReturn: initialData.expectedReturn,
    incomeModel: 'incomeModel' in initialData ? (initialData as any).incomeModel : null,
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
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
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
        </>
      )}

      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {isFuture ? t('future.form.estimatedAmount') : 'Monto (€)'}
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder={isFuture ? '' : '1000'}
                  value={field.value != null ? field.value : ''}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === '') {
                      field.onChange(isFuture ? null : undefined);
                    } else {
                      const parsed = parseFloat(raw);
                      field.onChange(isNaN(parsed) ? undefined : parsed);
                    }
                  }}
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
                {isFuture ? t('future.form.estimatedReturn') : 'Rentabilidad Anual (%)'}
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.1"
                  placeholder={isFuture ? '' : '10'}
                  value={field.value != null ? field.value : ''}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === '') {
                      field.onChange(isFuture ? null : undefined);
                    } else {
                      const parsed = parseFloat(raw);
                      field.onChange(isNaN(parsed) ? undefined : parsed);
                    }
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
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
              <FormLabel>Fecha de Vencimiento</FormLabel>
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
                        <span>Opcional</span>
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
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un estado" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {STATUS_OPTIONS.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {isFuture && (
        <FormField
          control={form.control}
          name="sourceUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('future.form.sourceUrl')}</FormLabel>
              <FormControl>
                <Input type="url" placeholder="https://..." {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

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
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        {renderBanners()}
        {renderCommonFields()}
        {renderIncomeModelFields()}
        {renderActions()}
      </form>
    </Form>
  );

  return (
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
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[500px]">
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
  );
}
