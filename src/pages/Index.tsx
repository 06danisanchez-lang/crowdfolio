import { useState, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Wallet, TrendingUp, PiggyBank, CalendarClock, Target, Crown, Bell, BarChart3, CheckCircle2, Banknote, Lock } from 'lucide-react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ErrorState } from '@/components/ui/error-state';
import { useActiveInvestments } from '@/hooks/useActiveInvestments';
import { useAlerts } from '@/hooks/useAlerts';
import { useNotifications } from '@/hooks/useNotifications';
import { useNotificationGenerator } from '@/hooks/useNotificationGenerator';
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
import { NotificationBell } from '@/components/layout/NotificationBell';
import { BillingSettings } from '@/components/subscription/BillingSettings';
import { UpgradeModal } from '@/components/subscription/UpgradeModal';
import { FounderWelcomeModal } from '@/components/subscription/FounderWelcomeModal';
import { BetaExpiredModal } from '@/components/subscription/BetaExpiredModal';
import { AdminPanel } from '@/components/admin/AdminPanel';
import { ProfileView } from '@/components/profile/ProfileView';
import { SettingsView } from '@/components/settings/SettingsView';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle, ExternalLink, AlertTriangle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Notification } from '@/hooks/useNotifications';
import { getNotifConfig } from '@/lib/notifications/notificationConfig';
import { HelpTooltip } from '@/components/ui/help-tooltip';
import { HELP_CONTENT } from '@/lib/help/tooltipContent';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { View } from '@/types/investment';
import { cn } from '@/lib/utils';

