import { useState, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Wallet, TrendingUp, PiggyBank, CalendarClock, Target, Crown, Bell, BarChart3, CheckCircle2, Banknote } from 'lucide-react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ErrorState } from '@/components/ui/error-state';
import { useInvestments } from '@/hooks/useInvestments';
import { useAlerts } from '@/hooks/useAlerts';
import { useIsMobile } from '@/hooks/use-mobile';

import { useSubscription } from '@/contexts/SubscriptionContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { KPICard } from '@/components/dashboard/KPICard';
import { PlatformDistributionChart } from '@/components/dashboard/PlatformDistributionChart';
import { InvestmentTimelineChart } from '@/components/dashboard/InvestmentTimelineChart';
import { UpcomingMaturityList } from '@/components/dashboard/UpcomingMaturityList';
import { AlertsPanel } from '@/components/dashboard/AlertsPanel';
import { InvestmentList } from '@/components/investments/InvestmentList';
import { InvestmentForm } from '@/components/investments/InvestmentForm';
import { ImportExport } from '@/components/investments/ImportExport';

import { TaxDashboard } from '@/components/tax/TaxDashboard';
import { FutureInvestmentList } from '@/components/future-investments/FutureInvestmentList';
import { ShareableCard } from '@/components/dashboard/ShareableCard';
import { ShareSuccessButton } from '@/components/dashboard/ShareSuccessButton';
import { BillingSettings } from '@/components/subscription/BillingSettings';
import { UpgradeModal } from '@/components/subscription/UpgradeModal';
import { FounderWelcomeModal } from '@/components/subscription/FounderWelcomeModal';
import { AdminPanel } from '@/components/admin/AdminPanel';
import { ProfileView } from '@/components/profile/ProfileView';
import { SettingsView } from '@/components/settings/SettingsView';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { HelpTooltip } from '@/components/ui/help-tooltip';
import { HELP_CONTENT } from '@/lib/help/tooltipContent';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { View } from '@/types/investment';
import { cn } from '@/lib/utils';

