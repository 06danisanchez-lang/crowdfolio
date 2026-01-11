import { useState, useEffect } from 'react';
import { Wallet, TrendingUp, PiggyBank, CalendarClock, Target, Heart, Search as SearchIcon } from 'lucide-react';
import { useInvestments } from '@/hooks/useInvestments';
import { useAlerts } from '@/hooks/useAlerts';
import { useOpportunities } from '@/hooks/useOpportunities';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { View } from '@/types/investment';
import { Opportunity } from '@/types/opportunity';

const Index = () => {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const {
    investments,
    isLoading,
    summary,
    addInvestment,
    updateInvestment,
    deleteInvestment,
    addPayment,
    deletePayment,
    importInvestments,
    exportInvestments,
  } = useInvestments();

  const { alerts, alertCount, hasUrgentAlerts } = useAlerts(investments);

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

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  return (
    <AppLayout 
      currentView={currentView} 
      onViewChange={setCurrentView}
      alerts={alerts}
      alertCount={alertCount}
      hasUrgentAlerts={hasUrgentAlerts}
    >
      {currentView === 'dashboard' ? (
        <div className="p-6 lg:p-8">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold">Dashboard</h1>
              <p className="text-muted-foreground">Resumen de tus inversiones inmobiliarias</p>
            </div>
            <InvestmentForm onSubmit={addInvestment} />
          </div>

          {/* KPI Cards */}
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KPICard
              title="Capital Invertido"
              value={formatCurrency(summary.totalInvested)}
              subtitle={`${investments.length} proyectos`}
              icon={Wallet}
            />
            <KPICard
              title="Retornos Recibidos"
              value={formatCurrency(summary.totalReturns)}
              icon={TrendingUp}
              trend={summary.totalInvested > 0 ? {
                value: (summary.totalReturns / summary.totalInvested) * 100,
                isPositive: true
              } : undefined}
            />
            <KPICard
              title="Retornos Esperados"
              value={formatCurrency(summary.expectedReturns)}
              subtitle="Basado en rendimientos estimados"
              icon={Target}
            />
            <KPICard
              title="Rendimiento Promedio"
              value={`${summary.averageReturn.toFixed(1)}%`}
              subtitle={`${summary.activeInvestments} inversiones activas`}
              icon={PiggyBank}
            />
          </div>

          {/* Charts */}
          <div className="mb-8 grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Distribución por Plataforma</CardTitle>
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
                </CardTitle>
              </CardHeader>
              <CardContent>
                <UpcomingMaturityList investments={investments} />
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <div className="p-6 lg:p-8">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold">Inversiones</h1>
              <p className="text-muted-foreground">Gestiona todas tus inversiones</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <ImportExport
                investments={investments}
                onImport={importInvestments}
                exportData={exportInvestments}
              />
              <InvestmentForm onSubmit={addInvestment} />
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
    </AppLayout>
  );
};

export default Index;
