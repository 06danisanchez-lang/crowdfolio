import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Wallet, TrendingUp, PiggyBank, CalendarClock, Target, Heart, Search as SearchIcon, Plus, Crown } from 'lucide-react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ErrorState } from '@/components/ui/error-state';
import { useInvestments } from '@/hooks/useInvestments';
import { useAlerts } from '@/hooks/useAlerts';
import { useOpportunities } from '@/hooks/useOpportunities';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { KPICard } from '@/components/dashboard/KPICard';
import { PlatformDistributionChart } from '@/components/dashboard/PlatformDistributionChart';
import { InvestmentTimelineChart } from '@/components/dashboard/InvestmentTimelineChart';
import { ReturnComparisonChart } from '@/components/dashboard/ReturnComparisonChart';
import { UpcomingMaturityList } from '@/components/dashboard/UpcomingMaturityList';
import { InvestmentList } from '@/components/investments/InvestmentList';
import { InvestmentForm } from '@/components/investments/InvestmentForm';
import { ImportExport } from '@/components/investments/ImportExport';
import { OpportunityList } from '@/components/opportunities/OpportunityList';
import { OpportunityFilters } from '@/components/opportunities/OpportunityFilters';
import { OpportunityForm } from '@/components/opportunities/OpportunityForm';
import { OpportunityDetail } from '@/components/opportunities/OpportunityDetail';
import { ScrapeButton } from '@/components/opportunities/ScrapeButton';
import { AlertSettings } from '@/components/opportunities/AlertSettings';
import { PlatformList } from '@/components/platforms/PlatformList';
import { TaxDashboard } from '@/components/tax/TaxDashboard';
import { ShareableCard } from '@/components/dashboard/ShareableCard';
import { ShareSuccessButton } from '@/components/dashboard/ShareSuccessButton';
import { BillingSettings } from '@/components/subscription/BillingSettings';
import { UpgradeModal } from '@/components/subscription/UpgradeModal';
import { FounderWelcomeModal } from '@/components/subscription/FounderWelcomeModal';
import { AdminPanel } from '@/components/admin/AdminPanel';
import { ProfileView } from '@/components/profile/ProfileView';
import { SettingsView } from '@/components/settings/SettingsView';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HelpTooltip } from '@/components/ui/help-tooltip';
import { HELP_CONTENT } from '@/lib/help/tooltipContent';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { View } from '@/types/investment';
import { Opportunity } from '@/types/opportunity';

