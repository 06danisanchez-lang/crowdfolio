import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { TaxSummary, EnrichedPayment, DefaultedInvestmentLoss } from '@/types/tax';
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
  defaulted_at: string | null;
  amount_recovered: number | null;
  equity_type: string | null;
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
  const [investmentRows, setInvestmentRows] = useState<InvestmentRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [excludedIncompleteCount, setExcludedIncompleteCount] = useState(0);
  const [enrichedPayments, setEnrichedPayments] = useState<EnrichedPayment[]>([]);
  const [retryCount, setRetryCount] = useState(0);
  const requestIdRef = useRef(0);
  const { expenses, totalExpenses, isLoading: expensesLoading } = useTaxExpenses(year);

  useEffect(() => {
    const currentId = ++requestIdRef.current;

    async function fetchData() {
      if (!user) {
        setPayments([]);
        setProjectionInvestments([]);
        setInvestmentRows([]);
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

        // Map investment id → display name + platform + equityType
        const investmentMeta = new Map(
          allRows.map(inv => [inv.id, {
            name: inv.project_name,
            platform: inv.platform === 'custom' ? (inv.custom_platform_name || 'Personalizada') : inv.platform,
            equityType: inv.equity_type || undefined,
          }])
        );

        if (allIds.length === 0) {
          clearTimeout(timeoutId);
          if (requestIdRef.current !== currentId) return;
          setProjectionInvestments(trackingReadyActive);
          setInvestmentRows(allRows);
          setPayments([]);
          setEnrichedPayments([]);
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

        const rawPayments = (data || []).map((p) => ({
          ...p,
          amount: Number(p.amount),
          withholding_applied: p.withholding_applied ? Number(p.withholding_applied) : null,
        }));

        setExcludedIncompleteCount(excludedCount);
        setProjectionInvestments(trackingReadyActive);
        setInvestmentRows(allRows);
        setPayments(rawPayments);
        setEnrichedPayments(
          rawPayments.map((p) => ({
            id: p.id,
            date: p.date,
            amount: p.amount,
            type: p.type,
            withholdingApplied: p.withholding_applied ?? 0,
            investmentId: p.investment_id,
            investmentName: investmentMeta.get(p.investment_id)?.name ?? 'Inversión desconocida',
            platform: investmentMeta.get(p.investment_id)?.platform ?? '-',
            equityType: investmentMeta.get(p.investment_id)?.equityType,
          }))
        );
      } catch (err) {
        clearTimeout(timeoutId);
        if (requestIdRef.current !== currentId) return;
        console.error('Error fetching data for tax summary:', err);
        const msg = err instanceof Error ? err.message : (err as any)?.message || (err as any)?.details || JSON.stringify(err);
        setError(msg || 'Error al cargar datos fiscales');
      } finally {
        if (requestIdRef.current === currentId) {
          setIsLoading(false);
        }
      }
    }

    fetchData();

    // eslint-disable-next-line react-hooks/exhaustive-deps
    return () => { ++requestIdRef.current; };
  }, [user, year, retryCount]);

  // GPP — inversiones en default que cumplen el requisito de 6 meses (art. 14.2.k LIRPF)
  const defaultedInvestmentsWithLoss: DefaultedInvestmentLoss[] = useMemo(() => {
    const yearEnd = new Date(`${year}-12-31`);
    return investmentRows
      .filter(inv => {
        if (inv.status !== 'defaulted' || !inv.expected_end_date) return false;
        const cutoff = new Date(inv.expected_end_date);
        cutoff.setMonth(cutoff.getMonth() + 6);
        return cutoff <= yearEnd;
      })
      .map(inv => {
        const amountInvested = Number(inv.amount);
        const amountRecovered = inv.amount_recovered != null ? Number(inv.amount_recovered) : 0;
        return {
          investmentId: inv.id,
          projectName: inv.project_name,
          platform: inv.platform,
          amountInvested,
          amountRecovered,
          loss: amountRecovered - amountInvested,
          defaultedAt: inv.defaulted_at || undefined,
          expectedEndDate: inv.expected_end_date || undefined,
          qualifiesForDeduction: true,
        };
      });
  }, [investmentRows, year]);

  // Tax summary — RCM + GPP + compensación (límite 25%, Ley 7/2024)
  const summary: TaxSummary = useMemo(() => {
    // capital_return (prima de emisión equity rentas) no tributa — excluir de todos los cálculos fiscales
    const taxablePayments = payments.filter(p => p.type !== 'capital_return');

    const interestIncome = taxablePayments.filter((p) => p.type === 'interest').reduce((sum, p) => sum + p.amount, 0);
    const dividendIncome = taxablePayments.filter((p) => p.type === 'dividend').reduce((sum, p) => sum + p.amount, 0);
    const principalReturns = taxablePayments.filter((p) => p.type === 'principal').reduce((sum, p) => sum + p.amount, 0);
    const grossIncome = interestIncome + dividendIncome;
    const withholdingsApplied = taxablePayments.reduce((sum, p) => sum + (p.withholding_applied || 0), 0);

    // Equity liquidacion sin retención — debe declararse manualmente
    const equityTypeMap = new Map(investmentRows.map(r => [r.id, r.equity_type]));
    const invNameMap = new Map(investmentRows.map(r => [r.id, {
      name: r.project_name,
      platform: r.platform === 'custom' ? (r.custom_platform_name || 'Personalizada') : r.platform,
    }]));
    const liquidacionSinRetencion: EnrichedPayment[] = taxablePayments
      .filter(p =>
        p.type === 'dividend' &&
        equityTypeMap.get(p.investment_id) === 'liquidacion' &&
        (!p.withholding_applied || p.withholding_applied === 0)
      )
      .map(p => ({
        id: p.id,
        date: p.date,
        amount: p.amount,
        type: p.type,
        withholdingApplied: p.withholding_applied ?? 0,
        investmentId: p.investment_id,
        investmentName: invNameMap.get(p.investment_id)?.name ?? 'Inversión desconocida',
        platform: invNameMap.get(p.investment_id)?.platform ?? '-',
        equityType: 'liquidacion',
      }));

    // GPP totals
    const totalGPPLosses = defaultedInvestmentsWithLoss.reduce((sum, d) => sum + d.loss, 0);

    // Compensación cruzada GPP ↔ RCM: máx. 25% del RCM bruto (Ley 7/2024)
    let compensacionGPPRCM = 0;
    if (totalGPPLosses < 0 && grossIncome > 0) {
      compensacionGPPRCM = Math.min(Math.abs(totalGPPLosses), grossIncome * 0.25);
    }
    const perdidasGPPPendientes = Math.max(0, Math.abs(totalGPPLosses) - compensacionGPPRCM);
    const baseImponibleRCMAjustada = Math.max(0, grossIncome - compensacionGPPRCM);

    const taxableBase = Math.max(0, baseImponibleRCMAjustada - totalExpenses);
    const estimatedTax = calculateProgressiveTax(taxableBase);
    const effectiveRate = calculateEffectiveRate(taxableBase, estimatedTax);

    return {
      year, grossIncome, interestIncome, dividendIncome, principalReturns,
      withholdingsApplied, deductibleExpenses: totalExpenses,
      totalGPPLosses, compensacionGPPRCM, perdidasGPPPendientes, baseImponibleRCMAjustada,
      taxableBase, estimatedTax, effectiveRate,
      liquidacionSinRetencion,
    };
  }, [payments, totalExpenses, year, defaultedInvestmentsWithLoss, investmentRows]);

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
    summary, projection, payments, enrichedPayments, expenses,
    defaultedInvestmentsWithLoss,
    error, excludedIncompleteCount,
    isLoading: isLoading || expensesLoading, availableYears,
    refetch: () => setRetryCount(c => c + 1),
  };
}
