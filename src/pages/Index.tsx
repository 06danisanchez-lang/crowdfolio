import { useState, useEffect, useRef } from 'react';
import { Wallet, TrendingUp, PiggyBank, CalendarClock, Target, Heart, Search as SearchIcon, Plus } from 'lucide-react';
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
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState('default');
  const shareableCardRef = useRef<HTMLDivElement>(null);
  
  const { isPro, subscription } = useSubscription();
  
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
      toast.warning(`Tienes ${urgentCount} alerta${urgentCount !== 1 ? 's' : ''} urgente${urgentCount !== 1 ? 's' : ''}`, {
        description: 'Revisa las notificaciones para más detalles',
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

  return (
    <AppLayout 
      currentView={currentView} 
      onViewChange={setCurrentView}
      alerts={alerts}
      alertCount={alertCount}
      hasUrgentAlerts={hasUrgentAlerts}
    >
      <ErrorBoundary fallbackMessage="Ha ocurrido un error inesperado.">
      {currentView === 'dashboard' && (
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
                  <h1 className="text-3xl font-bold">Inicio</h1>
                  <p className="text-muted-foreground">Resumen de tus inversiones inmobiliarias</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {investments.length > 0 && (
                    <ShareSuccessButton 
                      targetRef={shareableCardRef}
                      disabled={investments.length === 0}
                    />
                  )}
                  <InvestmentForm 
                    onSubmit={addInvestment}
                    investmentCount={investments.length}
                    isPro={isPro}
                    onProRequired={() => openUpgradeModal('unlimited_investments')}
                  />
                </div>
              </div>

              {/* Tarjeta oculta para captura */}
              <div className="fixed -left-[9999px] -top-[9999px]" aria-hidden="true">
                <ShareableCard
                  ref={shareableCardRef}
                  totalInvested={summary.totalInvested}
                  totalReturns={summary.totalReturns}
                  averageReturn={summary.averageReturn}
                />
              </div>

              {/* KPI Cards */}
              <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <KPICard
                  title="Capital Invertido"
                  value={formatCurrency(summary.totalInvested)}
                  subtitle={`${investments.length} proyectos`}
                  icon={Wallet}
                  helpContent={HELP_CONTENT.dashboard.totalInvested}
                />
                <KPICard
                  title="Retornos Recibidos"
                  value={formatCurrency(summary.totalReturns)}
                  icon={TrendingUp}
                  trend={summary.totalInvested > 0 ? {
                    value: (summary.totalReturns / summary.totalInvested) * 100,
                    isPositive: true
                  } : undefined}
                  helpContent="Suma de todos los pagos recibidos: intereses, dividendos y devoluciones de capital."
                />
                <KPICard
                  title="Retornos Esperados"
                  value={formatCurrency(summary.expectedReturns)}
                  subtitle="Basado en rendimientos estimados"
                  icon={Target}
                  helpContent={HELP_CONTENT.dashboard.projectedProfit}
                />
                <KPICard
                  title="Rentabilidad Media Anual"
                  value={`${summary.averageReturn.toFixed(1)}%`}
                  subtitle={`${summary.activeInvestments} inversiones activas`}
                  icon={PiggyBank}
                  helpContent={HELP_CONTENT.dashboard.expectedReturn}
                />
              </div>

              {/* Charts */}
              <div className="mb-8 grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      Distribución por Plataforma
                      <HelpTooltip content={HELP_CONTENT.dashboard.platformDistribution} />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <PlatformDistributionChart investments={investments} />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Evolución Temporal</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <InvestmentTimelineChart investments={investments} />
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Comparativa de Rendimientos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ReturnComparisonChart investments={investments} />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CalendarClock className="h-5 w-5" />
                      Próximos Vencimientos
                      <HelpTooltip content={HELP_CONTENT.dashboard.maturityTimeline} />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <UpcomingMaturityList investments={investments} />
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      )}

      {currentView === 'investments' && (
        <div className="p-6 lg:p-8">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold">Inversiones</h1>
              <p className="text-muted-foreground">
                Gestiona todas tus inversiones
                {!isPro && ` (${investments.length}/3)`}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <ImportExport
                investments={investments}
                onImport={importInvestments}
                exportData={exportInvestments}
                isPro={isPro}
                onProRequired={() => openUpgradeModal('unlimited_imports')}
                importsThisMonth={0} // TODO: Track imports per month
              />
              <InvestmentForm 
                onSubmit={addInvestment}
                investmentCount={investments.length}
                isPro={isPro}
                onProRequired={() => openUpgradeModal('unlimited_investments')}
              />
            </div>
          </div>

          <InvestmentList
            investments={investments}
            onUpdate={updateInvestment}
            onDelete={deleteInvestment}
            onAddPayment={addPayment}
            onDeletePayment={deletePayment}
          />
        </div>
      )}

      {currentView === 'opportunities' && (
        <div className="p-6 lg:p-8">
          {opportunitiesError ? (
            <ErrorState message={opportunitiesError} onRetry={refetchOpportunities} />
          ) : (
          <>
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold">Oportunidades de Inversión</h1>
              <p className="text-muted-foreground">Descubre y analiza nuevas oportunidades</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <ScrapeButton
                onScrape={scrape}
                isScraping={isScraping}
                lastScrapedAt={lastScrapedAt}
                error={scrapeError}
                requiresSetup={requiresFirecrawlSetup}
              />
              <OpportunityForm onSubmit={addOpportunity} />
            </div>
          </div>

          {/* Summary Stats */}
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KPICard
              title="Total Oportunidades"
              value={opportunitiesSummary.total.toString()}
              subtitle={`${opportunitiesSummary.open} abiertas`}
              icon={SearchIcon}
            />
            <KPICard
              title="Favoritas"
              value={opportunitiesSummary.favorites.toString()}
              icon={Heart}
            />
            <KPICard
              title="Rentabilidad Media"
              value={`${opportunitiesSummary.averageReturn.toFixed(1)}%`}
              subtitle="De oportunidades abiertas"
              icon={TrendingUp}
            />
            <KPICard
              title="Plataformas"
              value={Object.keys(opportunitiesSummary.byPlatform).length.toString()}
              subtitle="Con oportunidades"
              icon={Target}
            />
          </div>

          {/* Filters */}
          <OpportunityFilters
            filters={filters}
            onFiltersChange={setFilters}
            sortConfig={sortConfig}
            onSortChange={setSortConfig}
            resultCount={opportunities.length}
          />

          {/* Opportunity List */}
          <OpportunityList
            opportunities={opportunities}
            isLoading={opportunitiesLoading}
            onToggleFavorite={toggleFavorite}
            onSelect={setSelectedOpportunity}
          />

          {/* Alert Settings */}
          <div className="mt-8">
            <AlertSettings />
          </div>

          {/* Opportunity Detail Sheet */}
          <OpportunityDetail
            opportunity={selectedOpportunity}
            onClose={() => setSelectedOpportunity(null)}
            onToggleFavorite={toggleFavorite}
            onDelete={deleteOpportunity}
            onUpdate={updateOpportunity}
          />
          </>
          )}
        </div>
      )}
      {currentView === 'platforms' && (
        <div className="p-6 lg:p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Mis Plataformas</h1>
            <p className="text-muted-foreground">Plataformas de crowdfunding donde estás registrado</p>
          </div>
          <PlatformList />
        </div>
      )}

      {currentView === 'tax' && (
        <div className="p-6 lg:p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Fiscalidad</h1>
            <p className="text-muted-foreground">Gestión fiscal de tus inversiones (España)</p>
          </div>
          <TaxDashboard />
        </div>
      )}

      {currentView === 'profile' && <ProfileView />}

      {currentView === 'settings' && <SettingsView />}

      {currentView === 'admin' && (
        <div className="p-6 lg:p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Panel de Administración</h1>
            <p className="text-muted-foreground">Visualiza las inversiones de todos los usuarios</p>
          </div>
          <AdminPanel />
        </div>
      )}

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