const Index = () => {
  const { t } = useLanguage();
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState('default');
  const shareableCardRef = useRef<HTMLDivElement>(null);
  
  const { isPro, isLoading: subLoading, importCountThisMonth } = useSubscription();
  
  const {
    investments,
    isLoading,
    error: investmentsError,
    summary,
    addInvestment,
    updateInvestment,
    deleteInvestment,
    addPayment,
    deletePayment,
    importInvestments,
    exportInvestments,
  } = useInvestments();

  const {
    opportunities,
    allOpportunities,
    isLoading: opportunitiesLoading,
    error: opportunitiesError,
    isScraping,
    lastScrapedAt,
    scrapeError,
    requiresFirecrawlSetup,
    filters,
    setFilters,
    sortConfig,
    setSortConfig,
    summary: opportunitiesSummary,
    scrape,
    addOpportunity,
    updateOpportunity,
    deleteOpportunity,
    toggleFavorite,
    refetch: refetchOpportunities,
  } = useOpportunities();

  const { alerts, alertCount, hasUrgentAlerts } = useAlerts(investments);

  const openUpgradeModal = (feature: string) => {
    setUpgradeFeature(feature);
    setUpgradeModalOpen(true);
  };

  // Show toast notification on initial load if there are urgent alerts
  useEffect(() => {
    if (!isLoading && hasUrgentAlerts) {
      const urgentCount = alerts.filter(a => a.severity === 'danger').length;
      toast.warning(`${t('dashboard.urgentAlerts').replace('{n}', String(urgentCount))}`, {
        description: t('dashboard.checkNotifications'),
        duration: 5000,
      });
    }
  }, [isLoading, hasUrgentAlerts, alerts]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <div className="p-6 lg:p-8">
            {investmentsError ? (
              <ErrorState message={investmentsError} onRetry={() => window.location.reload()} />
            ) : isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-8 w-48" />
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-32" />
                  ))}
                </div>
                <div className="grid gap-6 lg:grid-cols-2">
                  <Skeleton className="h-64" />
                  <Skeleton className="h-64" />
                </div>
              </div>
            ) : (
              <>
                <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h1 className="text-3xl font-bold">{t('nav.dashboard')}</h1>
                    <p className="text-muted-foreground">{t('dashboard.subtitle')}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {investments.length > 0 && (
                      <ShareSuccessButton targetRef={shareableCardRef} disabled={investments.length === 0} />
                    )}
                    <InvestmentForm onSubmit={addInvestment} investmentCount={investments.length} isPro={isPro} onProRequired={() => openUpgradeModal('unlimited_investments')} />
                  </div>
                </div>
                <div className="fixed -left-[9999px] -top-[9999px]" aria-hidden="true">
                  <ShareableCard ref={shareableCardRef} totalInvested={summary.totalInvested} totalReturns={summary.totalReturns} averageReturn={summary.averageReturn} />
                </div>
                {!isPro && (
                  <div className="mb-6 rounded-lg border bg-muted/30 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">Crowdfolio Pro</p>
                      <p className="text-sm text-muted-foreground">{t('subscription.dashboard.freeDesc')}</p>
                    </div>
                    <button
                      onClick={() => openUpgradeModal('default')}
                      className="shrink-0 inline-flex items-center gap-2 rounded-md border border-primary bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                    >
                      <Crown className="h-4 w-4" />
                      {t('subscription.dashboard.ctaBtn')}
                    </button>
                  </div>
                )}
                <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <KPICard title={t('dashboard.kpi.invested')} value={formatCurrency(summary.totalInvested)} subtitle={`${investments.length} ${t('dashboard.kpi.projects')}`} icon={Wallet} helpContent={HELP_CONTENT.dashboard.totalInvested} />
                  <KPICard title={t('dashboard.kpi.returns')} value={formatCurrency(summary.totalReturns)} icon={TrendingUp} trend={summary.totalInvested > 0 ? { value: (summary.totalReturns / summary.totalInvested) * 100, isPositive: true } : undefined} helpContent={t('dashboard.kpi.returnsHelp')} />
                  <KPICard title={t('dashboard.kpi.expected')} value={formatCurrency(summary.expectedReturns)} subtitle={t('dashboard.kpi.expectedSubtitle')} icon={Target} helpContent={HELP_CONTENT.dashboard.projectedProfit} />
                  <KPICard title={t('dashboard.kpi.performance')} value={`${summary.averageReturn.toFixed(1)}%`} subtitle={`${summary.activeInvestments} ${t('dashboard.kpi.activeInvestments')}`} icon={PiggyBank} helpContent={HELP_CONTENT.dashboard.expectedReturn} />
                </div>
                <div className="mb-8 grid gap-6 lg:grid-cols-2">
                  <Card><CardHeader><CardTitle className="flex items-center gap-2">{t('dashboard.chart.distribution')}<HelpTooltip content={HELP_CONTENT.dashboard.platformDistribution} /></CardTitle></CardHeader><CardContent><PlatformDistributionChart investments={investments} /></CardContent></Card>
                  <Card><CardHeader><CardTitle>{t('dashboard.chart.timeline')}</CardTitle></CardHeader><CardContent><InvestmentTimelineChart investments={investments} /></CardContent></Card>
                </div>
                <div className="grid gap-6 lg:grid-cols-2">
                  <Card><CardHeader><CardTitle>{t('dashboard.chart.comparison')}</CardTitle></CardHeader><CardContent><ReturnComparisonChart investments={investments} /></CardContent></Card>
                  <Card><CardHeader><CardTitle className="flex items-center gap-2"><CalendarClock className="h-5 w-5" />{t('dashboard.upcomingTitle')}<HelpTooltip content={HELP_CONTENT.dashboard.maturityTimeline} /></CardTitle></CardHeader><CardContent><UpcomingMaturityList investments={investments} /></CardContent></Card>
                </div>
              </>
            )}
          </div>
        );
      case 'investments':
        return (
          <div className="p-6 lg:p-8">
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-3xl font-bold">{t('investments.title')}</h1>
                <p className="text-muted-foreground">{t('investments.subtitle')}{!isPro && ` (${investments.length}/3)`}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <ImportExport investments={investments} onImport={importInvestments} exportData={exportInvestments} isPro={isPro} onProRequired={() => openUpgradeModal('unlimited_imports')} importsThisMonth={0} />
                <InvestmentForm onSubmit={addInvestment} investmentCount={investments.length} isPro={isPro} onProRequired={() => openUpgradeModal('unlimited_investments')} />
              </div>
            </div>
            <InvestmentList investments={investments} onUpdate={updateInvestment} onDelete={deleteInvestment} onAddPayment={addPayment} onDeletePayment={deletePayment} />
          </div>
        );
      case 'opportunities':
        return (
          <div className="p-6 lg:p-8">
            {opportunitiesError ? (
              <ErrorState message={opportunitiesError} onRetry={refetchOpportunities} />
            ) : (
              <>
                <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h1 className="text-3xl font-bold">{t('opportunities.title')}</h1>
                    <p className="text-muted-foreground">{t('opportunities.subtitle')}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <ScrapeButton onScrape={scrape} isScraping={isScraping} lastScrapedAt={lastScrapedAt} error={scrapeError} requiresSetup={requiresFirecrawlSetup} />
                    <OpportunityForm onSubmit={addOpportunity} />
                  </div>
                </div>
                <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <KPICard title={t('opportunities.kpi.total')} value={opportunitiesSummary.total.toString()} subtitle={`${opportunitiesSummary.open} ${t('opportunities.kpi.open')}`} icon={SearchIcon} />
                  <KPICard title={t('opportunities.kpi.favorites')} value={opportunitiesSummary.favorites.toString()} icon={Heart} />
                  <KPICard title={t('opportunities.kpi.avgReturn')} value={`${opportunitiesSummary.averageReturn.toFixed(1)}%`} subtitle={t('opportunities.kpi.avgReturn.sub')} icon={TrendingUp} />
                  <KPICard title={t('opportunities.kpi.platforms')} value={Object.keys(opportunitiesSummary.byPlatform).length.toString()} subtitle={t('opportunities.kpi.platforms.sub')} icon={Target} />
                </div>
                <OpportunityFilters filters={filters} onFiltersChange={setFilters} sortConfig={sortConfig} onSortChange={setSortConfig} resultCount={opportunities.length} />
                <OpportunityList opportunities={opportunities} isLoading={opportunitiesLoading} onToggleFavorite={toggleFavorite} onSelect={setSelectedOpportunity} />
                <div className="mt-8"><AlertSettings /></div>
                <OpportunityDetail opportunity={selectedOpportunity} onClose={() => setSelectedOpportunity(null)} onToggleFavorite={toggleFavorite} onDelete={deleteOpportunity} onUpdate={updateOpportunity} />
              </>
            )}
          </div>
        );
      case 'platforms':
        return (
          <div className="p-6 lg:p-8">
            <div className="mb-8">
              <h1 className="text-3xl font-bold">{t('platforms.title')}</h1>
              <p className="text-muted-foreground">{t('platforms.subtitle')}</p>
            </div>
            <PlatformList />
          </div>
        );
      case 'tax':
        return (
          <div className="p-6 lg:p-8">
            <div className="mb-8">
              <h1 className="text-3xl font-bold">{t('tax.title')}</h1>
              <p className="text-muted-foreground">{t('tax.subtitle')}</p>
            </div>
            <TaxDashboard />
          </div>
        );
      case 'profile':
        return <ProfileView />;
      case 'settings':
        return <SettingsView />;
      case 'admin':
        return (
          <div className="p-6 lg:p-8">
            <div className="mb-8">
              <h1 className="text-3xl font-bold">{t('admin.title')}</h1>
              <p className="text-muted-foreground">{t('admin.subtitle')}</p>
            </div>
            <AdminPanel />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <AppLayout 
      currentView={currentView} 
      onViewChange={setCurrentView}
      alerts={alerts}
      alertCount={alertCount}
      hasUrgentAlerts={hasUrgentAlerts}
    >
      <ErrorBoundary fallbackMessage="Ha ocurrido un error inesperado.">
      <div key={currentView}>
        {renderCurrentView()}
      </div>

      {/* Founder Welcome Modal - solo para usuarios Pro */}
      <FounderWelcomeModal />

      {/* Upgrade Modal */}
      <UpgradeModal
        open={upgradeModalOpen}
        onOpenChange={setUpgradeModalOpen}
        feature={upgradeFeature}
      />
      </ErrorBoundary>
    </AppLayout>
  );
};

export default Index;
