import { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useFutureInvestments } from '@/hooks/useFutureInvestments';
import { useInvestments } from '@/hooks/useInvestments';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { FutureInvestment } from '@/types/futureInvestment';
import { Investment, Platform, PLATFORMS } from '@/types/investment';
import { InvestmentForm, FutureInvestmentFormData } from '@/components/investments/InvestmentForm';
import { UpgradeModal } from '@/components/subscription/UpgradeModal';
import { KPICard } from '@/components/dashboard/KPICard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Plus, Trash2, ArrowRightCircle, ExternalLink, CalendarPlus,
  Bookmark, Wallet, CalendarClock, Bell, AlertTriangle, Pencil,
} from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { differenceInDays, parseISO, format, startOfDay, addDays } from 'date-fns';
import { cn } from '@/lib/utils';

// --- Derived status logic ---
type DerivedStatus = 'opens_today' | 'review' | 'opens_soon' | 'pending' | 'no_date';

function getDerivedStatus(dateStr: string | undefined): DerivedStatus {
  if (!dateStr) return 'no_date';
  const days = differenceInDays(startOfDay(parseISO(dateStr)), startOfDay(new Date()));
  if (days === 0) return 'opens_today';
  if (days < 0) return 'review';
  if (days <= 7) return 'opens_soon';
  return 'pending';
}

function getStatusLabel(status: DerivedStatus, t: (key: string) => string): string {
  const map: Record<DerivedStatus, string> = {
    opens_today: 'future.status.opensToday',
    review: 'future.status.review',
    opens_soon: 'future.status.opensSoon',
    pending: 'future.status.pending',
    no_date: 'future.status.noDate',
  };
  return t(map[status]);
}

function getStatusVariant(status: DerivedStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
  const map: Record<DerivedStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    opens_today: 'destructive',
    review: 'destructive',
    opens_soon: 'default',
    pending: 'secondary',
    no_date: 'outline',
  };
  return map[status];
}

const STATUS_SORT_ORDER: Record<DerivedStatus, number> = {
  opens_today: 0,
  review: 1,
  opens_soon: 2,
  pending: 3,
  no_date: 4,
};

function sortByUrgency(a: FutureInvestment, b: FutureInvestment): number {
  const sa = getDerivedStatus(a.estimatedOpenDate);
  const sb = getDerivedStatus(b.estimatedOpenDate);
  if (STATUS_SORT_ORDER[sa] !== STATUS_SORT_ORDER[sb]) {
    return STATUS_SORT_ORDER[sa] - STATUS_SORT_ORDER[sb];
  }
  // Within same status, sort by date
  if (a.estimatedOpenDate && b.estimatedOpenDate) {
    // For review (past dates), most recent first
    if (sa === 'review') return parseISO(b.estimatedOpenDate).getTime() - parseISO(a.estimatedOpenDate).getTime();
    return parseISO(a.estimatedOpenDate).getTime() - parseISO(b.estimatedOpenDate).getTime();
  }
  return 0;
}

// --- Filter logic ---
type FilterKey = 'all' | 'today' | 'soon' | 'no_date' | 'review';

function matchesFilter(fi: FutureInvestment, filter: FilterKey): boolean {
  if (filter === 'all') return true;
  const status = getDerivedStatus(fi.estimatedOpenDate);
  const map: Record<FilterKey, DerivedStatus[]> = {
    all: [],
    today: ['opens_today'],
    soon: ['opens_soon'],
    no_date: ['no_date'],
    review: ['review'],
  };
  return map[filter].includes(status);
}

// --- Helper ---
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

function mapFutureToFormData(fi: FutureInvestment): FutureInvestmentFormData {
  return {
    platform: fi.platform,
    customPlatformName: fi.customPlatformName,
    projectName: fi.projectName,
    amount: fi.estimatedAmount ?? undefined,
    expectedReturn: fi.expectedReturn ?? undefined,
    investmentDate: fi.estimatedOpenDate ? new Date(fi.estimatedOpenDate) : undefined,
    expectedEndDate: fi.estimatedEndDate ? new Date(fi.estimatedEndDate) : undefined,
    sourceUrl: fi.sourceUrl,
    notes: fi.notes,
  };
}

