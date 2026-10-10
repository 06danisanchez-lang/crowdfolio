import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { TaxSummary, EnrichedPayment } from '@/types/tax';
import { Investment, InvestmentScheduleEntry, Payment } from '@/types/investment';
import { calculateProgressiveTax, calculateEffectiveRate } from '@/lib/tax/calculations';
import { calculateYearlyProjection, TaxProjection } from '@/lib/tax/projections';
import { useTaxExpenses } from './useTaxExpenses';
import { isInvestmentComplete } from '@/lib/investment/completeness';
import { computeDefaultLossSummary } from '@/lib/tax/defaultLossSummary';
import { getPlatformLabel } from '@/lib/labels';
import { computeManualGppOperations } from '@/lib/tax/manualGppOperations';
import { findIncomeWithoutWithholding } from '@/lib/tax/withholding';
import { mapFxColumns } from '@/lib/investment/mapInvestmentRow';
import { computeExchangeDifferences, summarizeForeignIncome } from '@/lib/currency/fx';
import type { ManualGppOperation } from '@/lib/tax/manualGppOperations';

const FETCH_TIMEOUT_MS = 15_000;

interface PaymentWithInvestment {
  id: string;
  date: string;
  amount: number;
  type: string;
  withholding_applied: number | null;
  investment_id: string;
  original_amount: number | null;
  exchange_rate: number | null;
  foreign_withholding_amount: number | null;
  foreign_withholding_currency: string | null;
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
  actual_end_date: string | null;
  close_reason: string | null;
  loss_insolvency_status: string | null;
  loss_insolvency_concluded_date: string | null;
  loss_quita_amount: number | null;
  loss_quita_date: string | null;
  loss_enforcement_started: boolean | null;
  loss_enforcement_date: string | null;
  loss_enforcement_initiator: string | null;
  loss_assessed_at: string | null;
  loss_rules_version: number | null;
  currency?: string | null;
  original_amount?: number | null;
  exchange_rate?: number | null;
  exchange_rate_date?: string | null;
  exchange_rate_source?: string | null;
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
    defaultedAt: inv.defaulted_at || undefined,
    amountRecovered: inv.amount_recovered != null ? Number(inv.amount_recovered) : undefined,
    equityType: (inv.equity_type || undefined) as Investment['equityType'],
    actualEndDate: inv.actual_end_date,
    closeReason: (inv.close_reason as Investment['closeReason']) ?? null,
    lossInsolvencyStatus: (inv.loss_insolvency_status as Investment['lossInsolvencyStatus']) ?? null,
    lossInsolvencyConcludedDate: inv.loss_insolvency_concluded_date,
    lossQuitaAmount: inv.loss_quita_amount != null ? Number(inv.loss_quita_amount) : null,
    lossQuitaDate: inv.loss_quita_date,
    lossEnforcementStarted: inv.loss_enforcement_started,
    lossEnforcementDate: inv.loss_enforcement_date,
    lossEnforcementInitiator: inv.loss_enforcement_initiator as Investment['lossEnforcementInitiator'],
    lossAssessedAt: inv.loss_assessed_at,
    lossRulesVersion: inv.loss_rules_version,
    ...mapFxColumns(inv),
    createdAt: inv.created_at,
    updatedAt: inv.updated_at,
  };
}