const Index = () => {
  const { t } = useLanguage();
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState('default');
  const [dashboardTab, setDashboardTab] = useState<'current' | 'historical'>('current');
  const shareableCardRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  
  const { isPro, isLoading: subLoading, importCountThisMonth } = useSubscription();
  
  const {
    investments,
    incompleteInvestments,
    allInvestmentsCount,
    isLoading,
    error: investmentsError,
    summary,
    scheduleMap,
    addInvestment,
    addDraftInvestment,
    updateInvestment,
    deleteInvestment,
    addPayment,
    deletePayment,
    importInvestments,
    exportInvestments,
  } = useInvestments();

  const { alerts, alertCount, hasUrgentAlerts } = useAlerts(investments);

  const openUpgradeModal = (feature: string) => {
    setUpgradeFeature(feature);
    setUpgradeModalOpen(true);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const scopeSubtitle = (n: number, total: number) => {
    if (n === total) return undefined;
    return t('dashboard.kpi.scopeSubtitle').replace('{n}', String(n)).replace('{total}', String(total));
  };

  const renderCurrentKPIs = () => (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
      <KPICard
        title={t('dashboard.kpi.activeCapital')}
        value={formatCurrency(summary.activeSummary.capital)}
        subtitle={`${summary.activeSummary.count} ${t('dashboard.kpi.activeInvestments')}`}
        icon={Wallet}
        helpContent={HELP_CONTENT.dashboard.activeCapital}
      />
      <KPICard
        title={t('dashboard.kpi.estimatedTotal')}
        value={formatCurrency(summary.activeSummary.estimatedTotal)}
        subtitle={scopeSubtitle(summary.activeSummary.withEndDateCount, summary.activeSummary.count)}
        icon={Target}
        helpContent={HELP_CONTENT.dashboard.estimatedTotal}
      />
      <KPICard
        title={t('dashboard.kpi.expectedProfit')}
        value={formatCurrency(summary.activeSummary.expectedProfit)}
        subtitle={scopeSubtitle(summary.activeSummary.withEndDateCount, summary.activeSummary.count)}
        icon={TrendingUp}
        helpContent={HELP_CONTENT.dashboard.expectedProfit}
      />
      <KPICard
        title={t('dashboard.kpi.activeCount')}
        value={summary.activeSummary.count}
        icon={PiggyBank}
        helpContent={HELP_CONTENT.dashboard.activeCount}
      />
    </div>
  );

  const renderHistoricalKPIs = () => (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
      <KPICard
        title={t('dashboard.kpi.historicalInvested')}
        value={formatCurrency(summary.historicalSummary.totalInvested)}
        subtitle={`${investments.length} ${t('dashboard.kpi.projects')}`}
        icon={Wallet}
        helpContent={HELP_CONTENT.dashboard.historicalInvested}
      />
      <KPICard
        title={t('dashboard.kpi.totalCollected')}
        value={formatCurrency(summary.historicalSummary.totalCollected)}
        icon={Banknote}
        helpContent={HELP_CONTENT.dashboard.totalCollected}
      />
      <KPICard
        title={t('dashboard.kpi.realizedProfit')}
        value={formatCurrency(summary.historicalSummary.realizedProfit)}
        icon={TrendingUp}
        trend={summary.historicalSummary.totalInvested > 0 ? {
          value: (summary.historicalSummary.realizedProfit / summary.historicalSummary.totalInvested) * 100,
          isPositive: summary.historicalSummary.realizedProfit >= 0,
        } : undefined}
        helpContent={HELP_CONTENT.dashboard.realizedProfit}
      />
      <KPICard
        title={t('dashboard.kpi.completedCount')}
        value={summary.historicalSummary.completedCount}
        icon={CheckCircle2}
        helpContent={HELP_CONTENT.dashboard.completedCount}
      />
    </div>
  );

  const renderCurrentView = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <div className="p-4 sm:p-6 lg:p-8">
            {investmentsError ? (
              <ErrorState message={investmentsError} onRetry={() => window.location.reload()} />
            ) : isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-8 w-48" />
                <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
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
                {/* Header */}
                <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold">{t('nav.dashboard')}</h1>
                    <p className="text-sm text-muted-foreground">{t('dashboard.subtitle')}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {investments.length > 0 && (
                      <ShareSuccessButton targetRef={shareableCardRef} disabled={investments.length === 0} />
                    )}
                    <InvestmentForm onSubmit={addInvestment} onSubmitDraft={addDraftInvestment} investmentCount={allInvestmentsCount} isPro={isPro} onProRequired={() => openUpgradeModal('unlimited_investments')} />
                  </div>
                </div>

                {/* Hidden shareable card */}
                <div className="fixed -left-[9999px] -top-[9999px]" aria-hidden="true">
                  <ShareableCard ref={shareableCardRef} totalInvested={summary.totalInvested} totalReturns={summary.totalReturns} averageReturn={summary.averageReturn} />
                </div>

                {/* Pro banner */}
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

                {/* Mobile: toggle tabs */}
                {isMobile ? (
                  <>
                    <div className="mb-4 flex rounded-lg border bg-muted/50 p-1">
                      <button
                        onClick={() => setDashboardTab('current')}
                        className={cn(
                          "flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                          dashboardTab === 'current'
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {t('dashboard.tab.current')}
                      </button>
                      <button
                        onClick={() => setDashboardTab('historical')}
                        className={cn(
                          "flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                          dashboardTab === 'historical'
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {t('dashboard.tab.historical')}
                      </button>
                    </div>
                    <div className="mb-6">
                      {dashboardTab === 'current' ? renderCurrentKPIs() : renderHistoricalKPIs()}
                    </div>
                  </>
                ) : (
                  <>
                    {/* Desktop: both sections */}
                    <div className="mb-6">
                      <h2 className="mb-3 text-lg font-semibold">{t('dashboard.section.current')}</h2>
                      {renderCurrentKPIs()}
                    </div>
                    <div className="mb-6">
                      <h2 className="mb-3 text-lg font-semibold">{t('dashboard.section.historical')}</h2>
                      {renderHistoricalKPIs()}
                    </div>
                  </>
                )}

                {/* Tracking section */}
                <div className="mb-6">
                  <h2 className="mb-3 text-lg font-semibold">{t('dashboard.section.tracking')}</h2>
                  <div className="grid gap-6 lg:grid-cols-2">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <Bell className="h-4 w-4" />
                          {t('dashboard.alerts.title')}
                          {alertCount > 0 && (
                            <span className={cn(
                              "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-bold text-white",
                              hasUrgentAlerts ? "bg-destructive" : "bg-primary"
                            )}>
                              {alertCount}
                            </span>
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <AlertsPanel
                          alerts={alerts}
                          alertCount={alertCount}
                          hasUrgentAlerts={hasUrgentAlerts}
                          variant="inline"
                        />
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <CalendarClock className="h-4 w-4" />
                          {t('dashboard.upcomingTitle')}
                          <HelpTooltip content={HELP_CONTENT.dashboard.maturityTimeline} />
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <UpcomingMaturityList investments={investments} />
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* Analysis section */}
                <div>
                  <h2 className="mb-3 text-lg font-semibold">{t('dashboard.section.analysis')}</h2>
                  <div className="grid gap-6 lg:grid-cols-2">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          {t('dashboard.chart.distribution')}
                          <HelpTooltip content={HELP_CONTENT.dashboard.platformDistribution} />
                        </CardTitle>
                        <CardDescription>{t('dashboard.chart.distributionSubtitle')}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <PlatformDistributionChart investments={investments} />
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader>
                        <CardTitle>{t('dashboard.chart.timeline')}</CardTitle>
                        <CardDescription>{t('dashboard.chart.timelineSubtitle')}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <InvestmentTimelineChart investments={investments} />
                      </CardContent>
                    </Card>
                  </div>
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
                <p className="text-muted-foreground">{t('investments.subtitle')}{!isPro && ` (${allInvestmentsCount}/3)`}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <ImportExport investments={investments} onImport={importInvestments} exportData={exportInvestments} isPro={isPro} onProRequired={() => openUpgradeModal('unlimited_imports')} importsThisMonth={importCountThisMonth} />
                <InvestmentForm onSubmit={addInvestment} onSubmitDraft={addDraftInvestment} investmentCount={allInvestmentsCount} isPro={isPro} onProRequired={() => openUpgradeModal('unlimited_investments')} />
              </div>
            </div>
            <InvestmentList
              investments={investments}
              incompleteInvestments={incompleteInvestments}
              scheduleMap={scheduleMap}
              onUpdate={updateInvestment}
              onDelete={deleteInvestment}
              onAddPayment={addPayment}
              onDeletePayment={deletePayment}
              allowDraftSave
            />
          </div>
        );
      case 'future-investments':
        return (
          <div className="p-4 sm:p-6 lg:p-8">
            <FutureInvestmentList />
          </div>
        );
      case 'tax':
        return (
          <div className="p-6 lg:p-8">
            <div className="mb-8">
              <h1 className="text-3xl font-bold">{t('tax.title')}</h1>
              <p className="text-muted-foreground">{t('tax.subtitle')}</p>
            </div>
            <TaxDashboard isPro={isPro} onProRequired={() => openUpgradeModal('export_irpf')} />
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
      incompleteCount={incompleteInvestments.length}
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
