import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useFutureInvestments } from '@/hooks/useFutureInvestments';
import { useInvestments } from '@/hooks/useInvestments';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { FutureInvestment } from '@/types/futureInvestment';
import { Investment, Platform, PLATFORMS } from '@/types/investment';
import { InvestmentForm } from '@/components/investments/InvestmentForm';
import { UpgradeModal } from '@/components/subscription/UpgradeModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Trash2, ArrowRightCircle, ExternalLink, CalendarPlus } from 'lucide-react';
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
import { differenceInDays, parseISO, format } from 'date-fns';

function getTimeUntilLabel(dateStr: string | undefined, t: (key: string) => string): { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' } {
  if (!dateStr) return { label: t('future.noDate'), variant: 'outline' };
  const days = differenceInDays(parseISO(dateStr), new Date());
  if (days < 0) return { label: t('future.alreadyOpen'), variant: 'destructive' };
  if (days === 0) return { label: t('future.opensToday'), variant: 'destructive' };
  if (days === 1) return { label: t('future.opensTomorrow'), variant: 'default' };
  if (days <= 7) return { label: `${t('future.opensIn')} ${days} ${t('future.days')}`, variant: 'default' };
  if (days <= 30) return { label: `${t('future.opensIn')} ${Math.ceil(days / 7)} ${t('future.weeks')}`, variant: 'secondary' };
  return { label: `${t('future.opensIn')} ${Math.ceil(days / 30)} ${t('future.months')}`, variant: 'secondary' };
}

function mapFutureToPartialInvestment(fi: FutureInvestment): Partial<Investment> {
  return {
    platform: fi.platform,
    customPlatformName: fi.customPlatformName,
    projectName: fi.projectName,
    amount: fi.estimatedAmount ?? 0,
    expectedReturn: fi.expectedReturn ?? 0,
    investmentDate: fi.estimatedOpenDate || new Date().toISOString(),
    expectedEndDate: fi.estimatedEndDate,
    notes: fi.notes,
    status: 'active' as const,
    payments: [],
    id: '',
    createdAt: '',
    updatedAt: '',
  };
}

export function FutureInvestmentList() {
  const { t } = useLanguage();
  const { futureInvestments, isLoading, addFutureInvestment, deleteFutureInvestment, convertToReal } = useFutureInvestments();
  const { investments, addInvestment } = useInvestments();
  const { isPro } = useSubscription();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState('default');

  const getPlatformLabel = (platform: Platform, customName?: string) => {
    if (platform === 'other' && customName) return customName;
    return PLATFORMS.find(p => p.value === platform)?.label || platform;
  };

  const handleFutureSubmit = async (data: any) => {
    await addFutureInvestment({
      platform: data.platform,
      customPlatformName: data.customPlatformName,
      projectName: data.projectName,
      estimatedAmount: data.amount || null,
      expectedReturn: data.expectedReturn || null,
      estimatedOpenDate: data.investmentDate,
      estimatedEndDate: data.expectedEndDate,
      sourceUrl: data.sourceUrl,
      notes: data.notes,
    });
  };

  const handleConvertClick = (fiId: string) => {
    if (!isPro && investments.length >= 3) {
      setUpgradeFeature('unlimited_investments');
      setUpgradeModalOpen(true);
      return;
    }
    setConvertingId(fiId);
  };

  const handleConvertSubmit = async (data: any) => {
    if (!convertingId) return;
    const realData: Omit<Investment, 'id' | 'createdAt' | 'updatedAt' | 'payments'> = {
      platform: data.platform,
      customPlatformName: data.customPlatformName,
      projectName: data.projectName,
      amount: data.amount,
      expectedReturn: data.expectedReturn,
      status: data.status,
      investmentDate: data.investmentDate.toISOString(),
      expectedEndDate: data.expectedEndDate?.toISOString(),
      notes: data.notes,
    };
    await convertToReal(convertingId, realData, addInvestment);
    setConvertingId(null);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteFutureInvestment(deleteId);
    setDeleteId(null);
  };

  const convertingItem = convertingId ? futureInvestments.find(fi => fi.id === convertingId) : null;

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Create button */}
      <div className="flex justify-end">
        <InvestmentForm
          mode="future"
          onSubmit={handleFutureSubmit}
          investmentCount={futureInvestments.length}
          isPro={isPro}
          onProRequired={() => {
            setUpgradeFeature('unlimited_future_investments');
            setUpgradeModalOpen(true);
          }}
          trigger={
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {t('future.addBtn')}
            </Button>
          }
        />
      </div>

      {/* Empty state */}
      {futureInvestments.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <CalendarPlus className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-lg font-medium">{t('future.emptyTitle')}</p>
            <p className="text-sm text-muted-foreground mt-1">{t('future.emptyDesc')}</p>
          </CardContent>
        </Card>
      )}

      {/* List */}
      <div className="grid gap-4">
        {futureInvestments.map((fi) => {
          const timeLabel = getTimeUntilLabel(fi.estimatedOpenDate, t);
          return (
            <Card key={fi.id} className="overflow-hidden">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold truncate">{fi.projectName}</h3>
                      <Badge variant={timeLabel.variant} className="shrink-0 text-xs">
                        {timeLabel.label}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span>{getPlatformLabel(fi.platform, fi.customPlatformName)}</span>
                      {fi.estimatedAmount != null && (
                        <span>{fi.estimatedAmount.toLocaleString('es-ES')} € {t('future.estimated')}</span>
                      )}
                      {fi.expectedReturn != null && (
                        <span>{fi.expectedReturn}% {t('future.annualReturn')}</span>
                      )}
                      {fi.estimatedOpenDate && (
                        <span>{format(parseISO(fi.estimatedOpenDate), 'dd/MM/yyyy')}</span>
                      )}
                    </div>
                    {fi.sourceUrl && (
                      <a
                        href={fi.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
                      >
                        <ExternalLink className="h-3 w-3" />
                        {t('future.viewSource')}
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleConvertClick(fi.id)}
                    >
                      <ArrowRightCircle className="mr-1.5 h-4 w-4" />
                      {t('future.convertBtn')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => setDeleteId(fi.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Convert dialog — only rendered when convertingId is set and item found */}
      {convertingItem && (
        <InvestmentForm
          mode="real"
          initialData={mapFutureToPartialInvestment(convertingItem) as Investment}
          onSubmit={handleConvertSubmit}
          investmentCount={investments.length}
          isPro={isPro}
          onProRequired={() => {
            setUpgradeFeature('unlimited_investments');
            setUpgradeModalOpen(true);
          }}
          trigger={<span className="hidden" />}
        />
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('future.deleteConfirm')}</AlertDialogTitle>
            <AlertDialogDescription>{t('future.deleteDesc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>{t('common.delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Upgrade Modal */}
      <UpgradeModal
        open={upgradeModalOpen}
        onOpenChange={setUpgradeModalOpen}
        feature={upgradeFeature}
      />
    </div>
  );
}
