import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Investment, InvestmentSummary, Platform, InvestmentStatus, Payment, DraftInvestment, IncomeModel, PaymentFrequency, PrincipalReturnType } from '@/types/investment';
import { calculateInvestmentTotalReturn } from '@/lib/investment/calculations';
import { isInvestmentComplete, getInvestmentCompletionStatus } from '@/lib/investment/completeness';
import { generateSchedule } from '@/lib/investment/scheduleGenerator';

const FETCH_TIMEOUT_MS = 15_000;

// Internal type for raw DB rows (nullable fields)
interface RawInvestmentRow {
  id: string;
  platform: string | null;
  custom_platform_name: string | null;
  project_name: string | null;
  amount: number | null;
  investment_date: string | null;
  expected_end_date: string | null;
  expected_return: number | null;
  income_model: string | null;
  payment_frequency: string | null;
  principal_return_type: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  user_id: string;
}

export function useInvestments() {
  const { user } = useAuth();
  const [allRawInvestments, setAllRawInvestments] = useState<DraftInvestment[]>([]);
  const [scheduleCountMap, setScheduleCountMap] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const fetchInvestments = useCallback(async () => {
    if (!user) {
      setAllRawInvestments([]);
      setScheduleCountMap({});
      setIsLoading(false);
      setError(null);
      return;
    }

    const currentId = ++requestIdRef.current;

    const timeoutId = setTimeout(() => {
      if (requestIdRef.current !== currentId) return;
      setIsLoading(false);
      setError('Timeout: la carga de inversiones tardó demasiado');
      console.warn('Investment fetch timed out after 15s');
    }, FETCH_TIMEOUT_MS);

    try {
      setIsLoading(true);
      setError(null);

      const { data: investmentsData, error: investmentsError } = await supabase
        .from('investments')
        .select('*')
        .order('created_at', { ascending: false });

      if (investmentsError) throw investmentsError;

      const investmentIds = investmentsData?.map(inv => inv.id) || [];
      let paymentsData: any[] = [];

      if (investmentIds.length > 0) {
        const { data, error: paymentsError } = await supabase
          .from('payments')
          .select('*')
          .in('investment_id', investmentIds);
        if (paymentsError) throw paymentsError;
        paymentsData = data || [];
      }

      // Fetch schedule counts per investment
      let schedCounts: Record<string, number> = {};
      if (investmentIds.length > 0) {
        const { data: schedData } = await supabase
          .from('investment_schedule')
          .select('investment_id')
          .in('investment_id', investmentIds);
        if (schedData) {
          for (const row of schedData) {
            schedCounts[row.investment_id] = (schedCounts[row.investment_id] || 0) + 1;
          }
        }
      }

      clearTimeout(timeoutId);
      if (requestIdRef.current !== currentId) return;

      const mapped: DraftInvestment[] = (investmentsData as RawInvestmentRow[] || []).map(inv => ({
        id: inv.id,
        platform: (inv.platform as Platform) || undefined,
        customPlatformName: inv.custom_platform_name || undefined,
        projectName: inv.project_name || undefined,
        amount: inv.amount != null ? Number(inv.amount) : undefined,
        investmentDate: inv.investment_date || undefined,
        expectedEndDate: inv.expected_end_date || undefined,
        expectedReturn: inv.expected_return != null ? Number(inv.expected_return) : undefined,
        incomeModel: (inv.income_model as IncomeModel) || undefined,
        paymentFrequency: (inv.payment_frequency as PaymentFrequency) || undefined,
        principalReturnType: (inv.principal_return_type as PrincipalReturnType) || undefined,
        status: (inv.status as InvestmentStatus) || 'active',
        notes: inv.notes || undefined,
        createdAt: inv.created_at,
        updatedAt: inv.updated_at,
        payments: paymentsData
          .filter(p => p.investment_id === inv.id)
          .map(p => ({
            id: p.id, date: p.date, amount: Number(p.amount),
            type: p.type as 'dividend' | 'principal' | 'interest',
            notes: p.notes || undefined,
          })),
      }));

      setAllRawInvestments(mapped);
      setScheduleCountMap(schedCounts);
    } catch (err) {
      clearTimeout(timeoutId);
      if (requestIdRef.current !== currentId) return;
      console.error('Error fetching investments:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar inversiones');
    } finally {
      clearTimeout(timeoutId);
      if (requestIdRef.current === currentId) {
        setIsLoading(false);
      }
    }
  }, [user]);

  useEffect(() => {
    fetchInvestments();
    return () => { ++requestIdRef.current; };
  }, [fetchInvestments]);

  // Separate complete vs incomplete using centralized logic
  const { investments, incompleteInvestments } = useMemo(() => {
    const complete: Investment[] = [];
    const incomplete: DraftInvestment[] = [];

    for (const raw of allRawInvestments) {
      if (isInvestmentComplete({
        platform: raw.platform,
        projectName: raw.projectName,
        amount: raw.amount,
        investmentDate: raw.investmentDate,
        incomeModel: raw.incomeModel,
        status: raw.status,
      })) {
        complete.push({
          id: raw.id,
          platform: raw.platform as Platform,
          customPlatformName: raw.customPlatformName,
          projectName: raw.projectName as string,
          amount: raw.amount as number,
          investmentDate: raw.investmentDate as string,
          expectedEndDate: raw.expectedEndDate,
          expectedReturn: raw.expectedReturn ?? 0,
          incomeModel: (raw.incomeModel as IncomeModel) || 'bullet',
          paymentFrequency: raw.paymentFrequency || undefined,
          principalReturnType: raw.principalReturnType || undefined,
          status: raw.status,
          payments: raw.payments,
          notes: raw.notes,
          createdAt: raw.createdAt,
          updatedAt: raw.updatedAt,
        });
      } else {
        incomplete.push(raw);
      }
    }

    return { investments: complete, incompleteInvestments: incomplete };
  }, [allRawInvestments]);

  // Total count (complete + incomplete) for Free limit
  const allInvestmentsCount = allRawInvestments.length;
  const incompleteCount = incompleteInvestments.length;

  const saveScheduleForInvestment = useCallback(async (investmentId: string, investment: {
    amount: number;
    expectedReturn: number;
    incomeModel: IncomeModel;
    paymentFrequency?: PaymentFrequency | null;
    principalReturnType?: PrincipalReturnType | null;
    investmentDate: string;
    expectedEndDate?: string;
  }) => {
    // Delete existing schedule
    await supabase.from('investment_schedule').delete().eq('investment_id', investmentId);

    if (!investment.expectedEndDate) return;

    const entries = generateSchedule({
      id: investmentId,
      amount: investment.amount,
      expectedReturn: investment.expectedReturn,
      incomeModel: investment.incomeModel,
      paymentFrequency: investment.paymentFrequency,
      principalReturnType: investment.principalReturnType,
      investmentDate: investment.investmentDate,
      expectedEndDate: investment.expectedEndDate,
    });

    if (entries.length > 0) {
      const rows = entries.map(e => ({
        investment_id: e.investmentId,
        expected_date: e.expectedDate,
        expected_amount: e.expectedAmount,
        type: e.type,
        status: e.status || 'pending',
      }));
      await supabase.from('investment_schedule').insert(rows);
    }
  }, []);

  const addInvestment = useCallback(async (investment: Omit<Investment, 'id' | 'createdAt' | 'updatedAt' | 'payments'>): Promise<Investment | null> => {
    if (!user) return null;
    const { data, error } = await supabase.from('investments').insert({
      user_id: user.id, platform: investment.platform,
      custom_platform_name: investment.customPlatformName || null,
      project_name: investment.projectName, amount: investment.amount,
      investment_date: investment.investmentDate,
      expected_end_date: investment.expectedEndDate || null,
      expected_return: investment.expectedReturn, status: investment.status,
      income_model: investment.incomeModel || 'bullet',
      payment_frequency: investment.paymentFrequency || null,
      principal_return_type: investment.principalReturnType || 'at_maturity',
      notes: investment.notes || null,
    }).select().single();
    if (error) { console.error('Error adding investment:', error); return null; }

    // Generate schedule if needed
    await saveScheduleForInvestment(data.id, {
      amount: investment.amount,
      expectedReturn: investment.expectedReturn,
      incomeModel: investment.incomeModel,
      paymentFrequency: investment.paymentFrequency,
      principalReturnType: investment.principalReturnType,
      investmentDate: investment.investmentDate,
      expectedEndDate: investment.expectedEndDate,
    });

    const created: Investment = {
      id: data.id, platform: data.platform as Platform,
      customPlatformName: data.custom_platform_name || undefined,
      projectName: data.project_name!, amount: Number(data.amount),
      investmentDate: data.investment_date!, expectedEndDate: data.expected_end_date || undefined,
      expectedReturn: Number(data.expected_return), status: data.status as InvestmentStatus,
      incomeModel: ((data as any).income_model || 'bullet') as IncomeModel,
      paymentFrequency: (data as any).payment_frequency || undefined,
      principalReturnType: (data as any).principal_return_type || undefined,
      notes: data.notes || undefined, createdAt: data.created_at, updatedAt: data.updated_at,
      payments: [],
    };
    await fetchInvestments();
    return created;
  }, [user, fetchInvestments, saveScheduleForInvestment]);

  // Add a draft/partial investment
  const addDraftInvestment = useCallback(async (draft: {
    projectName: string;
    platform?: string | null;
    customPlatformName?: string | null;
    amount?: number | null;
    investmentDate?: string | null;
    expectedEndDate?: string | null;
    expectedReturn?: number | null;
    incomeModel?: string | null;
    paymentFrequency?: string | null;
    principalReturnType?: string | null;
    status?: string;
    notes?: string | null;
  }) => {
    if (!user) return null;
    const { data, error } = await supabase.from('investments').insert({
      user_id: user.id,
      platform: draft.platform || null,
      custom_platform_name: draft.customPlatformName || null,
      project_name: draft.projectName,
      amount: draft.amount ?? null,
      investment_date: draft.investmentDate || null,
      expected_end_date: draft.expectedEndDate || null,
      expected_return: draft.expectedReturn ?? null,
      income_model: draft.incomeModel || null,
      payment_frequency: draft.paymentFrequency || null,
      principal_return_type: draft.principalReturnType || null,
      status: draft.status || 'active',
      notes: draft.notes || null,
    }).select().single();
    if (error) { console.error('Error adding draft investment:', error); return null; }
    await fetchInvestments();
    return data;
  }, [user, fetchInvestments]);

  const updateInvestment = useCallback(async (id: string, updates: Partial<Investment>) => {
    const dbUpdates: any = {};
    if (updates.platform !== undefined) dbUpdates.platform = updates.platform || null;
    if (updates.customPlatformName !== undefined) dbUpdates.custom_platform_name = updates.customPlatformName;
    if (updates.projectName !== undefined) dbUpdates.project_name = updates.projectName || null;
    if (updates.amount !== undefined) dbUpdates.amount = updates.amount ?? null;
    if (updates.investmentDate !== undefined) dbUpdates.investment_date = updates.investmentDate || null;
    if (updates.expectedEndDate !== undefined) dbUpdates.expected_end_date = updates.expectedEndDate;
    if (updates.expectedReturn !== undefined) dbUpdates.expected_return = updates.expectedReturn ?? null;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
    if (updates.incomeModel !== undefined) dbUpdates.income_model = updates.incomeModel || null;
    if (updates.paymentFrequency !== undefined) dbUpdates.payment_frequency = updates.paymentFrequency || null;
    if (updates.principalReturnType !== undefined) dbUpdates.principal_return_type = updates.principalReturnType || null;
    const { error } = await supabase.from('investments').update(dbUpdates).eq('id', id);
    if (error) { console.error('Error updating investment:', error); return; }

    // Regenerate schedule if income model fields changed
    if (updates.incomeModel || updates.paymentFrequency || updates.expectedReturn !== undefined || updates.expectedEndDate !== undefined || updates.amount !== undefined || updates.investmentDate !== undefined || updates.principalReturnType !== undefined) {
      // Fetch the current full investment to regenerate
      const current = allRawInvestments.find(inv => inv.id === id);
      if (current) {
        const merged = {
          amount: updates.amount ?? current.amount ?? 0,
          expectedReturn: updates.expectedReturn ?? current.expectedReturn ?? 0,
          incomeModel: (updates.incomeModel ?? current.incomeModel ?? 'bullet') as IncomeModel,
          paymentFrequency: (updates.paymentFrequency ?? current.paymentFrequency) as PaymentFrequency | null,
          principalReturnType: (updates.principalReturnType ?? current.principalReturnType) as PrincipalReturnType | null,
          investmentDate: updates.investmentDate ?? current.investmentDate ?? '',
          expectedEndDate: updates.expectedEndDate ?? current.expectedEndDate,
        };
        await saveScheduleForInvestment(id, merged);
      }
    }

    await fetchInvestments();
  }, [fetchInvestments, allRawInvestments, saveScheduleForInvestment]);

  const deleteInvestment = useCallback(async (id: string) => {
    const { error } = await supabase.from('investments').delete().eq('id', id);
    if (error) { console.error('Error deleting investment:', error); return; }
    setAllRawInvestments(prev => prev.filter(inv => inv.id !== id));
  }, []);

  const addPayment = useCallback(async (investmentId: string, payment: Omit<Payment, 'id'>) => {
    const { data, error } = await supabase.from('payments').insert({
      investment_id: investmentId, date: payment.date, amount: payment.amount,
      type: payment.type, notes: payment.notes || null,
    }).select().single();
    if (error) { console.error('Error adding payment:', error); return null; }
    const newPayment: Payment = {
      id: data.id, date: data.date, amount: Number(data.amount),
      type: data.type as 'dividend' | 'principal' | 'interest', notes: data.notes || undefined,
    };
    setAllRawInvestments(prev => prev.map(inv =>
      inv.id === investmentId
        ? { ...inv, payments: [...inv.payments, newPayment], updatedAt: new Date().toISOString() }
        : inv
    ));
    return newPayment;
  }, []);

  const deletePayment = useCallback(async (investmentId: string, paymentId: string) => {
    const { error } = await supabase.from('payments').delete().eq('id', paymentId);
    if (error) { console.error('Error deleting payment:', error); return; }
    setAllRawInvestments(prev => prev.map(inv =>
      inv.id === investmentId
        ? { ...inv, payments: inv.payments.filter(p => p.id !== paymentId), updatedAt: new Date().toISOString() }
        : inv
    ));
  }, []);

  const importInvestments = useCallback(async (newInvestments: Investment[], replace: boolean = false) => {
    if (!user) return;
    if (replace) {
      const { error: deleteError } = await supabase.from('investments').delete().eq('user_id', user.id);
      if (deleteError) { console.error('Error deleting investments:', deleteError); return; }
    }
    for (const inv of newInvestments) {
      const { data, error } = await supabase.from('investments').insert({
        user_id: user.id, platform: inv.platform,
        custom_platform_name: inv.customPlatformName || null,
        project_name: inv.projectName, amount: inv.amount,
        investment_date: inv.investmentDate,
        expected_end_date: inv.expectedEndDate || null,
        expected_return: inv.expectedReturn, status: inv.status,
        income_model: inv.incomeModel || 'bullet',
        payment_frequency: inv.paymentFrequency || null,
        principal_return_type: inv.principalReturnType || 'at_maturity',
        notes: inv.notes || null,
      }).select().single();
      if (error) { console.error('Error importing investment:', error); continue; }
      if (inv.payments && inv.payments.length > 0) {
        const paymentsToInsert = inv.payments.map(p => ({
          investment_id: data.id, date: p.date, amount: p.amount, type: p.type, notes: p.notes || null,
        }));
        const { error: paymentsError } = await supabase.from('payments').insert(paymentsToInsert);
        if (paymentsError) console.error('Error importing payments:', paymentsError);
      }
    }
    fetchInvestments();
  }, [user, fetchInvestments]);

  const exportInvestments = useCallback(() => JSON.stringify(investments, null, 2), [investments]);

  const clearAllInvestments = useCallback(async () => {
    if (!user) return;
    const { error } = await supabase.from('investments').delete().eq('user_id', user.id);
    if (error) { console.error('Error clearing investments:', error); return; }
    setAllRawInvestments([]);
  }, [user]);

  const summary: InvestmentSummary = useMemo(() => {
    const activeInvestments = investments.filter(inv => inv.status === 'active');
    const forecastReady = activeInvestments.filter(inv => {
      const status = getInvestmentCompletionStatus({
        platform: inv.platform,
        projectName: inv.projectName,
        amount: inv.amount,
        investmentDate: inv.investmentDate,
        expectedReturn: inv.expectedReturn,
        expectedEndDate: inv.expectedEndDate,
        incomeModel: inv.incomeModel,
        paymentFrequency: inv.paymentFrequency,
        hasSchedule: (scheduleCountMap[inv.id] || 0) > 0,
        status: inv.status,
      });
      return status.isForecastReady;
    });

    const activeCapital = activeInvestments.reduce((s, i) => s + i.amount, 0);
    const expectedProfit = forecastReady.reduce((s, i) => s + calculateInvestmentTotalReturn(i), 0);
    const estimatedTotal = forecastReady.reduce((s, i) => s + i.amount, 0) + expectedProfit;

    const totalCollected = investments.reduce((s, i) => s + i.payments.reduce((ps, p) => ps + p.amount, 0), 0);
    const realizedProfit = investments.reduce((s, i) => s + i.payments
      .filter(p => p.type === 'dividend' || p.type === 'interest')
      .reduce((ps, p) => ps + p.amount, 0), 0);

    return {
      totalInvested: investments.reduce((sum, inv) => sum + inv.amount, 0),
      totalReturns: totalCollected,
      expectedReturns: forecastReady.reduce((sum, inv) => sum + calculateInvestmentTotalReturn(inv), 0),
      activeInvestments: activeInvestments.length,
      completedInvestments: investments.filter(inv => inv.status === 'completed').length,
      averageReturn: forecastReady.length > 0 ? forecastReady.reduce((sum, inv) => sum + inv.expectedReturn, 0) / forecastReady.length : 0,
      byPlatform: investments.reduce((acc, inv) => {
        if (!acc[inv.platform]) acc[inv.platform] = { invested: 0, returns: 0, count: 0 };
        acc[inv.platform].invested += inv.amount;
        acc[inv.platform].returns += inv.payments.reduce((sum, p) => sum + p.amount, 0);
        acc[inv.platform].count += 1;
        return acc;
      }, {} as Record<Platform, { invested: number; returns: number; count: number }>),
      byStatus: investments.reduce((acc, inv) => {
        acc[inv.status] = (acc[inv.status] || 0) + 1;
        return acc;
      }, {} as Record<InvestmentStatus, number>),
      activeSummary: {
        capital: activeCapital,
        estimatedTotal,
        expectedProfit,
        count: activeInvestments.length,
        withEndDateCount: forecastReady.length,
      },
      historicalSummary: {
        totalInvested: investments.reduce((sum, inv) => sum + inv.amount, 0),
        totalCollected,
        realizedProfit,
        completedCount: investments.filter(inv => inv.status === 'completed').length,
      },
    };
  }, [investments, scheduleCountMap]);

  return {
    investments, incompleteInvestments, incompleteCount, allInvestmentsCount,
    isLoading, error, summary,
    addInvestment, addDraftInvestment, updateInvestment, deleteInvestment,
    addPayment, deletePayment, importInvestments,
    exportInvestments, clearAllInvestments, refetch: fetchInvestments,
  };
}
