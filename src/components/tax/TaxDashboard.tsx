import { useState } from 'react';
import { Receipt, Calculator, ArrowLeftRight, AlertTriangle, RefreshCw, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTaxSummary } from '@/hooks/useTaxSummary';
import { useTaxExpenses } from '@/hooks/useTaxExpenses';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { TaxSummaryCards } from './TaxSummaryCards';
import { TaxBreakdownTable } from './TaxBreakdownTable';
import { TaxProjectionCard } from './TaxProjectionCard';
import { TaxExpensesList } from './TaxExpensesList';
import { TaxExpenseForm } from './TaxExpenseForm';
import { TaxYearSelector } from './TaxYearSelector';
import { TaxExportButton } from './TaxExportButton';
import { TaxBucketsCard } from './TaxBucketsCard';
import { TaxInfoCard } from './TaxInfoCard';
import { SuggestedExpenses } from './SuggestedExpenses';
import { TaxEmptyState } from './TaxEmptyState';
import { TaxExpenseCategory } from '@/types/tax';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';

interface TaxDashboardProps {
  isPro?: boolean;
  onProRequired?: () => void;
  /** Navega a la ficha de una inversión desde el aviso de cuestionario sin completar (Fase 4). */
  onOpenInvestment?: (investmentId: string) => void;
}

