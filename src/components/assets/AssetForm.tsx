import { useState } from 'react';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { Asset, AssetType, ASSET_TYPE_LABELS, PLATFORM_COUNTRIES } from '@/types/asset';
import { Alert, AlertDescription } from '@/components/ui/alert';

const assetFormSchema = z.object({
  assetType: z.enum(['LENDING', 'EQUITY'] as const),
  platformName: z.string().min(1, 'Plataforma requerida'),
  projectName: z.string().min(1, 'Proyecto requerido'),
  countryCode: z.string().min(2, 'País requerido'),
  acquisitionCost: z.coerce.number().positive('Debe ser mayor que 0'),
  investmentDate: z.date(),
  expectedEndDate: z.date().optional().nullable(),
  expectedReturn: z.coerce.number().min(0).max(100).optional(),
  status: z.string().default('active'),
  notes: z.string().optional(),
});

type AssetFormData = z.infer<typeof assetFormSchema>;

interface AssetFormProps {
  onSubmit: (data: Omit<Asset, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  initialData?: Asset;
  trigger?: React.ReactNode;
}

export function AssetForm({ onSubmit, initialData, trigger }: AssetFormProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<AssetFormData>({
    resolver: zodResolver(assetFormSchema),
    defaultValues: {
      assetType: initialData?.assetType || 'LENDING',
      platformName: initialData?.platformName || '',
      projectName: initialData?.projectName || '',
      countryCode: initialData?.countryCode || 'ES',
      acquisitionCost: initialData?.acquisitionCost || 0,
      investmentDate: initialData?.investmentDate ? new Date(initialData.investmentDate) : new Date(),
      expectedEndDate: initialData?.expectedEndDate ? new Date(initialData.expectedEndDate) : null,
      expectedReturn: initialData?.expectedReturn || 0,
      status: initialData?.status || 'active',
      notes: initialData?.notes || '',
    },
  });

  const selectedCountry = form.watch('countryCode');
  const isSpanish = selectedCountry === 'ES';
  const countryData = PLATFORM_COUNTRIES.find(c => c.code === selectedCountry);

  const handleSubmit = async (data: AssetFormData) => {
    setIsSubmitting(true);
    try {
      await onSubmit({
        assetType: data.assetType,
        platformName: data.platformName,
        projectName: data.projectName,
        countryCode: data.countryCode,
        acquisitionCost: data.acquisitionCost,
        investmentDate: format(data.investmentDate, 'yyyy-MM-dd'),
        expectedEndDate: data.expectedEndDate ? format(data.expectedEndDate, 'yyyy-MM-dd') : null,
        expectedReturn: data.expectedReturn || 0,
        status: data.status,
        notes: data.notes || null,
      });
      setOpen(false);
      form.reset();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Añadir Activo
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Editar Activo' : 'Nuevo Activo'}</DialogTitle>
          <DialogDescription>
            Registra un nuevo activo de inversión para seguimiento fiscal.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Asset Type */}
            <FormField
              control={form.control}
              name="assetType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Activo</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="grid grid-cols-2 gap-4"
                    >
                      {(Object.keys(ASSET_TYPE_LABELS) as AssetType[]).map((type) => (
                        <div key={type}>
                          <RadioGroupItem
                            value={type}
                            id={type}
                            className="peer sr-only"
                          />
                          <label
                            htmlFor={type}
                            className={cn(
                              "flex cursor-pointer flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary",
                              field.value === type && "border-primary"
                            )}
                          >
                            <span className="text-sm font-medium">{ASSET_TYPE_LABELS[type].label}</span>
                            <span className="text-xs text-muted-foreground">{ASSET_TYPE_LABELS[type].description}</span>
                          </label>
                        </div>
                      ))}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Platform Name */}
            <FormField
              control={form.control}
              name="platformName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Plataforma</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Urbanitae, Housers..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Project Name */}
            <FormField
              control={form.control}
              name="projectName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del Proyecto</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Residencial Madrid Norte" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Country */}
            <FormField
              control={form.control}
              name="countryCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>País de la Plataforma</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona país" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PLATFORM_COUNTRIES.map((country) => (
                        <SelectItem key={country.code} value={country.code}>
                          <span className="flex items-center gap-2">
                            <span>{country.flag}</span>
                            <span>{country.name}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Withholding Info Alert */}
            {countryData && (
              <Alert className={isSpanish ? 'border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30' : 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30'}>
                <Info className={cn('h-4 w-4', isSpanish ? 'text-blue-600' : 'text-amber-600')} />
                <AlertDescription className="text-sm">
                  {isSpanish ? (
                    <>Las plataformas españolas aplican retención del <strong>19%</strong> sobre los rendimientos.</>
                  ) : (
                    <>
                      Las plataformas extranjeras generalmente <strong>no aplican retención</strong>. 
                      Deberás declarar estos rendimientos íntegramente.
                    </>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* Acquisition Cost */}
            <FormField
              control={form.control}
              name="acquisitionCost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Coste de Adquisición (€)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" min="0" {...field} />
                  </FormControl>
                  <FormDescription>
                    Incluye inversión inicial + gastos de entrada si los hay
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Investment Date */}
            <FormField
              control={form.control}
              name="investmentDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Fecha de Inversión</FormLabel>
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
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Expected End Date */}
            <FormField
              control={form.control}
              name="expectedEndDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Fecha Estimada de Vencimiento (opcional)</FormLabel>
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
                            <span>Sin fecha definida</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value || undefined}
                        onSelect={field.onChange}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Expected Return */}
            <FormField
              control={form.control}
              name="expectedReturn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rentabilidad Anual Esperada (%)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.1" min="0" max="100" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Status */}
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estado</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona estado" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="active">Activo</SelectItem>
                      <SelectItem value="completed">Completado</SelectItem>
                      <SelectItem value="defaulted">Fallido</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas (opcional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Cualquier información adicional..." 
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
                {initialData ? 'Guardar Cambios' : 'Añadir Activo'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