export function FutureInvestmentList() {
  const { t } = useLanguage();
  const { futureInvestments, isLoading, addFutureInvestment, updateFutureInvestment, deleteFutureInvestment, convertToReal } = useFutureInvestments();
  const { investments, addInvestment } = useInvestments();
  const { isPro } = useSubscription();
  const isMobile = useIsMobile();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState('default');
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');

  // --- KPIs ---
  const stats = useMemo(() => {
    const total = futureInvestments.length;
    const withAmount = futureInvestments.filter(fi => fi.estimatedAmount != null);
    const plannedCapital = withAmount.reduce((s, fi) => s + (fi.estimatedAmount ?? 0), 0);

    const today = startOfDay(new Date());
    const in30days = addDays(today, 30);

    const withFutureDate = futureInvestments
      .filter(fi => fi.estimatedOpenDate && parseISO(fi.estimatedOpenDate) >= today)
      .sort((a, b) => parseISO(a.estimatedOpenDate!).getTime() - parseISO(b.estimatedOpenDate!).getTime());

    const nextOpening = withFutureDate[0]?.estimatedOpenDate;

    const upcomingCount = futureInvestments.filter(fi => {
      if (!fi.estimatedOpenDate) return false;
      const d = startOfDay(parseISO(fi.estimatedOpenDate));
      return d >= today && d <= in30days;
    }).length;

    return { total, plannedCapital, withAmountCount: withAmount.length, nextOpening, upcomingCount };
  }, [futureInvestments]);

  // --- Attention items ---
  const attentionItems = useMemo(() => {
    return futureInvestments
      .filter(fi => {
        const s = getDerivedStatus(fi.estimatedOpenDate);
        return s === 'opens_today' || s === 'review';
      })
      .sort(sortByUrgency);
  }, [futureInvestments]);

  // --- Filtered & sorted list ---
  const sortedList = useMemo(() => {
    return futureInvestments
      .filter(fi => matchesFilter(fi, activeFilter))
      .sort(sortByUrgency);
  }, [futureInvestments, activeFilter]);

  const getPlatformLabel = (platform: Platform, customName?: string) => {
    if (platform === 'other' && customName) return customName;
    return PLATFORMS.find(p => p.value === platform)?.label || platform;
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);

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

  const handleEditSubmit = async (fiId: string, data: any) => {
    await updateFutureInvestment(fiId, {
      platform: data.platform,
      customPlatformName: data.customPlatformName,
      projectName: data.projectName,
      estimatedAmount: data.amount ?? null,
      expectedReturn: data.expectedReturn ?? null,
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

  // --- Capital planificado subtitle ---
  const capitalSubtitle = (() => {
    if (stats.total === 0) return undefined;
    if (stats.withAmountCount === 0) return t('future.kpi.noAmounts');
    if (stats.withAmountCount < stats.total) {
      return t('future.kpi.scopeSubtitle')
        .replace('{n}', String(stats.withAmountCount))
        .replace('{total}', String(stats.total));
    }
    return undefined;
  })();

  // --- Filter chips ---
  const filters: { key: FilterKey; label: string }[] = [
    { key: 'all', label: t('future.filter.all') },
    { key: 'today', label: t('future.filter.today') },
    { key: 'soon', label: t('future.filter.soon') },
    { key: 'no_date', label: t('future.filter.noDate') },
    { key: 'review', label: t('future.filter.review') },
  ];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">{t('future.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('future.subtitle')}</p>
        </div>
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

      {/* KPIs */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <KPICard
          title={t('future.kpi.saved')}
          value={stats.total}
          icon={Bookmark}
        />
        <KPICard
          title={t('future.kpi.plannedCapital')}
          value={formatCurrency(stats.plannedCapital)}
          subtitle={capitalSubtitle}
          icon={Wallet}
        />
        <KPICard
          title={t('future.kpi.nextOpening')}
          value={stats.nextOpening ? format(parseISO(stats.nextOpening), 'dd/MM/yyyy') : '—'}
          subtitle={!stats.nextOpening ? t('future.kpi.noDate') : undefined}
          icon={CalendarClock}
        />
        <KPICard
          title={t('future.kpi.upcoming')}
          value={stats.upcomingCount}
          subtitle={t('future.kpi.upcomingSubtitle')}
          icon={Bell}
        />
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mb-1 scrollbar-none">
        {filters.map(f => (
          <button
            key={f.key}
            onClick={() => setActiveFilter(f.key)}
            className={cn(
              "shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors border",
              activeFilter === f.key
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-muted-foreground border-border hover:bg-muted"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Mobile attention banner */}
      {isMobile && attentionItems.length > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
          <p className="text-sm font-medium">
            {t('future.attention.urgentBanner').replace('{count}', String(attentionItems.length))}
          </p>
        </div>
      )}

      {/* Desktop: 2-column layout (list + attention sidebar) */}
      {!isMobile ? (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main list — 2/3 */}
          <div className="lg:col-span-2 space-y-3">
            {sortedList.length === 0 && futureInvestments.length > 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  {t('future.filter.all')} — 0
                </CardContent>
              </Card>
            ) : sortedList.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <CalendarPlus className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="text-lg font-medium">{t('future.emptyTitle')}</p>
                  <p className="text-sm text-muted-foreground mt-1">{t('future.emptyDesc')}</p>
                </CardContent>
              </Card>
            ) : (
              sortedList.map(fi => (
                <FutureInvestmentCard
                  key={fi.id}
                  fi={fi}
                  t={t}
                  getPlatformLabel={getPlatformLabel}
                  formatCurrency={formatCurrency}
                  onConvert={handleConvertClick}
                  onDelete={setDeleteId}
                  onEditSubmit={handleEditSubmit}
                  isPro={isPro}
                  investmentCount={futureInvestments.length}
                  onProRequired={() => {
                    setUpgradeFeature('unlimited_future_investments');
                    setUpgradeModalOpen(true);
                  }}
                />
              ))
            )}
          </div>

          {/* Attention sidebar — 1/3 */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertTriangle className="h-4 w-4" />
                  {t('future.attention.title')}
                  {attentionItems.length > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-xs font-bold text-white">
                      {attentionItems.length}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {attentionItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t('future.attention.empty')}</p>
                ) : (
                  <div className="space-y-2">
                    {attentionItems.map(fi => {
                      const status = getDerivedStatus(fi.estimatedOpenDate);
                      return (
                        <div key={fi.id} className="flex items-center justify-between gap-2 rounded-md border p-2.5">
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{fi.projectName}</p>
                            <p className="text-xs text-muted-foreground">{getPlatformLabel(fi.platform, fi.customPlatformName)}</p>
                          </div>
                          <Badge variant={getStatusVariant(status)} className="shrink-0 text-xs">
                            {getStatusLabel(status, t)}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        /* Mobile: list only */
        <div className="space-y-3">
          {sortedList.length === 0 && futureInvestments.length > 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                {t('future.filter.all')} — 0
              </CardContent>
            </Card>
          ) : sortedList.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <CalendarPlus className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-lg font-medium">{t('future.emptyTitle')}</p>
                <p className="text-sm text-muted-foreground mt-1">{t('future.emptyDesc')}</p>
              </CardContent>
            </Card>
          ) : (
            sortedList.map(fi => (
              <FutureInvestmentCard
                key={fi.id}
                fi={fi}
                t={t}
                getPlatformLabel={getPlatformLabel}
                formatCurrency={formatCurrency}
                onConvert={handleConvertClick}
                onDelete={setDeleteId}
                onEditSubmit={handleEditSubmit}
                isPro={isPro}
                investmentCount={futureInvestments.length}
                onProRequired={() => {
                  setUpgradeFeature('unlimited_future_investments');
                  setUpgradeModalOpen(true);
                }}
              />
            ))
          )}
        </div>
      )}

      {/* Convert dialog */}
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

      <UpgradeModal open={upgradeModalOpen} onOpenChange={setUpgradeModalOpen} feature={upgradeFeature} />
    </div>
  );
}

// --- Extracted card component ---
interface FutureInvestmentCardProps {
  fi: FutureInvestment;
  t: (key: string) => string;
  getPlatformLabel: (platform: Platform, customName?: string) => string;
  formatCurrency: (value: number) => string;
  onConvert: (id: string) => void;
  onDelete: (id: string) => void;
  onEditSubmit: (fiId: string, data: any) => void;
  isPro: boolean;
  investmentCount: number;
  onProRequired: () => void;
}

function FutureInvestmentCard({ fi, t, getPlatformLabel, formatCurrency, onConvert, onDelete, onEditSubmit, isPro, investmentCount, onProRequired }: FutureInvestmentCardProps) {
  const status = getDerivedStatus(fi.estimatedOpenDate);

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1.5 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold truncate">{fi.projectName}</h3>
              <Badge variant={getStatusVariant(status)} className="shrink-0 text-xs">
                {getStatusLabel(status, t)}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span>{getPlatformLabel(fi.platform, fi.customPlatformName)}</span>
              {fi.estimatedAmount != null && (
                <span>{formatCurrency(fi.estimatedAmount)}</span>
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
            <InvestmentForm
              mode="future"
              initialData={mapFutureToFormData(fi)}
              onSubmit={(data) => onEditSubmit(fi.id, data)}
              investmentCount={investmentCount}
              isPro={isPro}
              onProRequired={onProRequired}
              trigger={
                <Button variant="outline" size="sm">
                  <Pencil className="mr-1.5 h-4 w-4" />
                  {t('common.edit')}
                </Button>
              }
            />
            <Button variant="default" size="sm" onClick={() => onConvert(fi.id)}>
              <ArrowRightCircle className="mr-1.5 h-4 w-4" />
              {t('future.convertBtn')}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-destructive"
              onClick={() => onDelete(fi.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
