import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Plus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { PLATFORMS, Platform } from '@/types/investment';
import { 
  PROJECT_TYPES, 
  RISK_LEVELS, 
  OPPORTUNITY_STATUS_OPTIONS,
  Opportunity,
  ProjectType,
  RiskLevel,
  OpportunityStatus,
} from '@/types/opportunity';

const opportunitySchema = z.object({
  platform: z.string().min(1, 'Selecciona una plataforma'),
  projectName: z.string().min(1, 'El nombre es requerido').max(200),
  projectType: z.string().min(1, 'Selecciona un tipo'),
  location: z.string().min(1, 'La ubicación es requerida'),
  expectedReturn: z.coerce.number().min(0).max(100),
  term: z.coerce.number().min(1).max(120),
  minInvestment: z.coerce.number().min(0),
  targetAmount: z.coerce.number().min(0),
  currentAmount: z.coerce.number().min(0),
  status: z.string().min(1, 'Selecciona un estado'),
  riskLevel: z.string().min(1, 'Selecciona un nivel de riesgo'),
  description: z.string().optional(),
  url: z.string().url('URL inválida').optional().or(z.literal('')),
});

type OpportunityFormData = z.infer<typeof opportunitySchema>;

interface OpportunityFormProps {
  onSubmit: (data: Omit<Opportunity, 'id' | 'createdAt' | 'updatedAt' | 'source' | 'isFavorite'>) => void;
  initialData?: Partial<Opportunity>;
  trigger?: React.ReactNode;
}

export function OpportunityForm({ onSubmit, initialData, trigger }: OpportunityFormProps) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);

  const form = useForm<OpportunityFormData>({
    resolver: zodResolver(opportunitySchema),
    defaultValues: {
      platform: initialData?.platform || '',
      projectName: initialData?.projectName || '',
      projectType: initialData?.projectType || 'residential',
      location: initialData?.location || '',
      expectedReturn: initialData?.expectedReturn || 0,
      term: initialData?.term || 12,
      minInvestment: initialData?.minInvestment || 0,
      targetAmount: initialData?.targetAmount || 0,
      currentAmount: initialData?.currentAmount || 0,
      status: initialData?.status || 'open',
      riskLevel: initialData?.riskLevel || 'medium',
      description: initialData?.description || '',
      url: initialData?.url || '',
    },
  });

  const handleSubmit = (data: OpportunityFormData) => {
    const fundingProgress = data.targetAmount > 0 
      ? (data.currentAmount / data.targetAmount) * 100 
      : 0;

    onSubmit({
      platform: data.platform as Platform,
      projectName: data.projectName,
      projectType: data.projectType as ProjectType,
      location: data.location,
      expectedReturn: data.expectedReturn,
      term: data.term,
      minInvestment: data.minInvestment,
      targetAmount: data.targetAmount,
      currentAmount: data.currentAmount,
      fundingProgress,
      status: data.status as OpportunityStatus,
      riskLevel: data.riskLevel as RiskLevel,
      description: data.description,
      url: data.url || undefined,
    });

    form.reset();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
      {trigger || (
          <Button variant="outline" className="gap-2">
            <Plus className="h-4 w-4" />
            {t('opportunities.addManual')}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('opportunities.addTitle')}</DialogTitle>
          <DialogDescription>
            {t('opportunities.addDesc')}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="platform"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('common.platform')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PLATFORMS.map(p => (
                          <SelectItem key={p.value} value={p.value}>
                            {p.label}
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
                name="projectType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('opportunities.form.projectType')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PROJECT_TYPES.map(t => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="projectName"
              render={({ field }) => (
                <FormItem>
                <FormLabel>{t('investments.form.project')}</FormLabel>
                <FormControl>
                  <Input placeholder={t('opportunities.form.projectPlaceholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                <FormLabel>{t('opportunities.form.location')}</FormLabel>
                <FormControl>
                  <Input placeholder={t('opportunities.form.locationPlaceholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="expectedReturn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('opportunities.form.expectedReturn')}</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="term"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('opportunities.form.term')}</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="minInvestment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('opportunities.form.minInvestment')}</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="targetAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('opportunities.form.target')}</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="currentAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('opportunities.form.raised')}</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('common.status')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {OPPORTUNITY_STATUS_OPTIONS.map(s => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
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
                name="riskLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('opportunities.form.riskLevel')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {RISK_LEVELS.map(r => (
                          <SelectItem key={r.value} value={r.value}>
                            {r.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('opportunities.form.url')}</FormLabel>
                  <FormControl>
                    <Input type="url" placeholder="https://..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                <FormLabel>{t('opportunities.form.description')}</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder={t('opportunities.form.descriptionPlaceholder')} 
                    className="resize-none"
                    rows={3}
                    {...field} 
                  />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit">{t('opportunities.addBtn')}</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