export function useTaxSummary(year: number) {
  const { user } = useAuth();
  const [payments, setPayments] = useState<PaymentWithInvestment[]>([]);
  const [projectionInvestments, setProjectionInvestments] = useState<Investment[]>([]);
  // Calendario de cobros de las periódicas activas: la proyección suma sus cuotas futuras.
  const [projectionSchedules, setProjectionSchedules] = useState<Record<string, InvestmentScheduleEntry[]>>({});
  const [investmentRows, setInvestmentRows] = useState<InvestmentRow[]>([]);
  // Pagos 'principal' de inversiones defaulted, histórico completo (sin acotar por año
  // ni por el ejercicio fiscal seleccionado) — necesario para calcular cuánto capital
  // se ha devuelto en total, no solo lo cobrado en el año en curso. Ver getPrincipalReturned.
  const [defaultedPrincipalPayments, setDefaultedPrincipalPayments] = useState<Record<string, { type: string; amount: number; date: string }[]>>({});
  // Histórico completo de pagos de inversiones equity completadas: el valor de
  // adquisición de un cierre depende de la prima de emisión devuelta en años
  // anteriores. Ver computeManualGppOperations.
  const [completedEquityPayments, setCompletedEquityPayments] = useState<Record<string, { type: string; amount: number; date: string }[]>>({});
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
        setDefaultedPrincipalPayments({});
        setCompletedEquityPayments({});
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
              // Sin la frecuencia, toda periódica/amortizable salía "incompleta" y se quedaba
              // fuera de la proyección (y contaba en el aviso de pendientes de completar).
              paymentFrequency: inv.payment_frequency,
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
            platform: getPlatformLabel(inv.platform, inv.custom_platform_name || undefined),
            equityType: inv.equity_type || undefined,
          }])
        );

        if (allIds.length === 0) {
          clearTimeout(timeoutId);
          if (requestIdRef.current !== currentId) return;
          setProjectionInvestments(trackingReadyActive);
          setProjectionSchedules({});
          setInvestmentRows(allRows);
          setPayments([]);
          setEnrichedPayments([]);
          setDefaultedPrincipalPayments({});
          setCompletedEquityPayments({});
          setExcludedIncompleteCount(excludedCount);
          setIsLoading(false);
          return;
        }

        // Pagos 'principal' de inversiones defaulted — histórico completo, sin
        // acotar por año, para poder sumar todo el capital devuelto (getPrincipalReturned).
        const defaultedIds = allRows.filter(r => r.status === 'defaulted').map(r => r.id);
        const defaultedPrincipalMap: Record<string, { type: string; amount: number; date: string }[]> = {};
        if (defaultedIds.length > 0) {
          const { data: principalData, error: principalError } = await supabase
            .from('payments')
            .select('investment_id, amount, date, type')
            .in('investment_id', defaultedIds)
            .eq('type', 'principal');

          if (principalError) throw principalError;

          for (const p of principalData || []) {
            const list = defaultedPrincipalMap[p.investment_id] ?? (defaultedPrincipalMap[p.investment_id] = []);
            list.push({ type: p.type, amount: Number(p.amount), date: p.date });
          }
        }

        const completedEquityIds = allRows
          .filter(r => r.status === 'completed' && r.income_model === 'equity')
          .map(r => r.id);
        const completedEquityMap: Record<string, { type: string; amount: number; date: string }[]> = {};
        if (completedEquityIds.length > 0) {
          const { data: equityData, error: equityError } = await supabase
            .from('payments')
            .select('investment_id, amount, date, type')
            .in('investment_id', completedEquityIds);

          if (equityError) throw equityError;

          for (const p of equityData || []) {
            const list = completedEquityMap[p.investment_id] ?? (completedEquityMap[p.investment_id] = []);
            list.push({ type: p.type, amount: Number(p.amount), date: p.date });
          }
        }

        // Calendario de cobros de las periódicas y amortizables activas (proyección de fin de año).
        // investment_schedule no tiene user_id: se acota por las inversiones del usuario.
        const periodicIds = trackingReadyActive
          .filter(i => i.incomeModel === 'periodic_fixed' || i.incomeModel === 'amortizing')
          .map(i => i.id);
        const scheduleMap: Record<string, InvestmentScheduleEntry[]> = {};
        if (periodicIds.length > 0) {
          const { data: schedData, error: schedError } = await supabase
            .from('investment_schedule')
            .select('investment_id, expected_date, expected_amount, type')
            .in('investment_id', periodicIds);
          if (schedError) throw schedError;
          for (const row of schedData || []) {
            const list = scheduleMap[row.investment_id] ?? (scheduleMap[row.investment_id] = []);
            list.push({
              investmentId: row.investment_id,
              expectedDate: row.expected_date,
              expectedAmount: Number(row.expected_amount),
              type: row.type as InvestmentScheduleEntry['type'],
            });
          }
        }

        // Fetch ALL payments for the year — no completeness filter
        const startDate = `${year}-01-01`;
        const endDate = `${year}-12-31`;

        const { data, error: paymentsError } = await supabase
          .from('payments')
          .select('id, date, amount, type, withholding_applied, investment_id, original_amount, exchange_rate, foreign_withholding_amount, foreign_withholding_currency')
          .in('investment_id', allIds)
          .gte('date', startDate)
          .lte('date', endDate)
          .order('date', { ascending: true });

        clearTimeout(timeoutId);
        if (requestIdRef.current !== currentId) return;
        if (paymentsError) throw paymentsError;

        const num = (v: unknown) => (v != null ? Number(v) : null);
        const rawPayments: PaymentWithInvestment[] = (data || []).map((p) => ({
          ...p,
          amount: Number(p.amount),
          withholding_applied: p.withholding_applied ? Number(p.withholding_applied) : null,
          original_amount: num(p.original_amount),
          exchange_rate: num(p.exchange_rate),
          foreign_withholding_amount: num(p.foreign_withholding_amount),
          foreign_withholding_currency: p.foreign_withholding_currency ?? null,
        }));

        setExcludedIncompleteCount(excludedCount);
        setProjectionInvestments(trackingReadyActive);
        setProjectionSchedules(scheduleMap);
        setInvestmentRows(allRows);
        setDefaultedPrincipalPayments(defaultedPrincipalMap);
        setCompletedEquityPayments(completedEquityMap);
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
        const pgErr = err as { message?: string; details?: string } | null;
        const msg = err instanceof Error ? err.message : pgErr?.message || pgErr?.details || JSON.stringify(err);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, year, retryCount]);

  // Pérdidas por impago (Fase 5) — calificación fiscal real vía assessDefaultLoss
  // (art. 14.2.k LIRPF), agregada por ejercicio. Función pura en
  // defaultLossSummary.ts; aquí solo se construyen los Investment[] completos
  // (con loss_* y el histórico de pagos 'principal') que necesita.
  const defaultLossSummary = useMemo(() => {
    const defaultedInvestments: Investment[] = investmentRows
      .filter((inv) => inv.status === 'defaulted')
      .map((inv) => {
        const payments: Payment[] = (defaultedPrincipalPayments[inv.id] ?? []).map((p, i) => ({
          id: `${inv.id}-${i}`,
          date: p.date,
          amount: p.amount,
          type: p.type as Payment['type'],
        }));
        return { ...mapInvestmentRow(inv), payments };
      });
    return computeDefaultLossSummary(defaultedInvestments, year);
  }, [investmentRows, defaultedPrincipalPayments, year]);

  // Cierres equity con ganancia/pérdida patrimonial a declarar manualmente
  // (liquidación, venta o pérdida). No entran en el cálculo de la cuota.
  const manualGppOperations = useMemo(() => {
    const equityInvestments: Investment[] = investmentRows
      .filter((inv) => inv.status === 'completed' && inv.income_model === 'equity')
      .map((inv) => ({
        ...mapInvestmentRow(inv),
        payments: (completedEquityPayments[inv.id] ?? []).map((p, i) => ({
          id: `${inv.id}-${i}`,
          date: p.date,
          amount: p.amount,
          type: p.type as Payment['type'],
        })),
      }));
    const equityOps = computeManualGppOperations(
      equityInvestments,
      year,
      (inv) => getPlatformLabel(inv.platform, inv.customPlatformName),
    );

    // Diferencias de cambio al recuperar capital de préstamos en otra divisa
    // (lib/currency/fx.ts). Solo con los cobros 'principal' del ejercicio.
    const foreignLoans: Investment[] = investmentRows
      .filter(inv => inv.currency && inv.currency !== 'EUR' && inv.income_model !== 'equity')
      .map(inv => ({
        ...mapInvestmentRow(inv),
        payments: payments
          .filter(p => p.investment_id === inv.id && p.type === 'principal')
          .map(p => ({
            id: p.id, date: p.date, amount: p.amount, type: 'principal' as const,
            originalAmount: p.original_amount ?? undefined,
            exchangeRate: p.exchange_rate ?? undefined,
          })),
      }));
    const exchangeOps: ManualGppOperation[] = computeExchangeDifferences(foreignLoans, year).map(d => {
      const inv = foreignLoans.find(i => i.id === d.investmentId)!;
      return {
        investmentId: d.investmentId,
        projectName: `${d.projectName} (${d.originalAmount.toLocaleString('es-ES', { minimumFractionDigits: 2 })} ${d.currency})`,
        platformLabel: getPlatformLabel(inv.platform, inv.customPlatformName),
        acquisitionDate: inv.investmentDate,
        acquisitionValue: d.acquisitionValue,
        transmissionDate: d.paymentDate,
        transmissionValue: d.transmissionValue,
        result: d.result,
        reason: 'exchange',
      };
    });

    return [...equityOps, ...exchangeOps].sort((a, b) => a.transmissionDate.localeCompare(b.transmissionDate));
  }, [investmentRows, completedEquityPayments, payments, year]);

  // Inversiones en impago sin cuestionario de calificación fiscal completar
  // (Fase 4, punto 3) — alimenta el aviso accionable ("Completar") de
  // TaxDashboard.tsx. defaultLossSummary.notAssessed (Fase 5) calcula la
  // misma lista vía assessDefaultLoss para el listado informativo dentro de
  // "Base imponible general"; se mantienen separados porque cada uno filtra
  // sobre una fuente distinta (esta, directamente sobre investmentRows).
  const notAssessedDefaultedInvestments = useMemo(() => {
    return investmentRows
      .filter(inv => inv.status === 'defaulted' && inv.income_model !== 'equity' && !inv.loss_assessed_at)
      .map(inv => ({ investmentId: inv.id, projectName: inv.project_name }));
  }, [investmentRows]);

  // Tax summary — RCM + pérdidas de cartera por impago (sin efecto en cuota, Fase 1)
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
      platform: getPlatformLabel(r.platform, r.custom_platform_name || undefined),
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

    // Las pérdidas por impago (art. 14.2.k LIRPF) se declaran en la base
    // imponible GENERAL, no en la del ahorro — nunca se compensan con RCM ni
    // afectan a baseImponibleRCMAjustada/taxableBase. Ver defaultLossSummary.ts
    // y TaxBucketsCard.tsx (bloque "Base imponible general", Fase 5).
    const baseImponibleRCMAjustada = grossIncome;
    const currencyByInvestment = new Map(investmentRows.map(r => [r.id, r.currency]));

    const taxableBase = Math.max(0, baseImponibleRCMAjustada - totalExpenses);
    const estimatedTax = calculateProgressiveTax(taxableBase);
    const effectiveRate = calculateEffectiveRate(taxableBase, estimatedTax);

    return {
      year, grossIncome, interestIncome, dividendIncome, principalReturns,
      withholdingsApplied, deductibleExpenses: totalExpenses,
      baseImponibleRCMAjustada,
      taxableBase, estimatedTax, effectiveRate,
      liquidacionSinRetencion,
      incomeWithoutWithholding: findIncomeWithoutWithholding(
        taxablePayments,
        new Map(investmentRows.map(r => [r.id, r.platform as Investment['platform']])),
      ),
      foreignIncome: summarizeForeignIncome(
        taxablePayments.map(p => ({
          investmentId: p.investment_id,
          type: p.type as Payment['type'],
          amount: p.amount,
          originalAmount: p.original_amount ?? undefined,
          exchangeRate: p.exchange_rate ?? undefined,
          foreignWithholdingAmount: p.foreign_withholding_amount ?? undefined,
          foreignWithholdingCurrency: p.foreign_withholding_currency ?? undefined,
        })),
        p => currencyByInvestment.get((p as unknown as { investmentId: string }).investmentId),
      ),
    };
  }, [payments, totalExpenses, year, investmentRows]);

  // Projection — based only on active + tracking_ready investments
  const projection: TaxProjection = useMemo(() => {
    const paymentsByInvestment = new Map<string, number>();
    payments.filter((p) => p.type === 'interest' || p.type === 'dividend').forEach((p) => {
      const current = paymentsByInvestment.get(p.investment_id) || 0;
      paymentsByInvestment.set(p.investment_id, current + p.amount);
    });
    return calculateYearlyProjection(projectionInvestments, paymentsByInvestment, summary.grossIncome, summary.withholdingsApplied, totalExpenses, year, { scheduleByInvestment: projectionSchedules });
  }, [projectionInvestments, projectionSchedules, payments, summary, totalExpenses, year]);

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
    defaultLossSummary,
    manualGppOperations,
    notAssessedDefaultedInvestments,
    error, excludedIncompleteCount,
    isLoading: isLoading || expensesLoading, availableYears,
    refetch: () => setRetryCount(c => c + 1),
  };
}