export function TaxDashboard({ isPro = false, onProRequired, onOpenInvestment }: TaxDashboardProps) {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [expenseFormOpen, setExpenseFormOpen] = useState(false);
  const [prefillCategory, setPrefillCategory] = useState<TaxExpenseCategory | undefined>();
  const [prefillDescription, setPrefillDescription] = useState<string | undefined>();
  // Controlado para no perder la pestaña activa cuando se pasa de "sin datos" a "con datos"
  // (p. ej. al anotar el primer gasto deducible de un ejercicio sin cobros).
  const [activeTab, setActiveTab] = useState('breakdown');
  const { t } = useLanguage();
  const { user } = useAuth();

  const { summary, projection, isLoading, availableYears, excludedIncompleteCount, enrichedPayments, defaultLossSummary, manualGppOperations, notAssessedDefaultedInvestments, error, refetch } = useTaxSummary(selectedYear);
  const { 
    expenses, 
    addExpense, 
    updateExpense, 
    deleteExpense,
    totalExpenses,
    isLoading: expensesLoading 
  } = useTaxExpenses(selectedYear);

  const handleAddSuggested = (category: TaxExpenseCategory, description: string) => {
    setPrefillCategory(category);
    setPrefillDescription(description);
    setExpenseFormOpen(true);
  };

  if (isLoading || expensesLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-pulse text-muted-foreground">Cargando datos fiscales...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-12 text-center">
        <AlertTriangle className="h-10 w-10 text-destructive" />
        <div>
          <p className="text-base font-medium">No se pudieron cargar los datos fiscales</p>
          <p className="mt-1 text-sm text-muted-foreground">{error}</p>
        </div>
        <Button variant="outline" onClick={refetch}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Reintentar
        </Button>
      </div>
    );
  }

  const spainTaxNotice = (
    <Alert className="border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-100">
      <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
      <AlertDescription className="text-sm">
        El informe fiscal está diseñado para inversores que tributan en España (IRPF). Si tributas en otro país, los cálculos pueden no ser aplicables a tu situación fiscal.
      </AlertDescription>
    </Alert>
  );

  // Detectar si el ejercicio no tiene datos NI proyecciones
  const hasProjections = projection.byInvestment.length > 0;
  const hasDefaultLossData =
    defaultLossSummary.declarable.rows.length > 0 ||
    defaultLossSummary.recoveryGains.rows.length > 0 ||
    defaultLossSummary.pending.length > 0 ||
    defaultLossSummary.equityExcluded.length > 0;
  const hasNoData = summary.grossIncome === 0 &&
                    summary.withholdingsApplied === 0 &&
                    summary.deductibleExpenses === 0 &&
                    !hasProjections &&
                    notAssessedDefaultedInvestments.length === 0 &&
                    manualGppOperations.length === 0 &&
                    !hasDefaultLossData;

  return (
    <div className="space-y-6">
      {/* Header with Year Selector */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Resumen Fiscal</h2>
          <p className="text-muted-foreground">
            Visualiza tus rendimientos y obligaciones fiscales
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!hasNoData && <TaxExportButton summary={summary} expenses={expenses} enrichedPayments={enrichedPayments} defaultLossSummary={defaultLossSummary} manualGppOperations={manualGppOperations} userEmail={user?.email ?? ''} isPro={isPro} onProRequired={onProRequired} />}
          <TaxYearSelector
            selectedYear={selectedYear}
            onYearChange={setSelectedYear}
            availableYears={availableYears}
          />
        </div>
      </div>

      {spainTaxNotice}

      {/* Inversiones en impago sin cuestionario fiscal completar (Fase 4) */}
      {notAssessedDefaultedInvestments.map((inv) => (
        <div
          key={inv.investmentId}
          className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between rounded-lg border border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30 p-3"
        >
          <span className="text-sm text-amber-800 dark:text-amber-300">{t('defaultLoss.notAssessedBanner.text')}</span>
          <Button size="sm" className="shrink-0" onClick={() => onOpenInvestment?.(inv.investmentId)}>
            {t('defaultLoss.notAssessedBanner.button')}
          </Button>
        </div>
      ))}

      {/* KPI Summary Cards */}
      {excludedIncompleteCount > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border text-sm text-muted-foreground">
          <span>{t('tax.incomplete.warning').replace('{count}', String(excludedIncompleteCount))}</span>
        </div>
      )}
      {!hasNoData && (
        <>
          <TaxSummaryCards summary={summary} />

          {/* Projection Card for Current Year */}
          <TaxProjectionCard summary={summary} projection={projection} year={selectedYear} />
        </>
      )}

      {/* Detailed Tabs — siempre visibles: sin cobros se pueden anotar gastos igualmente */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:grid-cols-none lg:flex">
          <TabsTrigger value="breakdown" className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Desglose
          </TabsTrigger>
          <TabsTrigger value="buckets" className="flex items-center gap-2">
            <ArrowLeftRight className="h-4 w-4" />
            Bases imponibles
          </TabsTrigger>
          <TabsTrigger value="expenses" className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Gastos Deducibles
          </TabsTrigger>
        </TabsList>

        <TabsContent value="breakdown">
          {hasNoData ? <TaxEmptyState year={selectedYear} /> : <TaxBreakdownTable summary={summary} />}
        </TabsContent>

        <TabsContent value="buckets" className="space-y-4">
          {hasNoData ? (
            <TaxEmptyState year={selectedYear} />
          ) : (
            <TaxBucketsCard summary={summary} defaultLossSummary={defaultLossSummary} manualGppOperations={manualGppOperations} />
          )}
        </TabsContent>

        <TabsContent value="expenses">
          <div className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold">Gastos Deducibles {selectedYear}</h3>
                <p className="text-sm text-muted-foreground">
                  Total: {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(totalExpenses)}
                </p>
              </div>
              <TaxExpenseForm 
                year={selectedYear} 
                onSubmit={addExpense}
                prefillCategory={prefillCategory}
                prefillDescription={prefillDescription}
                open={expenseFormOpen}
                onOpenChange={(open) => {
                  setExpenseFormOpen(open);
                  if (!open) {
                    setPrefillCategory(undefined);
                    setPrefillDescription(undefined);
                  }
                }}
              />
            </div>
            
            {/* Suggested Expenses - shown when there are already some expenses */}
            {expenses.length > 0 && (
              <SuggestedExpenses onAddSuggested={handleAddSuggested} />
            )}
            
            <TaxExpensesList
              expenses={expenses}
              onUpdate={updateExpense}
              onDelete={deleteExpense}
              onAddSuggested={handleAddSuggested}
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* Tax Information Card */}
      <TaxInfoCard />
    </div>
  );
}
