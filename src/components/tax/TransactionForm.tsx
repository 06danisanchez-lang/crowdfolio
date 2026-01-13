import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, Loader2, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { Transaction, TransactionType, TRANSACTION_TYPE_LABELS, Asset, PLATFORM_COUNTRIES } from '@/types/asset';
import { Alert, AlertDescription } from '@/components/ui/alert';

const transactionFormSchema = z.object({
  assetId: z.string().min(1, 'Activo requerido'),
  type: z.enum(['INTEREST', 'DIVIDEND', 'SALE', 'LOSS'] as const),
  date: z.date(),
  grossAmount: z.coerce.number(),
  withholdingAmount: z.coerce.number().min(0).optional(),
  notes: z.string().optional(),
});

type TransactionFormData = z.infer<typeof transactionFormSchema>;

interface TransactionFormProps {
  assets: Asset[];
  onSubmit: (data: Omit<Transaction, 'id' | 'createdAt'>) => Promise<void>;
  initialData?: Transaction;
  preselectedAssetId?: string;
  trigger?: React.ReactNode;
}

export function TransactionForm({ 
  assets, 
  onSubmit, 
  initialData, 
  preselectedAssetId,
  trigger 
}: TransactionFormProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<TransactionFormData>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: {
      assetId: initialData?.assetId || preselectedAssetId || '',
      type: initialData?.type || 'INTEREST',
      date: initialData?.date ? new Date(initialData.date) : new Date(),
      grossAmount: initialData?.grossAmount || 0,
      withholdingAmount: initialData?.withholdingAmount || 0,
      notes: initialData?.notes || '',
    },
  });

  const selectedAssetId = form.watch('assetId');
  const selectedType = form.watch('type');
  const grossAmount = form.watch('grossAmount');
  
  const selectedAsset = assets.find(a => a.id === selectedAssetId);
  const isSpanish = selectedAsset?.countryCode === 'ES';
  const countryData = selectedAsset ? PLATFORM_COUNTRIES.find(c => c.code === selectedAsset.countryCode) : null;

  // Auto-calculate withholding for Spanish platforms
  useEffect(() => {
    if (isSpanish && grossAmount > 0 && (selectedType === 'INTEREST' || selectedType === 'DIVIDEND')) {
      const suggestedWithholding = Math.round(grossAmount * 0.19 * 100) / 100;
      form.setValue('withholdingAmount', suggestedWithholding);
    }
  }, [isSpanish, grossAmount, selectedType, form]);

  const handleSubmit = async (data: TransactionFormData) => {
    setIsSubmitting(true);
    try {
      await onSubmit({
        assetId: data.assetId,
        type: data.type,
        date: format(data.date, 'yyyy-MM-dd'),
        grossAmount: data.type === 'LOSS' ? -Math.abs(data.grossAmount) : Math.abs(data.grossAmount),
        withholdingAmount: data.withholdingAmount || 0,
        currency: 'EUR',
        notes: data.notes || null,
      });
      setOpen(false);
      form.reset();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter types based on asset type
  const getAvailableTypes = (): TransactionType[] => {
    if (!selectedAsset) return ['INTEREST', 'DIVIDEND', 'SALE', 'LOSS'];
    
    if (selectedAsset.assetType === 'LENDING') {
      return ['INTEREST', 'LOSS'];
    } else {
      return ['DIVIDEND', 'SALE', 'LOSS'];
    }
  };

  const availableTypes = getAvailableTypes();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Registrar Cobro
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Editar Transacción' : 'Nueva Transacción'}</DialogTitle>
          <DialogDescription>
            Registra un cobro, venta o pérdida de un activo.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Asset Selection */}
            <FormField
              control={form.control}
              name="assetId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Activo</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un activo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {assets.map((asset) => {
                        const flag = PLATFORM_COUNTRIES.find(c => c.code === asset.countryCode)?.flag || '🌍';
                        return (
                          <SelectItem key={asset.id} value={asset.id}>
                            <span className="flex items-center gap-2">
                              <span>{flag}</span>
                              <span>{asset.platformName} - {asset.projectName}</span>
                            </span>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Transaction Type */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Transacción</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          <div className="flex flex-col">
                            <span>{TRANSACTION_TYPE_LABELS[type].label}</span>
                            <span className="text-xs text-muted-foreground">
                              {TRANSACTION_TYPE_LABELS[type].description}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date */}
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Fecha de Devengo</FormLabel>
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
                            format(field.value, "PPP", { locale: es })
                          ) : (
                            <span>Selecciona fecha</span>
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
                        disabled={(date) => date > new Date()}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    Fecha en que se devengó el cobro (exigibilidad)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Gross Amount */}
            <FormField
              control={form.control}
              name="grossAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {selectedType === 'LOSS' ? 'Importe de Pérdida (€)' : 'Importe Bruto (€)'}
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01" 
                      min="0" 
                      placeholder={selectedType === 'LOSS' ? 'Ej: 500' : 'Ej: 100'}
                      {...field} 
                    />
                  </FormControl>
                  {selectedType === 'LOSS' && (
                    <FormDescription>
                      Introduce el importe perdido (se registrará como negativo)
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Withholding Amount */}
            {selectedType !== 'LOSS' && (
              <FormField
                control={form.control}
                name="withholdingAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Retención Soportada (€)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" {...field} />
                    </FormControl>
                    {countryData && (
                      <FormDescription>
                        {isSpanish ? (
                          <>Retención española: 19% = {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(grossAmount * 0.19)}</>
                        ) : (
                          <>Retención en {countryData.name}: normalmente 0%</>
                        )}
                      </FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Info about withholding */}
            {selectedAsset && !isSpanish && selectedType !== 'LOSS' && (
              <Alert className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
                <Info className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-sm">
                  Los rendimientos de plataformas extranjeras deben declararse íntegramente. 
                  Si la plataforma retuvo algún impuesto en origen, indícalo aquí.
                </AlertDescription>
              </Alert>
            )}

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas (opcional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Ej: Pago mensual de intereses..." 
                      className="resize-none"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {initialData ? 'Guardar Cambios' : 'Registrar'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
