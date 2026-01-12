import { useState } from 'react';
import { Receipt, Calculator, FileText } from 'lucide-react';
import { useTaxSummary } from '@/hooks/useTaxSummary';
import { useTaxExpenses } from '@/hooks/useTaxExpenses';
import { TaxSummaryCards } from './TaxSummaryCards';
import { TaxBreakdownTable } from './TaxBreakdownTable';
import { TaxExpensesList } from './TaxExpensesList';
import { TaxExpenseForm } from './TaxExpenseForm';
import { TaxYearSelector } from './TaxYearSelector';
import { TaxExportButton } from './TaxExportButton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function TaxDashboard() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  
  const { summary, isLoading, availableYears } = useTaxSummary(selectedYear);
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

      {/* Detailed Tabs */}
      <Tabs defaultValue="breakdown" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 lg:w-auto lg:grid-cols-none lg:flex">
          <TabsTrigger value="breakdown" className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Desglose
          </TabsTrigger>
          <TabsTrigger value="expenses" className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Gastos Deducibles
          </TabsTrigger>
        </TabsList>

        <TabsContent value="breakdown">
          <TaxBreakdownTable summary={summary} />
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

      {/* Tax Information Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-5 w-5" />
            Información Fiscal España 2024
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>
              Los rendimientos del capital mobiliario (intereses y dividendos) tributan en la base imponible del ahorro 
              con los siguientes tramos:
            </p>
            <ul className="list-inside list-disc space-y-1">
              <li>Hasta 6.000€: 19%</li>
              <li>De 6.000€ a 50.000€: 21%</li>
              <li>De 50.000€ a 200.000€: 23%</li>
              <li>Más de 200.000€: 27%</li>
            </ul>
            <p className="text-xs">
              * Esta información es orientativa. Consulta con un asesor fiscal para tu situación particular.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
