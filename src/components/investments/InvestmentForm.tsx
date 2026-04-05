import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, Plus, FileUp, PenLine, Sparkles, AlertTriangle } from 'lucide-react';
import { Investment, Platform, InvestmentStatus, PLATFORMS, STATUS_OPTIONS } from '@/types/investment';
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
import { ImageUploader } from './ImageUploader';
import { useInvestmentExtraction, ExtractedInvestmentData, FileType } from '@/hooks/useInvestmentExtraction';
import { Badge } from '@/components/ui/badge';
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
  status: z.enum(['active', 'pending', 'completed', 'defaulted'] as const),
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

type EntryMode = 'select' | 'image' | 'manual';

export type InvestmentFormMode = 'real' | 'future';

interface InvestmentFormProps {
  onSubmit: (data: any) => void;
  initialData?: Investment;
  trigger?: React.ReactNode;
  investmentCount?: number;
  isPro?: boolean;
  onProRequired?: () => void;
  mode?: InvestmentFormMode;
}

export function InvestmentForm({ 
  onSubmit, 
  initialData, 
  trigger,
  investmentCount = 0,
  isPro = true,
  onProRequired,
  mode = 'real'
}: InvestmentFormProps) {
  const isFuture = mode === 'future';
  const [open, setOpen] = useState(false);
  const [entryMode, setEntryMode] = useState<EntryMode>(initialData || isFuture ? 'manual' : 'select');
  const [extractedFields, setExtractedFields] = useState<Set<string>>(new Set());
  const [highAmountWarning, setHighAmountWarning] = useState<number | null>(null);

  // Draft persistence — only for new real investments (not edit, not future)
  const { user } = useAuth();
  const { t } = useLanguage();
  const draft = useInvestmentDraft(!initialData && !isFuture ? user?.id : undefined);

  const [draftExists, setDraftExists] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const draftLoadedRef = useRef(false);
  
  const { isExtracting, extractFromFile, clearExtractedData } = useInvestmentExtraction();

  const canAddInvestment = isFuture || isPro || investmentCount < 3 || !!initialData;

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && !canAddInvestment) {
      onProRequired?.();
      return;
    }
    setOpen(newOpen);
  };

  const form = useForm<any>({
    resolver: zodResolver(isFuture ? futureInvestmentSchema : investmentSchema),
    defaultValues: initialData
      ? {
          platform: initialData.platform,
          customPlatformName: initialData.customPlatformName,
          projectName: initialData.projectName,
          amount: initialData.amount || undefined,
          investmentDate: initialData.investmentDate ? new Date(initialData.investmentDate) : undefined,
          expectedEndDate: initialData.expectedEndDate ? new Date(initialData.expectedEndDate) : undefined,
          expectedReturn: initialData.expectedReturn || undefined,
          status: initialData.status,
          notes: initialData.notes,
        }
      : isFuture
        ? {
            platform: 'urbanitae',
          }
        : {
            platform: 'urbanitae',
            status: 'active',
            expectedReturn: 10,
            investmentDate: new Date(),
          },
  });

  const watchPlatform = form.watch('platform');

  // Auto-save draft via form.watch(callback) subscription.
  // Only active in manual mode for new investments.
  useEffect(() => {
    if (isFuture || entryMode !== 'manual' || !!initialData) return;

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
      });
    });

    return () => unsubscribe();
    // draft.save is stable; entryMode and initialData are the real deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entryMode, initialData]);

  // One-shot draft restore when entering manual mode (new investments only).
  useEffect(() => {
    if (isFuture || entryMode !== 'manual' || !!initialData || draftLoadedRef.current) return;
    draftLoadedRef.current = true;

    const saved = draft.load();
    if (!saved) return;

    form.reset({
      platform:           saved.formValues.platform as Platform,
      customPlatformName: saved.formValues.customPlatformName,
      projectName:        saved.formValues.projectName ?? '',
      amount:             saved.formValues.amount ?? 0,
      expectedReturn:     saved.formValues.expectedReturn ?? 10,
      status:             saved.formValues.status as InvestmentStatus,
      notes:              saved.formValues.notes,
      investmentDate:     new Date(saved.formValues.investmentDate),
      expectedEndDate:    saved.formValues.expectedEndDate
        ? new Date(saved.formValues.expectedEndDate)
        : undefined,
    });

    setDraftExists(true);
    setDraftRestored(true);
    // draft.load is stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entryMode, initialData]);

  // Reset state when dialog closes.
  // For new investments we intentionally skip form.reset() so the draft survives close/reopen.
  useEffect(() => {
    if (!open) {
      setEntryMode(initialData || isFuture ? 'manual' : 'select');
      setExtractedFields(new Set());
      setHighAmountWarning(null);
      clearExtractedData();
      if (initialData) {
        form.reset({
          platform: initialData.platform,
          customPlatformName: initialData.customPlatformName,
          projectName: initialData.projectName,
          amount: initialData.amount,
          investmentDate: new Date(initialData.investmentDate),
          expectedEndDate: initialData.expectedEndDate ? new Date(initialData.expectedEndDate) : undefined,
          expectedReturn: initialData.expectedReturn,
          status: initialData.status,
          notes: initialData.notes,
        });
      }
      // new investment: intentionally NO form.reset() — draft survives close/reopen
    }
  }, [open, initialData, form, clearExtractedData]);

  const handleFileSelect = async (base64: string, fileType: FileType) => {
    // Mark draft as loaded so restore doesn't overwrite AI-extracted data
    draftLoadedRef.current = true;
    const result = await extractFromFile(base64, fileType);
    
    if (result.success && result.data) {
      applyExtractedData(result.data);
      setEntryMode('manual');
    }
  };

  const applyExtractedData = (data: ExtractedInvestmentData) => {
    const fieldsSet = new Set<string>();

    if (data.platform) {
      form.setValue('platform', data.platform);
      fieldsSet.add('platform');
    }
    if (data.customPlatformName) {
      form.setValue('customPlatformName', data.customPlatformName);
      fieldsSet.add('customPlatformName');
    }
    if (data.projectName) {
      form.setValue('projectName', data.projectName);
      fieldsSet.add('projectName');
    }
    if (data.amount) {
      form.setValue('amount', data.amount);
      fieldsSet.add('amount');
      if (data.amount > 50000) {
        setHighAmountWarning(data.amount);
      }
    }
    if (data.expectedReturn !== undefined) {
      form.setValue('expectedReturn', data.expectedReturn);
      fieldsSet.add('expectedReturn');
    }
    if (data.investmentDate) {
      form.setValue('investmentDate', new Date(data.investmentDate));
      fieldsSet.add('investmentDate');
    }
    if (data.expectedEndDate) {
      form.setValue('expectedEndDate', new Date(data.expectedEndDate));
      fieldsSet.add('expectedEndDate');
    }
    if (data.status) {
      form.setValue('status', data.status);
      fieldsSet.add('status');
    }
    if (data.notes) {
      form.setValue('notes', data.notes);
      fieldsSet.add('notes');
    }

    setExtractedFields(fieldsSet);
  };

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
      onSubmit({
        platform: data.platform,
        customPlatformName: data.customPlatformName,
        projectName: data.projectName,
        amount: data.amount,
        expectedReturn: data.expectedReturn,
        status: data.status,
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

  const handleDiscardDraft = () => {
    draft.clear();
    setDraftExists(false);
    setDraftRestored(false);
    draftLoadedRef.current = false;
    form.reset({
      platform: 'urbanitae',
      status: 'active',
      expectedReturn: 10,
      investmentDate: new Date(),
    });
  };

  const isFieldExtracted = (fieldName: string) => extractedFields.has(fieldName);

  const renderModeSelector = () => (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground text-center">
        ¿Cómo quieres añadir la inversión?
      </p>
      <div className="grid grid-cols-2 gap-3">
        <Button
          type="button"
          variant="outline"
          className="h-auto py-6 flex-col gap-2"
          onClick={() => setEntryMode('image')}
        >
          <FileUp className="h-8 w-8 text-primary" />
          <span className="font-medium">Subir archivo</span>
          <span className="text-xs text-muted-foreground">Pantallazo o PDF</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-auto py-6 flex-col gap-2"
          onClick={() => setEntryMode('manual')}
        >
          <PenLine className="h-8 w-8 text-primary" />
          <span className="font-medium">Manual</span>
          <span className="text-xs text-muted-foreground">Introducir datos a mano</span>
        </Button>
      </div>
    </div>
  );

  const renderImageUpload = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Sparkles className="h-4 w-4 text-primary" />
        <span>Sube un pantallazo o PDF de tu inversión y la IA extraerá los datos automáticamente</span>
      </div>
      <ImageUploader 
        onFileSelect={handleFileSelect}
        isProcessing={isExtracting}
      />
      <Button
        type="button"
        variant="ghost"
        className="w-full"
        onClick={() => setEntryMode('manual')}
        disabled={isExtracting}
      >
        Mejor lo introduzco manualmente
      </Button>
    </div>
  );

  const renderForm = () => (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
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

        {extractedFields.size > 0 && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
            <Sparkles className="h-4 w-4 text-primary shrink-0" />
            <span className="text-sm text-primary">
              Datos extraídos por IA - revisa y confirma
            </span>
          </div>
        )}

        <FormField
          control={form.control}
          name="platform"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                Plataforma
                {isFieldExtracted('platform') && <Badge variant="secondary" className="text-xs">IA</Badge>}
              </FormLabel>
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
                <FormLabel className="flex items-center gap-2">
                  Nombre de la Plataforma
                  {isFieldExtracted('customPlatformName') && <Badge variant="secondary" className="text-xs">IA</Badge>}
                </FormLabel>
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
              <FormLabel className="flex items-center gap-2">
                Nombre del Proyecto
                {isFieldExtracted('projectName') && <Badge variant="secondary" className="text-xs">IA</Badge>}
              </FormLabel>
              <FormControl>
                <Input placeholder="Ej: Promoción Residencial Madrid" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  {isFuture ? t('future.form.estimatedAmount') : 'Monto (€)'}
                  {!isFuture && isFieldExtracted('amount') && <Badge variant="secondary" className="text-xs">IA</Badge>}
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder={isFuture ? '' : '1000'}
                    {...field}
                    onChange={(e) => {
                      const value = e.target.value === '' ? (isFuture ? null : 0) : parseFloat(e.target.value);
                      field.onChange(value);
                      if (!isFuture && highAmountWarning && value !== highAmountWarning) {
                        setHighAmountWarning(null);
                      }
                    }}
                    value={field.value ?? ''}
                  />
                </FormControl>
                {!isFuture && highAmountWarning && (
                  <div className="flex items-start gap-2 p-2 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span className="text-xs">
                      El importe ({highAmountWarning.toLocaleString('es-ES')}€) parece alto. ¿Es tu inversión personal o el total del proyecto?
                    </span>
                  </div>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="expectedReturn"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  Rentabilidad Anual (%)
                  {isFieldExtracted('expectedReturn') && <Badge variant="secondary" className="text-xs">IA</Badge>}
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="10"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
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
                <FormLabel className="flex items-center gap-2">
                  Fecha de Inversión
                  {isFieldExtracted('investmentDate') && <Badge variant="secondary" className="text-xs">IA</Badge>}
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
                <FormLabel className="flex items-center gap-2">
                  Fecha de Vencimiento
                  {isFieldExtracted('expectedEndDate') && <Badge variant="secondary" className="text-xs">IA</Badge>}
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

        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                Estado
                {isFieldExtracted('status') && <Badge variant="secondary" className="text-xs">IA</Badge>}
              </FormLabel>
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

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                Notas
                {isFieldExtracted('notes') && <Badge variant="secondary" className="text-xs">IA</Badge>}
              </FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Notas adicionales sobre la inversión..."
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button type="submit">
            {initialData ? 'Guardar Cambios' : 'Crear Inversión'}
          </Button>
        </div>
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
            {initialData ? 'Editar Inversión' : 'Nueva Inversión'}
          </DialogTitle>
        </DialogHeader>
        
        {entryMode === 'select' && renderModeSelector()}
        {entryMode === 'image' && renderImageUpload()}
        {entryMode === 'manual' && renderForm()}
      </DialogContent>
    </Dialog>
  );
}
