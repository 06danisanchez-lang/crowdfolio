import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Investment, InvestmentSummary, Platform, InvestmentStatus, Payment, DraftInvestment, IncomeModel, PaymentFrequency, PrincipalReturnType, EquityType, InvestmentScheduleEntry, PaymentType } from '@/types/investment';
import { calculateInvestmentTotalReturn, calculateExpectedReturnFromSchedule, calculateAccruedReturn, calculateRemainingReturn, getEffectiveTAE } from '@/lib/investment/calculations';
import { isInvestmentComplete, getInvestmentCompletionStatus } from '@/lib/investment/completeness';
import { generateSchedule } from '@/lib/investment/scheduleGenerator';
import { isBlockedDefaultedTransition, isBlockedIncomeModelChange } from '@/lib/investment/defaultTransitionGuard';
import { toDateOnlyString } from '@/lib/dateOnly';
import { RawInvestmentRow, mapRawInvestmentRow, draftToInvestment } from '@/lib/investment/mapInvestmentRow';

const FETCH_TIMEOUT_MS = 15_000;

export function useInvestments() {
  const { user } = useAuth();
  const [allRawInvestments, setAllRawInvestments] = useState<DraftInvestment[]>([]);
  const [scheduleMap, setScheduleMap] = useState<Record<string, InvestmentScheduleEntry[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const hasLoadedRef = useRef(false);

  const fetchInvestments = useCallback(async () => {
    if (!user) {
      setAllRawInvestments([]);
      setScheduleMap({});
      setIsLoading(false);
      setError(null);
      hasLoadedRef.current = false;
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
      // Only show loading spinner on first fetch; subsequent refetches (e.g. after
      // token refresh) update data silently so open modals are not unmounted.
      if (!hasLoadedRef.current) {
        setIsLoading(true);
      }
      setError(null);

      const { data: investmentsData, error: investmentsError } = await supabase
        .from('investments')
        .select('*')
        .order('created_at', { ascending: false });

      if (investmentsError) throw investmentsError;

      const investmentIds = investmentsData?.map(inv => inv.id) || [];
      let paymentsData: Record<string, unknown>[] = [];

      if (investmentIds.length > 0) {
        const { data, error: paymentsError } = await supabase
          .from('payments')
          .select('*')
          .in('investment_id', investmentIds);
        if (paymentsError) throw paymentsError;
        paymentsData = data || [];
      }

      // Fetch full schedule data per investment
      const schedMap: Record<string, InvestmentScheduleEntry[]> = {};
      if (investmentIds.length > 0) {
        const { data: schedData } = await supabase
          .from('investment_schedule')
          .select('*')
          .in('investment_id', investmentIds);
        if (schedData) {
          for (const row of schedData) {
            const entry: InvestmentScheduleEntry = {
              id: row.id,
              investmentId: row.investment_id,
              expectedDate: row.expected_date,
              expectedAmount: Number(row.expected_amount),
              type: row.type as 'interest' | 'principal' | 'mixed',
              status: (row.status as 'pending' | 'matched' | 'missed' | 'skipped') || 'pending',
              matchedPaymentId: row.matched_payment_id || null,
            };
            if (!schedMap[row.investment_id]) schedMap[row.investment_id] = [];
            schedMap[row.investment_id].push(entry);
          }
        }
      }

      clearTimeout(timeoutId);
      if (requestIdRef.current !== currentId) return;

      // Auto-transition: active + past expectedEndDate → pending (skip [DISPUTA] notes)
      const todayStr = toDateOnlyString(new Date());
      const autoPendingIds = new Set<string>(
        (investmentsData as RawInvestmentRow[])
          .filter(inv =>
            inv.status === 'active' &&
            inv.expected_end_date != null &&
            inv.expected_end_date < todayStr &&
            !(inv.notes ?? '').includes('[DISPUTA]')
          )
          .map(inv => inv.id)
      );
      if (autoPendingIds.size > 0) {
        await supabase.from('investments').update({ status: 'pending' }).in('id', [...autoPendingIds]);
      }

      const mapped: DraftInvestment[] = (investmentsData as RawInvestmentRow[] || []).map(inv =>
        mapRawInvestmentRow(
          inv,
          paymentsData
            .filter(p => p.investment_id === inv.id)
            .map(p => ({
              id: p.id as string, date: p.date as string, amount: Number(p.amount),
              type: p.type as PaymentType,
              notes: (p.notes as string) || undefined,
            })),
          autoPendingIds.has(inv.id) ? 'pending' : undefined,
        )
      );

      setAllRawInvestments(mapped);
      setScheduleMap(schedMap);
      hasLoadedRef.current = true;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return () => { ++requestIdRef.current; };
  }, [fetchInvestments]);

  // ── 5A: Ternary separation — incomplete / active / completed ──
  const { investments, activeInvestments, completedInvestments, incompleteInvestments } = useMemo(() => {
    const active: Investment[] = [];
    const completed: Investment[] = [];
    const incomplete: DraftInvestment[] = [];

    for (const raw of allRawInvestments) {
      const trackingReady = isInvestmentComplete({
        platform: raw.platform,
        projectName: raw.projectName,
        amount: raw.amount,
        investmentDate: raw.investmentDate,
        expectedReturn: raw.expectedReturn,
        expectedEndDate: raw.expectedEndDate,
        incomeModel: raw.incomeModel,
        paymentFrequency: raw.paymentFrequency,
        hasSchedule: (scheduleMap[raw.id]?.length ?? 0) > 0,
        status: raw.status,
      });

      if (!trackingReady || raw.status === 'draft') {
        incomplete.push(raw);
      } else {
        // tracking_ready — safe to cast required fields
        const inv: Investment = draftToInvestment(raw);

        if (raw.status === 'completed' || raw.status === 'pending') {
          completed.push(inv);
        } else {
          active.push(inv);
        }
      }
    }

    // Backward-compat alias: active + completed
    const all = [...active, ...completed];

    return {
      investments: all,
      activeInvestments: active,
      completedInvestments: completed,
      incompleteInvestments: incomplete,
    };
  }, [allRawInvestments, scheduleMap]);

  // Total count (complete + incomplete) for Free limit
  const allInvestmentsCount = allRawInvestments.length;
  const incompleteCount = incompleteInvestments.length;

  const saveScheduleForInvestment = useCallback(async (investmentId: string, investment: {
    amount: number;
    expectedReturn: number;
    incomeModel: IncomeModel;
    paymentFrequency?: PaymentFrequency | null;
    principalReturnType?: PrincipalReturnType | null;
    equityType?: EquityType | null;
    investmentDate: string;
    expectedEndDate?: string;
    firstPaymentDate?: string | null;
  }): Promise<{ error?: string }> => {
    // Delete existing schedule
    const { error: deleteError } = await supabase.from('investment_schedule').delete().eq('investment_id', investmentId);
    if (deleteError) {
      console.error('Error deleting investment_schedule:', deleteError);
      return { error: 'Error al actualizar el calendario de pagos.' };
    }

    if (!investment.expectedEndDate) return {};

    const entries = generateSchedule({
      id: investmentId,
      amount: investment.amount,
      expectedReturn: investment.expectedReturn,
      incomeModel: investment.incomeModel,
      paymentFrequency: investment.paymentFrequency,
      principalReturnType: investment.principalReturnType,
      equityType: investment.equityType,
      investmentDate: investment.investmentDate,
      expectedEndDate: investment.expectedEndDate,
      firstPaymentDate: investment.firstPaymentDate,
    });

    if (entries.length > 0) {
      const rows = entries.map(e => ({
        investment_id: e.investmentId,
        expected_date: e.expectedDate,
        expected_amount: e.expectedAmount,
        type: e.type,
        status: e.status || 'pending',
      }));
      const { error: insertError } = await supabase.from('investment_schedule').insert(rows);
      if (insertError) {
        console.error('Error inserting investment_schedule:', insertError);
        return { error: 'Error al generar el calendario de pagos.' };
      }
    }
    return {};
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
      income_model: investment.incomeModel || null,
      payment_frequency: investment.paymentFrequency || null,
      first_payment_date: investment.firstPaymentDate || null,
      principal_return_type: investment.principalReturnType || null,
      equity_type: investment.equityType || null,
      notes: investment.notes || null,
      source_url: investment.sourceUrl || null,
    }).select().single();
    if (error) { console.error('Error adding investment:', error); return null; }

    // Generate schedule if needed
    await saveScheduleForInvestment(data.id, {
      amount: investment.amount,
      expectedReturn: investment.expectedReturn,
      incomeModel: investment.incomeModel,
      paymentFrequency: investment.paymentFrequency,
      principalReturnType: investment.principalReturnType,
      equityType: investment.equityType,
      investmentDate: investment.investmentDate,
      expectedEndDate: investment.expectedEndDate,
      firstPaymentDate: investment.firstPaymentDate,
    });

    const created: Investment = {
      id: data.id, platform: data.platform as Platform,
      customPlatformName: data.custom_platform_name || undefined,
      projectName: data.project_name!, amount: Number(data.amount),
      investmentDate: data.investment_date!, expectedEndDate: data.expected_end_date || undefined,
      expectedReturn: Number(data.expected_return), status: data.status as InvestmentStatus,
      incomeModel: (data as Record<string, unknown>).income_model as IncomeModel,
      paymentFrequency: (data as Record<string, unknown>).payment_frequency as PaymentFrequency || undefined,
      firstPaymentDate: (data as Record<string, unknown>).first_payment_date as string || undefined,
      principalReturnType: (data as Record<string, unknown>).principal_return_type as PrincipalReturnType || undefined,
      equityType: (data as Record<string, unknown>).equity_type as EquityType || undefined,
      sourceUrl: (data as Record<string, unknown>).source_url as string || undefined,
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
    firstPaymentDate?: string | null;
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
      first_payment_date: draft.firstPaymentDate || null,
      principal_return_type: draft.principalReturnType || null,
      status: draft.status || 'active',
      notes: draft.notes || null,
    }).select().single();
    if (error) { console.error('Error adding draft investment:', error); return null; }
    await fetchInvestments();
    return data;
  }, [user, fetchInvestments]);

  const updateInvestment = useCallback(async (id: string, updates: Partial<Investment>): Promise<{ demotedToDraft: boolean; error?: string }> => {
    const current = allRawInvestments.find(inv => inv.id === id);

    // Ninguna inversión puede pasar a 'defaulted' sin haber completado el
    // cuestionario de calificación fiscal (Fase 3) en la misma actualización.
    // No bloquea editar una que ya está en 'defaulted'. Ver defaultTransitionGuard.ts.
    if (isBlockedDefaultedTransition(current?.status, updates)) {
      const message = 'No se puede marcar como impago sin completar el cuestionario de calificación fiscal.';
      console.error('Blocked defaulted transition without loss assessment:', { id, updates });
      return { demotedToDraft: false, error: message };
    }

    // Cambiar el tipo de rendimiento de una inversión ya en impago dejaría
    // huérfano el cuestionario fiscal ya respondido. Ver defaultTransitionGuard.ts.
    if (isBlockedIncomeModelChange(current, updates)) {
      const message = 'No se puede cambiar el tipo de rendimiento de una inversión en impago. Deshaz el impago primero.';
      console.error('Blocked income model change on defaulted investment:', { id, updates });
      return { demotedToDraft: false, error: message };
    }

    const dbUpdates: Record<string, unknown> = {};
    if (updates.platform !== undefined) dbUpdates.platform = updates.platform || null;
    if (updates.customPlatformName !== undefined) dbUpdates.custom_platform_name = updates.customPlatformName;
    if (updates.projectName !== undefined) dbUpdates.project_name = updates.projectName || null;
    if (updates.amount !== undefined) dbUpdates.amount = updates.amount ?? null;
    if (updates.investmentDate !== undefined) dbUpdates.investment_date = updates.investmentDate || null;
    if (updates.expectedEndDate !== undefined) dbUpdates.expected_end_date = updates.expectedEndDate;
    if (updates.expectedReturn !== undefined) dbUpdates.expected_return = updates.expectedReturn ?? null;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
    if (updates.sourceUrl !== undefined) dbUpdates.source_url = updates.sourceUrl || null;
    if (updates.defaultedAt !== undefined) dbUpdates.defaulted_at = updates.defaultedAt;
    if (updates.amountRecovered !== undefined) dbUpdates.amount_recovered = updates.amountRecovered;
    if (updates.actualEndDate !== undefined) dbUpdates.actual_end_date = updates.actualEndDate;
    if (updates.closeReason !== undefined) dbUpdates.close_reason = updates.closeReason;
    if (updates.wasExtended !== undefined) dbUpdates.was_extended = updates.wasExtended;
    if (updates.incomeModel !== undefined) dbUpdates.income_model = updates.incomeModel || null;
    if (updates.paymentFrequency !== undefined) dbUpdates.payment_frequency = updates.paymentFrequency || null;
    if (updates.firstPaymentDate !== undefined) dbUpdates.first_payment_date = updates.firstPaymentDate || null;
    if (updates.principalReturnType !== undefined) dbUpdates.principal_return_type = updates.principalReturnType || null;
    if (updates.equityType !== undefined) dbUpdates.equity_type = updates.equityType || null;
    if (updates.lossInsolvencyStatus !== undefined) dbUpdates.loss_insolvency_status = updates.lossInsolvencyStatus;
    if (updates.lossInsolvencyConcludedDate !== undefined) dbUpdates.loss_insolvency_concluded_date = updates.lossInsolvencyConcludedDate;
    if (updates.lossQuitaAmount !== undefined) dbUpdates.loss_quita_amount = updates.lossQuitaAmount;
    if (updates.lossQuitaDate !== undefined) dbUpdates.loss_quita_date = updates.lossQuitaDate;
    if (updates.lossEnforcementStarted !== undefined) dbUpdates.loss_enforcement_started = updates.lossEnforcementStarted;
    if (updates.lossEnforcementDate !== undefined) dbUpdates.loss_enforcement_date = updates.lossEnforcementDate;
    if (updates.lossEnforcementInitiator !== undefined) dbUpdates.loss_enforcement_initiator = updates.lossEnforcementInitiator;
    if (updates.lossAssessedAt !== undefined) dbUpdates.loss_assessed_at = updates.lossAssessedAt;
    if (updates.lossRulesVersion !== undefined) dbUpdates.loss_rules_version = updates.lossRulesVersion;
    const { error } = await supabase.from('investments').update(dbUpdates).eq('id', id);
    if (error) {
      console.error('Error updating investment:', error);
      return { demotedToDraft: false, error: 'Error al actualizar la inversión.' };
    }

    // Regenerate schedule if income model fields changed
    let scheduleError: string | undefined;
    if (current && (updates.incomeModel || updates.paymentFrequency || updates.firstPaymentDate !== undefined || updates.expectedReturn !== undefined || updates.expectedEndDate !== undefined || updates.amount !== undefined || updates.investmentDate !== undefined || updates.principalReturnType !== undefined || updates.equityType !== undefined)) {
      const merged = {
        amount: updates.amount ?? current.amount ?? 0,
        expectedReturn: updates.expectedReturn ?? current.expectedReturn ?? 0,
        incomeModel: (updates.incomeModel ?? current.incomeModel) as IncomeModel,
        paymentFrequency: (updates.paymentFrequency ?? current.paymentFrequency) as PaymentFrequency | null,
        principalReturnType: (updates.principalReturnType ?? current.principalReturnType) as PrincipalReturnType | null,
        equityType: (updates.equityType ?? current.equityType) as EquityType | null,
        investmentDate: updates.investmentDate ?? current.investmentDate ?? '',
        expectedEndDate: updates.expectedEndDate ?? current.expectedEndDate,
        firstPaymentDate: updates.firstPaymentDate !== undefined ? updates.firstPaymentDate : current.firstPaymentDate,
      };
      const scheduleResult = await saveScheduleForInvestment(id, merged);
      scheduleError = scheduleResult.error;
    }

    // Auto-draft: demote to draft if edit breaks tracking_ready
    let demotedToDraft = false;
    if (current) {
      const mergedStatus = updates.status ?? current.status ?? 'active';
      const mergedIncomeModel = updates.incomeModel ?? current.incomeModel;
      const mergedComplete = isInvestmentComplete({
        platform: updates.platform ?? current.platform,
        projectName: updates.projectName ?? current.projectName,
        amount: updates.amount ?? current.amount,
        investmentDate: updates.investmentDate ?? current.investmentDate,
        expectedReturn: updates.expectedReturn ?? current.expectedReturn,
        expectedEndDate: updates.expectedEndDate ?? current.expectedEndDate,
        incomeModel: mergedIncomeModel,
        paymentFrequency: updates.paymentFrequency ?? current.paymentFrequency,
        hasSchedule: (scheduleMap[id]?.length ?? 0) > 0,
        status: mergedStatus,
      });
      if (!mergedComplete && mergedStatus !== 'draft') {
        await supabase.from('investments').update({ status: 'draft' }).eq('id', id);
        demotedToDraft = true;
      }
    }

    await fetchInvestments();
    return { demotedToDraft, error: scheduleError };
  }, [fetchInvestments, allRawInvestments, saveScheduleForInvestment, scheduleMap]);

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
      type: data.type as PaymentType, notes: data.notes || undefined,
    };
    setAllRawInvestments(prev => prev.map(inv =>
      inv.id === investmentId
        ? { ...inv, payments: [...inv.payments, newPayment], updatedAt: new Date().toISOString() }
        : inv
    ));
    return newPayment;
  }, []);

  /**
   * Cierra una inversión equity registrando el resultado ANTES de marcarla
   * como completada (ver lib/investment/equityExit.ts):
   *  1. Inserta todos los pagos del cierre en un único INSERT (o entran todos o ninguno).
   *  2. Solo si eso va bien, pasa la inversión a 'completed'.
   *  3. Si el cambio de estado falla, borra los pagos recién insertados para no
   *     dejar el resultado registrado en una inversión que sigue abierta.
   * 'completed' nunca es automático: solo se llama desde una confirmación del usuario.
   */
  const closeEquityInvestment = useCallback(async (
    investmentId: string,
    payments: Omit<Payment, 'id'>[],
    closeUpdates: Pick<Partial<Investment>, 'actualEndDate' | 'closeReason'>,
  ): Promise<{ error?: string }> => {
    let insertedIds: string[] = [];
    if (payments.length > 0) {
      const { data, error } = await supabase.from('payments').insert(
        payments.map(p => ({
          investment_id: investmentId, date: p.date, amount: p.amount,
          type: p.type, notes: p.notes || null,
        })),
      ).select('id');
      if (error) {
        console.error('Error adding equity exit payments:', error);
        return { error: 'No se ha podido registrar el importe recibido. La inversión sigue abierta.' };
      }
      insertedIds = (data ?? []).map(r => r.id);
    }

    const result = await updateInvestment(investmentId, { status: 'completed', ...closeUpdates });
    if (result.error && insertedIds.length > 0) {
      const { error: rollbackError } = await supabase.from('payments').delete().in('id', insertedIds);
      if (rollbackError) console.error('Error rolling back equity exit payments:', rollbackError);
      await fetchInvestments();
      return { error: 'No se ha podido cerrar la inversión. No se ha guardado ningún cambio.' };
    }
    if (result.error) return { error: result.error };
    return {};
  }, [updateInvestment, fetchInvestments]);

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
        income_model: inv.incomeModel || null,
        payment_frequency: inv.paymentFrequency || null,
        first_payment_date: inv.firstPaymentDate || null,
        principal_return_type: inv.principalReturnType || null,
        notes: inv.notes || null,
      }).select().single();
      if (error) { console.error('Error importing investment:', error); continue; }

      // Generate schedule for imported investment
      await saveScheduleForInvestment(data.id, {
        amount: inv.amount,
        expectedReturn: inv.expectedReturn,
        incomeModel: inv.incomeModel,
        paymentFrequency: inv.paymentFrequency,
        principalReturnType: inv.principalReturnType,
        investmentDate: inv.investmentDate,
        expectedEndDate: inv.expectedEndDate,
        firstPaymentDate: inv.firstPaymentDate,
      });

      if (inv.payments && inv.payments.length > 0) {
        const paymentsToInsert = inv.payments.map(p => ({
          investment_id: data.id, date: p.date, amount: p.amount, type: p.type, notes: p.notes || null,
        }));
        const { error: paymentsError } = await supabase.from('payments').insert(paymentsToInsert);
        if (paymentsError) console.error('Error importing payments:', paymentsError);
      }
    }
    fetchInvestments();
  }, [user, fetchInvestments, saveScheduleForInvestment]);

  const exportInvestments = useCallback(() => JSON.stringify(investments, null, 2), [investments]);

  const clearAllInvestments = useCallback(async () => {
    if (!user) return;
    const { error } = await supabase.from('investments').delete().eq('user_id', user.id);
    if (error) { console.error('Error clearing investments:', error); return; }
    setAllRawInvestments([]);
    setScheduleMap({});
  }, [user]);

  // ── 5B: Summary using separated arrays ──
  const summary: InvestmentSummary = useMemo(() => {
    // forecastReady: active investments with calculable return forecast.
    // variable_or_unknown always excluded. equity rentas excluded (variable amounts).
    // equity plusvalia/liquidacion included (simple interest projection possible).
    const forecastReady = activeInvestments.filter(inv => {
      if (inv.incomeModel === 'variable_or_unknown') return false;
      if (inv.incomeModel === 'equity') {
        return inv.equityType === 'plusvalia' || inv.equityType === 'liquidacion';
      }
      const status = getInvestmentCompletionStatus({
        platform: inv.platform,
        projectName: inv.projectName,
        amount: inv.amount,
        investmentDate: inv.investmentDate,
        expectedReturn: inv.expectedReturn,
        expectedEndDate: inv.expectedEndDate,
        incomeModel: inv.incomeModel,
        paymentFrequency: inv.paymentFrequency,
        hasSchedule: (scheduleMap[inv.id]?.length || 0) > 0,
        status: inv.status,
      });
      return status.isForecastReady;
    });

    const today = new Date();

    const getAccruedReturn = (inv: Investment): number => {
      const schedule = scheduleMap[inv.id] ?? [];
      return calculateAccruedReturn(inv, schedule, today);
    };

    const getRemainingReturn = (inv: Investment): number => {
      const schedule = scheduleMap[inv.id] ?? [];
      return calculateRemainingReturn(inv, schedule, today);
    };

    // activeSummary — only activeInvestments
    const activeCapital    = activeInvestments.reduce((s, i) => s + i.amount, 0);
    const accruedProfit    = forecastReady.reduce((s, i) => s + getAccruedReturn(i), 0);
    const remainingProfit  = forecastReady.reduce((s, i) => s + getRemainingReturn(i), 0);
    const estimatedTotal   = forecastReady.reduce((s, i) => s + i.amount, 0) + accruedProfit + remainingProfit;

    // historicalSummary — only completedInvestments
    const historicalTotalInvested = completedInvestments.reduce((s, i) => s + i.amount, 0);
    const historicalTotalCollected = completedInvestments.reduce((s, i) => s + i.payments.reduce((ps, p) => ps + p.amount, 0), 0);
    const historicalRealizedProfit = completedInvestments.reduce((s, i) => s + i.payments
      .filter(p => p.type === 'dividend' || p.type === 'interest')
      .reduce((ps, p) => ps + p.amount, 0), 0);

    // Global metrics use investments (active + completed, no incompletes)
    const totalCollected = investments.reduce((s, i) => s + i.payments.reduce((ps, p) => ps + p.amount, 0), 0);

    return {
      totalInvested: investments.reduce((sum, inv) => sum + inv.amount, 0),
      totalReturns: totalCollected,
      accruedReturns: accruedProfit,
      activeInvestments: activeInvestments.length,
      completedInvestments: completedInvestments.length,
      averageReturn: (() => {
        const totalCapital = forecastReady.reduce((sum, inv) => sum + inv.amount, 0);
        if (totalCapital <= 0) return 0;
        return forecastReady.reduce((sum, inv) => sum + getEffectiveTAE(inv, inv.payments) * inv.amount, 0) / totalCapital;
      })(),
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
        accruedProfit,
        remainingProfit,
        count: activeInvestments.length,
        withEndDateCount: forecastReady.length,
      },
      historicalSummary: {
        totalInvested: historicalTotalInvested,
        totalCollected: historicalTotalCollected,
        realizedProfit: historicalRealizedProfit,
        completedCount: completedInvestments.length,
      },
    };
  }, [investments, activeInvestments, completedInvestments, scheduleMap]);

  return {
    investments, activeInvestments, completedInvestments,
    incompleteInvestments, incompleteCount, allInvestmentsCount,
    isLoading, error, summary, scheduleMap,
    addInvestment, addDraftInvestment, updateInvestment, deleteInvestment,
    addPayment, closeEquityInvestment, deletePayment, importInvestments,
    exportInvestments, clearAllInvestments, refetch: fetchInvestments,
  };
}
