import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { TaxSummary } from '@/types/tax';
import { Investment } from '@/types/investment';
import { calculateProgressiveTax, calculateEffectiveRate } from '@/lib/tax/calculations';
import { calculateYearlyProjection, TaxProjection } from '@/lib/tax/projections';
import { useTaxExpenses } from './useTaxExpenses';
import { isInvestmentComplete } from '@/lib/investment/completeness';

const FETCH_TIMEOUT_MS = 15_000;

interface PaymentWithInvestment {
  id: string;
  date: string;
  amount: number;
  type: string;
  withholding_applied: number | null;
  investment_id: string;
}

interface InvestmentRow {
  id: string;
  platform: string;
  custom_platform_name: string | null;
  project_name: string;
  amount: number;
  investment_date: string;
  expected_end_date: string | null;
  expected_return: number;
  income_model: string | null;
  payment_frequency: string | null;
  principal_return_type: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

function mapInvestmentRow(inv: InvestmentRow): Investment {
  return {
    id: inv.id,
    platform: inv.platform as Investment['platform'],
    customPlatformName: inv.custom_platform_name || undefined,
    projectName: inv.project_name,
    amount: Number(inv.amount),
    investmentDate: inv.investment_date,
    expectedEndDate: inv.expected_end_date || undefined,
    expectedReturn: Number(inv.expected_return),
    status: inv.status as Investment['status'],
    incomeModel: (inv.income_model || undefined) as Investment['incomeModel'],
    paymentFrequency: (inv.payment_frequency || undefined) as Investment['paymentFrequency'],
    principalReturnType: (inv.principal_return_type || undefined) as Investment['principalReturnType'],
    notes: inv.notes || undefined,
    payments: [],
    createdAt: inv.created_at,
    updatedAt: inv.updated_at,
  };
}

export function useTaxSummary(year: number) {
  const { user } = useAuth();
  const [payments, setPayments] = useState<PaymentWithInvestment[]>([]);
  const [projectionInvestments, setProjectionInvestments] = useState<Investment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [excludedIncompleteCount, setExcludedIncompleteCount] = useState(0);
  const requestIdRef = useRef(0);
  const { expenses, totalExpenses, isLoading: expensesLoading } = useTaxExpenses(year);

  useEffect(() => {
    const currentId = ++requestIdRef.current;

    async function fetchData() {
      if (!user) {
        setPayments([]);
        setProjectionInvestments([]);
        setIsLoading(false);
        setError(null);
        return;
      }

      const timeoutId = setTimeout(() => {
        if (requestIdRef.current !== currentId) return;
        setIsLoading(false);
        setError('Timeout: la carga fiscal tardó demasiado');
      }, FETCH_TIMEOUT_MS);

      try {
        setIsLoading(true);
        setError(null);

        // Single fetch of all investments
        const { data: investmentsData, error: investmentsError } = await supabase
          .from('investments')
          .select('*')
          .eq('user_id', user.id);

        if (investmentsError) throw investmentsError;

        const allRows = (investmentsData as InvestmentRow[]) || [];
        const allIds = allRows.map((i) => i.id);

        // Separate: tracking_ready + active → for projections
        const trackingReadyActive = allRows
          .filter(inv =>
            inv.status === 'active' &&
            isInvestmentComplete({
              platform: inv.platform,
              projectName: inv.project_name,
              amount: inv.amount != null ? Number(inv.amount) : null,
              investmentDate: inv.investment_date,
              incomeModel: inv.income_model,
              status: inv.status,
              expectedReturn: inv.expected_return != null ? Number(inv.expected_return) : null,
              expectedEndDate: inv.expected_end_date,
            })
          )
          .map(mapInvestmentRow);

        const activeRows = allRows.filter(inv => inv.status === 'active');
        const excludedCount = activeRows.length - trackingReadyActive.length;

        if (allIds.length === 0) {
          clearTimeout(timeoutId);
          if (requestIdRef.current !== currentId) return;
          setProjectionInvestments(trackingReadyActive);
          setPayments([]);
          setExcludedIncompleteCount(excludedCount);
          setIsLoading(false);
          return;
        }

        // Fetch ALL payments for the year — no completeness filter
        const startDate = `${year}-01-01`;
        const endDate = `${year}-12-31`;

        const { data, error: paymentsError } = await supabase
          .from('payments')
          .select('id, date, amount, type, withholding_applied, investment_id')
          .in('investment_id', allIds)
          .gte('date', startDate)
          .lte('date', endDate)
          .order('date', { ascending: true });

        clearTimeout(timeoutId);
        if (requestIdRef.current !== currentId) return;
        if (paymentsError) throw paymentsError;

        setExcludedIncompleteCount(excludedCount);
        setProjectionInvestments(trackingReadyActive);
        setPayments(
          (data || []).map((p) => ({
            ...p,
            amount: Number(p.amount),
            withholding_applied: p.withholding_applied ? Number(p.withholding_applied) : null,
          }))
        );
      } catch (err) {
        clearTimeout(timeoutId);
        if (requestIdRef.current !== currentId) return;
        console.error('Error fetching data for tax summary:', err);
        setError(err instanceof Error ? err.message : 'Error al cargar datos fiscales');
      } finally {
        if (requestIdRef.current === currentId) {
          setIsLoading(false);
        }
      }
    }

    fetchData();

    return () => { ++requestIdRef.current; };
  }, [user, year]);

  // Tax summary — based on ALL real payments (no investment completeness filter)
  const summary: TaxSummary = useMemo(() => {
    const interestIncome = payments.filter((p) => p.type === 'interest').reduce((sum, p) => sum + p.amount, 0);
    const dividendIncome = payments.filter((p) => p.type === 'dividend').reduce((sum, p) => sum + p.amount, 0);
    const principalReturns = payments.filter((p) => p.type === 'principal').reduce((sum, p) => sum + p.amount, 0);
    const grossIncome = interestIncome + dividendIncome;
    const withholdingsApplied = payments.reduce((sum, p) => sum + (p.withholding_applied || 0), 0);
    const taxableBase = Math.max(0, grossIncome - totalExpenses);
    const estimatedTax = calculateProgressiveTax(taxableBase);
    const effectiveRate = calculateEffectiveRate(taxableBase, estimatedTax);
    return {
      year, grossIncome, interestIncome, dividendIncome, principalReturns,
      withholdingsApplied, deductibleExpenses: totalExpenses, taxableBase, estimatedTax, effectiveRate,
    };
  }, [payments, totalExpenses, year]);

  // Projection — based only on active + tracking_ready investments
  const projection: TaxProjection = useMemo(() => {
    const paymentsByInvestment = new Map<string, number>();
    payments.filter((p) => p.type === 'interest' || p.type === 'dividend').forEach((p) => {
      const current = paymentsByInvestment.get(p.investment_id) || 0;
      paymentsByInvestment.set(p.investment_id, current + p.amount);
    });
    return calculateYearlyProjection(projectionInvestments, paymentsByInvestment, summary.grossIncome, summary.withholdingsApplied, totalExpenses, year);
  }, [projectionInvestments, payments, summary, totalExpenses, year]);

  const [availableYears, setAvailableYears] = useState<number[]>([]);

  useEffect(() => {
    async function fetchAvailableYears() {
      if (!user) return;
      try {
        const { data: investments } = await supabase.from('investments').select('id').eq('user_id', user.id);
        const investmentIds = investments?.map((i) => i.id) || [];
        if (investmentIds.length === 0) { setAvailableYears([new Date().getFullYear()]); return; }
        const { data: paymentsData } = await supabase.from('payments').select('date').in('investment_id', investmentIds);
        const years = new Set<number>();
        years.add(new Date().getFullYear());
        paymentsData?.forEach((p) => { years.add(new Date(p.date).getFullYear()); });
        setAvailableYears(Array.from(years).sort((a, b) => b - a));
      } catch (error) {
        console.error('Error fetching available years:', error);
        setAvailableYears([new Date().getFullYear()]);
      }
    }
    fetchAvailableYears();
  }, [user]);

  return {
    summary, projection, payments, expenses, error, excludedIncompleteCount,
    isLoading: isLoading || expensesLoading, availableYears,
  };
}
