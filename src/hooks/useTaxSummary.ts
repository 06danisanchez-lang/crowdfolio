import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { TaxSummary } from '@/types/tax';
import { calculateProgressiveTax, calculateEffectiveRate } from '@/lib/tax/calculations';
import { useTaxExpenses } from './useTaxExpenses';

interface PaymentWithInvestment {
  id: string;
  date: string;
  amount: number;
  type: string;
  withholding_applied: number | null;
  investment_id: string;
}

export function useTaxSummary(year: number) {
  const { user } = useAuth();
  const [payments, setPayments] = useState<PaymentWithInvestment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { expenses, totalExpenses, isLoading: expensesLoading } = useTaxExpenses(year);

  useEffect(() => {
    async function fetchPayments() {
      if (!user) {
        setPayments([]);
        setIsLoading(false);
        return;
      }

      try {
        // First get user's investment IDs
        const { data: investments, error: investmentsError } = await supabase
          .from('investments')
          .select('id')
          .eq('user_id', user.id);

        if (investmentsError) throw investmentsError;

        const investmentIds = investments?.map((i) => i.id) || [];

        if (investmentIds.length === 0) {
          setPayments([]);
          setIsLoading(false);
          return;
        }

        // Get payments for user's investments in the specified year
        const startDate = `${year}-01-01`;
        const endDate = `${year}-12-31`;

        const { data, error } = await supabase
          .from('payments')
          .select('id, date, amount, type, withholding_applied, investment_id')
          .in('investment_id', investmentIds)
          .gte('date', startDate)
          .lte('date', endDate)
          .order('date', { ascending: true });

        if (error) throw error;

        setPayments(
          (data || []).map((p) => ({
            ...p,
            amount: Number(p.amount),
            withholding_applied: p.withholding_applied ? Number(p.withholding_applied) : null,
          }))
        );
      } catch (error) {
        console.error('Error fetching payments for tax summary:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchPayments();
  }, [user, year]);

  const summary: TaxSummary = useMemo(() => {
    // Calculate income by type
    const interestIncome = payments
      .filter((p) => p.type === 'interest')
      .reduce((sum, p) => sum + p.amount, 0);

    const dividendIncome = payments
      .filter((p) => p.type === 'dividend')
      .reduce((sum, p) => sum + p.amount, 0);

    const principalReturns = payments
      .filter((p) => p.type === 'principal')
      .reduce((sum, p) => sum + p.amount, 0);

    // Gross income (interest + dividends, principal returns don't count until gain/loss)
    const grossIncome = interestIncome + dividendIncome;

    // Total withholdings already applied
    const withholdingsApplied = payments.reduce(
      (sum, p) => sum + (p.withholding_applied || 0),
      0
    );

    // Taxable base (gross income - deductible expenses)
    const taxableBase = Math.max(0, grossIncome - totalExpenses);

    // Calculate estimated tax
    const estimatedTax = calculateProgressiveTax(taxableBase);

    // Effective rate
    const effectiveRate = calculateEffectiveRate(taxableBase, estimatedTax);

    return {
      year,
      grossIncome,
      interestIncome,
      dividendIncome,
      principalReturns,
      withholdingsApplied,
      deductibleExpenses: totalExpenses,
      taxableBase,
      estimatedTax,
      effectiveRate,
    };
  }, [payments, totalExpenses, year]);

  // Get available years from payments
  const [availableYears, setAvailableYears] = useState<number[]>([]);

  useEffect(() => {
    async function fetchAvailableYears() {
      if (!user) return;

      try {
        const { data: investments } = await supabase
          .from('investments')
          .select('id')
          .eq('user_id', user.id);

        const investmentIds = investments?.map((i) => i.id) || [];

        if (investmentIds.length === 0) {
          setAvailableYears([new Date().getFullYear()]);
          return;
        }

        const { data: paymentsData } = await supabase
          .from('payments')
          .select('date')
          .in('investment_id', investmentIds);

        const years = new Set<number>();
        years.add(new Date().getFullYear()); // Always include current year

        paymentsData?.forEach((p) => {
          const paymentYear = new Date(p.date).getFullYear();
          years.add(paymentYear);
        });

        setAvailableYears(Array.from(years).sort((a, b) => b - a));
      } catch (error) {
        console.error('Error fetching available years:', error);
        setAvailableYears([new Date().getFullYear()]);
      }
    }

    fetchAvailableYears();
  }, [user]);

  return {
    summary,
    payments,
    expenses,
    isLoading: isLoading || expensesLoading,
    availableYears,
  };
}
