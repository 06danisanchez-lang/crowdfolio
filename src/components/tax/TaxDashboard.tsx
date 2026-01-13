import { useState } from 'react';
import { Receipt, Calculator, FileText, TrendingUp, BarChart3, AlertTriangle, ArrowLeftRight } from 'lucide-react';
import { useTaxSummary } from '@/hooks/useTaxSummary';
import { useTaxExpenses } from '@/hooks/useTaxExpenses';
import { TaxSummaryCards } from './TaxSummaryCards';
import { TaxBreakdownTable } from './TaxBreakdownTable';
import { TaxProjectionCard } from './TaxProjectionCard';
import { TaxExpensesList } from './TaxExpensesList';
import { TaxExpenseForm } from './TaxExpenseForm';
import { TaxYearSelector } from './TaxYearSelector';
import { TaxExportButton } from './TaxExportButton';
import { TaxBucketsCard } from './TaxBucketsCard';
import { CompensationBreakdown } from './CompensationBreakdown';
import { TaxInfoCard } from './TaxInfoCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function TaxDashboard() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  
  const { summary, projection, isLoading, availableYears } = useTaxSummary(selectedYear);
  const { 
    expenses, 
    addExpense, 
    updateExpense, 
    deleteExpense,
    totalExpenses,
    isLoading: expensesLoading 
  } = useTaxExpenses(selectedYear);

  if (isLoading || expensesLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-pulse text-muted-foreground">Cargando datos fiscales...</div>
      </div>
    );
  }

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
          <TaxExportButton summary={summary} expenses={expenses} />
          <TaxYearSelector
            selectedYear={selectedYear}
            onYearChange={setSelectedYear}
            availableYears={availableYears}
          />
        </div>
      </div>

      {/* KPI Summary Cards */}
      <TaxSummaryCards summary={summary} />

      {/* Projection Card for Current Year */}
      <TaxProjectionCard summary={summary} projection={projection} year={selectedYear} />

      {/* Detailed Tabs */}
      <Tabs defaultValue="breakdown" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:grid-cols-none lg:flex">
          <TabsTrigger value="breakdown" className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Desglose
          </TabsTrigger>
          <TabsTrigger value="buckets" className="flex items-center gap-2">
            <ArrowLeftRight className="h-4 w-4" />
            Cajones RCM/GPP
          </TabsTrigger>
          <TabsTrigger value="expenses" className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Gastos Deducibles
          </TabsTrigger>
        </TabsList>

        <TabsContent value="breakdown">
          <TaxBreakdownTable summary={summary} />
        </TabsContent>

        <TabsContent value="buckets" className="space-y-4">
          {/* TODO: Integrate with useTaxCalculation hook when ready */}
          <TaxBucketsCard taxResult={null} />
          <CompensationBreakdown taxResult={null} />
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
              <TaxExpenseForm year={selectedYear} onSubmit={addExpense} />
            </div>
            <TaxExpensesList
              expenses={expenses}
              onUpdate={updateExpense}
              onDelete={deleteExpense}
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* Tax Information Card - Replaces old static info */}
      <TaxInfoCard />
    </div>
  );
}