const Index = () => {
  const { t } = useLanguage();
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [investmentsFilter, setInvestmentsFilter] = useState<'active' | 'all'>('all');
  const [pendingOpenInvestmentId, setPendingOpenInvestmentId] = useState<string | null>(null);
  const [notificationsSheetOpen, setNotificationsSheetOpen] = useState(false);
  const [savingNotificationId, setSavingNotificationId] = useState<string | null>(null);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState('default');
  const [dashboardTab, setDashboardTab] = useState<'current' | 'historical'>('current');
  const shareableCardRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  
  const { isPro, isLoading: subLoading } = useSubscription();
  
  const {
    investments,
    activeInvestments,
    completedInvestments,
    incompleteInvestments,
    allInvestmentsCount,
    allInvestments,
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
    lockedInvestments,
    isLimited,
  } = useActiveInvestments();

  // For Free plan limit: count ALL active+pending (incl. locked) toward the 3-investment cap
  const activePendingCount = allInvestments.filter(i => i.status === 'active' || i.status === 'pending').length;

  const { alerts, alertCount, hasUrgentAlerts } = useAlerts(activeInvestments, scheduleMap);

  const {
    notifications,
    isLoading: notificationsLoading,
    unreadCount,
    markAsRead,
  } = useNotifications();

  const unreadNotifications = notifications.filter(n => !n.read);

  useNotificationGenerator(
    investments,
    scheduleMap,
    notifications,
    !notificationsLoading,
  );

  const handleViewChange = (view: View) => {
    setCurrentView(view);
    setInvestmentsFilter('all');
  };

  const openInvestmentDetail = (investmentId: string) => {
    setInvestmentsFilter('all');
    setCurrentView('investments');
    setNotificationsSheetOpen(false);
    setPendingOpenInvestmentId(investmentId);
  };

  const handleSheetPaid = async (notification: Notification) => {
    setSavingNotificationId(notification.id);
    const data = notification.data as Record<string, unknown>;
    try {
      await addPayment(data.investmentId as string, {
        date: new Date(data.scheduleEntryDate as string).toISOString(),
        amount: data.expectedAmount as number,
        type: 'interest',
      });
      markAsRead(notification.id);
    } finally {
      setSavingNotificationId(null);
    }
  };

  const handleSheetNotPaid = (notification: Notification) => {
    markAsRead(notification.id);
    const data = notification.data as Record<string, unknown>;
    const investmentId = data?.investmentId as string | undefined;
    if (investmentId) {
      openInvestmentDetail(investmentId);
    } else {
      setInvestmentsFilter('all');
      setCurrentView('investments');
      setNotificationsSheetOpen(false);
    }
  };

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
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
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
        title={t('dashboard.kpi.accruedProfit')}
        value={formatCurrency(summary.activeSummary.accruedProfit)}
        subtitle={scopeSubtitle(summary.activeSummary.withEndDateCount, summary.activeSummary.count)}
        icon={TrendingUp}
        helpContent={HELP_CONTENT.dashboard.accruedProfit}
      />
      <KPICard
        title={t('dashboard.kpi.activeCount')}
        value={summary.activeSummary.count}
        icon={PiggyBank}
        helpContent={HELP_CONTENT.dashboard.activeCount}
        onClick={() => { setInvestmentsFilter('active'); setCurrentView('investments'); }}
      />
    </div>
  );

  const renderHistoricalKPIs = () => (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      <KPICard
        title={t('dashboard.kpi.historicalInvested')}
        value={formatCurrency(summary.historicalSummary.totalInvested)}
        subtitle={`${completedInvestments.length} ${t('dashboard.kpi.projects')}`}
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
          <div className="px-4 pt-4 pb-6 sm:px-6 lg:px-8">
            {investmentsError ? (
              <ErrorState message={investmentsError} onRetry={() => window.location.reload()} />
            ) : isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-8 w-48" />
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
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
                  <div className="flex items-center gap-2">
                    {investments.length > 0 && (
                      <ShareSuccessButton targetRef={shareableCardRef} disabled={investments.length === 0} />
                    )}
                    <NotificationBell
                      notifications={unreadNotifications}
                      unreadCount={unreadCount}
                      onMarkAsRead={markAsRead}
                      onAddPayment={async (investmentId, payment) => { await addPayment(investmentId, payment); }}
                      onOpenInvestment={openInvestmentDetail}
                    />
                    <InvestmentForm onSubmit={addInvestment} onSubmitDraft={addDraftInvestment} investmentCount={activePendingCount} isPro={isPro} onProRequired={() => openUpgradeModal('unlimited_investments')} />
                  </div>
                </div>

                {/* Hidden shareable card */}
                <div className="fixed -left-[9999px] -top-[9999px]" aria-hidden="true">
                  <ShareableCard ref={shareableCardRef} totalInvested={summary.totalInvested} totalReturns={summary.totalReturns} averageReturn={summary.averageReturn} />
                </div>

                {/* Free plan locked investments banner */}
                {isLimited && (
                  <div className="mb-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3">
                    <div className="flex items-center gap-2 text-sm text-amber-900">
                      <Lock className="h-4 w-4 shrink-0 text-amber-600" />
                      <span>
                        <strong>Plan gratuito</strong> — el dashboard muestra solo tus 3 inversiones más antiguas.
                        Tienes <strong>{lockedInvestments.length}</strong> inversión{lockedInvestments.length !== 1 ? 'es' : ''} bloqueada{lockedInvestments.length !== 1 ? 's' : ''}.
                      </span>
                    </div>
                    <Button size="sm" variant="outline" className="border-amber-400 text-amber-900 hover:bg-amber-100 shrink-0" onClick={() => openUpgradeModal('unlimited_investments')}>
                      <Crown className="mr-1.5 h-3.5 w-3.5" />
                      Activar Pro
                    </Button>
                  </div>
                )}

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
                              hasUrgentAlerts ? "bg-amber-500" : "bg-primary"
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
                        <UpcomingMaturityList investments={activeInvestments} />
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
          <div className="px-6 pt-4 pb-6 lg:px-8">
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">{t('investments.title')}</h1>
                <p className="text-muted-foreground">{t('investments.subtitle')}{!isPro && ` (${activePendingCount}/3)`}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <ImportExport investments={investments} onImport={importInvestments} exportData={exportInvestments} isPro={isPro} currentActivePendingCount={activePendingCount} />
                <InvestmentForm onSubmit={addInvestment} onSubmitDraft={addDraftInvestment} investmentCount={activePendingCount} isPro={isPro} onProRequired={() => openUpgradeModal('unlimited_investments')} />
              </div>
            </div>
            <InvestmentList
              activeInvestments={activeInvestments}
              completedInvestments={completedInvestments}
              incompleteInvestments={incompleteInvestments}
              lockedInvestments={lockedInvestments}
              scheduleMap={scheduleMap}
              onUpdate={updateInvestment}
              onDelete={deleteInvestment}
              onAddPayment={addPayment}
              onDeletePayment={deletePayment}
              onUpgrade={() => openUpgradeModal('unlimited_investments')}
              allowDraftSave
              initialStatusFilter={investmentsFilter}
              openInvestmentId={pendingOpenInvestmentId}
              onInvestmentOpened={() => setPendingOpenInvestmentId(null)}
            />
          </div>
        );
      case 'future-investments':
        return (
          <div className="px-4 pt-4 pb-6 sm:px-6 lg:px-8">
            <FutureInvestmentList
              onAddInvestment={addInvestment}
              investmentCount={allInvestmentsCount}
            />
          </div>
        );
      case 'tax':
        return (
          <div className="px-6 pt-4 pb-6 lg:px-8">
            <div className="mb-8">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">{t('tax.title')}</h1>
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
          <div className="px-6 pt-4 pb-6 lg:px-8">
            <div className="mb-8">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">{t('admin.title')}</h1>
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
      onViewChange={handleViewChange}
      incompleteCount={incompleteInvestments.length}
      notificationCount={unreadCount + alertCount}
      onOpenNotifications={() => setNotificationsSheetOpen(true)}
    >
      <ErrorBoundary fallbackMessage="Ha ocurrido un error inesperado.">
      <div key={currentView}>
        {renderCurrentView()}
      </div>

      {/* Founder Welcome Modal - solo para usuarios Pro */}
      <FounderWelcomeModal />

      {/* Beta Expired Modal - avisa a usuarios beta cuyo Pro ha caducado */}
      <BetaExpiredModal />

      {/* Upgrade Modal */}
      <UpgradeModal
        open={upgradeModalOpen}
        onOpenChange={setUpgradeModalOpen}
        feature={upgradeFeature}
      />

      {/* Notifications Sheet */}
      {(() => {
        const paymentDue   = unreadNotifications.filter(n => n.type === 'payment_due');
        const maturityNtfs = unreadNotifications.filter(n => n.type === 'maturity_soon' || n.type === 'maturity_overdue');
        const weeklySummary = unreadNotifications.find(n => n.type === 'weekly_summary');
        const totalUnread = unreadCount + alertCount;

        const handleViewInvestment = (n: Notification) => {
          markAsRead(n.id);
          setInvestmentsFilter('all');
          setCurrentView('investments');
          setNotificationsSheetOpen(false);
        };

        return (
          <Sheet open={notificationsSheetOpen} onOpenChange={setNotificationsSheetOpen}>
            <SheetContent className="w-full md:max-w-lg p-0">
              <SheetHeader className="px-6 py-4 border-b">
                <SheetTitle>{t('nav.notifications')}</SheetTitle>
                <SheetDescription>
                  {totalUnread === 0 ? t('notifications.empty') : `${totalUnread} ${t('notifications.pending')}`}
                </SheetDescription>
              </SheetHeader>

              <ScrollArea className="h-[calc(100vh-88px)]">
                <div className="divide-y">

                  {/* Resumen semanal */}
                  {weeklySummary && (() => {
                    const cfg = getNotifConfig('weekly_summary');
                    return (
                      <div className="px-6 py-4">
                        <div className={cn('p-4 space-y-2', cfg.cardClass)} style={cfg.cardStyle}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <BarChart3 className={cn('h-4 w-4', cfg.iconClass)} />
                              <p className={cn('text-sm font-semibold', cfg.titleClass)}>{weeklySummary.title}</p>
                            </div>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => markAsRead(weeklySummary.id)}>
                              <CheckCircle className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          <p className={cn('text-sm leading-relaxed', cfg.textClass)}>{weeklySummary.message}</p>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Cobros esperados */}
                  {paymentDue.length > 0 && (
                    <div className="px-6 py-4 space-y-3">
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('notifications.paymentDue')}</h3>
                      {paymentDue.map(n => {
                        const cfg = getNotifConfig(n.type);
                        const isSaving = savingNotificationId === n.id;
                        return (
                          <div key={n.id} className={cn('p-3 space-y-2', cfg.cardClass)} style={cfg.cardStyle}>
                            <div className="flex items-start gap-2">
                              <Banknote className={cn('h-4 w-4 mt-0.5 shrink-0', cfg.iconClass)} />
                              <div>
                                <p className={cn('text-sm font-medium', cfg.titleClass)}>{n.title}</p>
                                <p className={cn('text-xs mt-0.5 leading-snug', cfg.textClass)}>{n.message}</p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" className="min-h-[44px] text-xs bg-[#253765] hover:bg-[#1a2847] text-white" disabled={isSaving} onClick={() => handleSheetPaid(n)}>
                                <CheckCircle className="mr-1 h-3 w-3" />{t('notifications.yesPaid')}
                              </Button>
                              <Button size="sm" variant="outline" className="min-h-[44px] text-xs" disabled={isSaving} onClick={() => handleSheetNotPaid(n)}>
                                <ExternalLink className="mr-1 h-3 w-3" />{t('notifications.notPaid')}
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Vencimientos */}
                  {maturityNtfs.length > 0 && (
                    <div className="px-6 py-4 space-y-3">
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('notifications.maturities')}</h3>
                      {maturityNtfs.map(n => {
                        const cfg = getNotifConfig(n.type);
                        const IconComp = n.type === 'maturity_overdue' ? Clock : AlertTriangle;
                        return (
                          <div key={n.id} className={cn('p-3 space-y-2', cfg.cardClass)} style={cfg.cardStyle}>
                            <div className="flex items-start gap-2">
                              <IconComp className={cn('h-4 w-4 mt-0.5 shrink-0', cfg.iconClass)} />
                              <div>
                                <p className={cn('text-sm font-medium', cfg.titleClass)}>{n.title}</p>
                                <p className={cn('text-xs mt-0.5 leading-snug', cfg.textClass)}>{n.message}</p>
                              </div>
                            </div>
                            <Button size="sm" variant="outline" className="min-h-[44px] text-xs ml-6" onClick={() => handleViewInvestment(n)}>
                              <ExternalLink className="mr-1 h-3 w-3" />{t('notifications.viewInvestment')}
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Alertas de cartera */}
                  <div className="px-6 py-4 space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('notifications.portfolioAlerts')}</h3>
                    <AlertsPanel alerts={alerts} alertCount={alertCount} hasUrgentAlerts={hasUrgentAlerts} variant="inline" />
                  </div>

                </div>
              </ScrollArea>
            </SheetContent>
          </Sheet>
        );
      })()}

      </ErrorBoundary>
    </AppLayout>
  );
};

export default Index;
