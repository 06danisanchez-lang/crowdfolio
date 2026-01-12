import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Investment, InvestmentSummary, Platform, InvestmentStatus, Payment } from '@/types/investment';
import { calculateInvestmentTotalReturn } from '@/lib/investment/calculations';

export function useInvestments() {
  const { user } = useAuth();
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch investments from database
  const fetchInvestments = useCallback(async () => {
    if (!user) {
      setInvestments([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      // Fetch investments
      const { data: investmentsData, error: investmentsError } = await supabase
        .from('investments')
        .select('*')
        .order('created_at', { ascending: false });

      if (investmentsError) throw investmentsError;

      // Fetch all payments for user's investments
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

      // Map to Investment type with payments
      const mappedInvestments: Investment[] = (investmentsData || []).map(inv => ({
        id: inv.id,
        platform: inv.platform as Platform,
        customPlatformName: inv.custom_platform_name || undefined,
        projectName: inv.project_name,
        amount: Number(inv.amount),
        investmentDate: inv.investment_date,
        expectedEndDate: inv.expected_end_date || undefined,
        expectedReturn: Number(inv.expected_return),
        status: inv.status as InvestmentStatus,
        notes: inv.notes || undefined,
        createdAt: inv.created_at,
        updatedAt: inv.updated_at,
        payments: paymentsData
          .filter(p => p.investment_id === inv.id)
          .map(p => ({
            id: p.id,
            date: p.date,
            amount: Number(p.amount),
            type: p.type as 'dividend' | 'principal' | 'interest',
            notes: p.notes || undefined,
          })),
      }));

      setInvestments(mappedInvestments);
    } catch (error) {
      console.error('Error fetching investments:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchInvestments();
  }, [fetchInvestments]);

  const addInvestment = useCallback(async (investment: Omit<Investment, 'id' | 'createdAt' | 'updatedAt' | 'payments'>) => {
    if (!user) return null;

    const { data, error } = await supabase
      .from('investments')
      .insert({
        user_id: user.id,
        platform: investment.platform,
        custom_platform_name: investment.customPlatformName || null,
        project_name: investment.projectName,
        amount: investment.amount,
        investment_date: investment.investmentDate,
        expected_end_date: investment.expectedEndDate || null,
        expected_return: investment.expectedReturn,
        status: investment.status,
        notes: investment.notes || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding investment:', error);
      return null;
    }

    const newInvestment: Investment = {
      id: data.id,
      platform: data.platform as Platform,
      customPlatformName: data.custom_platform_name || undefined,
      projectName: data.project_name,
      amount: Number(data.amount),
      investmentDate: data.investment_date,
      expectedEndDate: data.expected_end_date || undefined,
      expectedReturn: Number(data.expected_return),
      status: data.status as InvestmentStatus,
      notes: data.notes || undefined,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      payments: [],
    };

    setInvestments(prev => [newInvestment, ...prev]);
    return newInvestment;
  }, [user]);

  const updateInvestment = useCallback(async (id: string, updates: Partial<Investment>) => {
    const dbUpdates: any = {};
    if (updates.platform !== undefined) dbUpdates.platform = updates.platform;
    if (updates.customPlatformName !== undefined) dbUpdates.custom_platform_name = updates.customPlatformName;
    if (updates.projectName !== undefined) dbUpdates.project_name = updates.projectName;
    if (updates.amount !== undefined) dbUpdates.amount = updates.amount;
    if (updates.investmentDate !== undefined) dbUpdates.investment_date = updates.investmentDate;
    if (updates.expectedEndDate !== undefined) dbUpdates.expected_end_date = updates.expectedEndDate;
    if (updates.expectedReturn !== undefined) dbUpdates.expected_return = updates.expectedReturn;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;

    const { error } = await supabase
      .from('investments')
      .update(dbUpdates)
      .eq('id', id);

    if (error) {
      console.error('Error updating investment:', error);
      return;
    }

    setInvestments(prev => prev.map(inv => 
      inv.id === id 
        ? { ...inv, ...updates, updatedAt: new Date().toISOString() }
        : inv
    ));
  }, []);

  const deleteInvestment = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('investments')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting investment:', error);
      return;
    }

    setInvestments(prev => prev.filter(inv => inv.id !== id));
  }, []);

  const addPayment = useCallback(async (investmentId: string, payment: Omit<Payment, 'id'>) => {
    const { data, error } = await supabase
      .from('payments')
      .insert({
        investment_id: investmentId,
        date: payment.date,
        amount: payment.amount,
        type: payment.type,
        notes: payment.notes || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding payment:', error);
      return null;
    }

    const newPayment: Payment = {
      id: data.id,
      date: data.date,
      amount: Number(data.amount),
      type: data.type as 'dividend' | 'principal' | 'interest',
      notes: data.notes || undefined,
    };

    setInvestments(prev => prev.map(inv => 
      inv.id === investmentId
        ? { 
            ...inv, 
            payments: [...inv.payments, newPayment],
            updatedAt: new Date().toISOString()
          }
        : inv
    ));

    return newPayment;
  }, []);

  const deletePayment = useCallback(async (investmentId: string, paymentId: string) => {
    const { error } = await supabase
      .from('payments')
      .delete()
      .eq('id', paymentId);

    if (error) {
      console.error('Error deleting payment:', error);
      return;
    }

    setInvestments(prev => prev.map(inv => 
      inv.id === investmentId
        ? { 
            ...inv, 
            payments: inv.payments.filter(p => p.id !== paymentId),
            updatedAt: new Date().toISOString()
          }
        : inv
    ));
  }, []);

  const importInvestments = useCallback(async (newInvestments: Investment[], replace: boolean = false) => {
    if (!user) return;

    if (replace) {
      // Delete all existing investments first
      const { error: deleteError } = await supabase
        .from('investments')
        .delete()
        .eq('user_id', user.id);

      if (deleteError) {
        console.error('Error deleting investments:', deleteError);
        return;
      }
    }

    // Insert new investments
    for (const inv of newInvestments) {
      const { data, error } = await supabase
        .from('investments')
        .insert({
          user_id: user.id,
          platform: inv.platform,
          custom_platform_name: inv.customPlatformName || null,
          project_name: inv.projectName,
          amount: inv.amount,
          investment_date: inv.investmentDate,
          expected_end_date: inv.expectedEndDate || null,
          expected_return: inv.expectedReturn,
          status: inv.status,
          notes: inv.notes || null,
        })
        .select()
        .single();

      if (error) {
        console.error('Error importing investment:', error);
        continue;
      }

      // Import payments for this investment
      if (inv.payments && inv.payments.length > 0) {
        const paymentsToInsert = inv.payments.map(p => ({
          investment_id: data.id,
          date: p.date,
          amount: p.amount,
          type: p.type,
          notes: p.notes || null,
        }));

        const { error: paymentsError } = await supabase
          .from('payments')
          .insert(paymentsToInsert);

        if (paymentsError) {
          console.error('Error importing payments:', paymentsError);
        }
      }
    }

    // Refresh data
    fetchInvestments();
  }, [user, fetchInvestments]);

  const exportInvestments = useCallback(() => {
    return JSON.stringify(investments, null, 2);
  }, [investments]);

  const clearAllInvestments = useCallback(async () => {
    if (!user) return;

    const { error } = await supabase
      .from('investments')
      .delete()
      .eq('user_id', user.id);

    if (error) {
      console.error('Error clearing investments:', error);
      return;
    }

    setInvestments([]);
  }, [user]);

  // Calculate summary statistics
  const summary: InvestmentSummary = useMemo(() => ({
    totalInvested: investments.reduce((sum, inv) => sum + inv.amount, 0),
    totalReturns: investments.reduce((sum, inv) => 
      sum + inv.payments.reduce((pSum, p) => pSum + p.amount, 0), 0
    ),
    expectedReturns: investments.reduce((sum, inv) => 
      sum + calculateInvestmentTotalReturn(inv), 0
    ),
    activeInvestments: investments.filter(inv => inv.status === 'active').length,
    completedInvestments: investments.filter(inv => inv.status === 'completed').length,
    averageReturn: investments.length > 0
      ? investments.reduce((sum, inv) => sum + inv.expectedReturn, 0) / investments.length
      : 0,
    byPlatform: investments.reduce((acc, inv) => {
      if (!acc[inv.platform]) {
        acc[inv.platform] = { invested: 0, returns: 0, count: 0 };
      }
      acc[inv.platform].invested += inv.amount;
      acc[inv.platform].returns += inv.payments.reduce((sum, p) => sum + p.amount, 0);
      acc[inv.platform].count += 1;
      return acc;
    }, {} as Record<Platform, { invested: number; returns: number; count: number }>),
    byStatus: investments.reduce((acc, inv) => {
      acc[inv.status] = (acc[inv.status] || 0) + 1;
      return acc;
    }, {} as Record<InvestmentStatus, number>),
  }), [investments]);

  return {
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
    clearAllInvestments,
    refetch: fetchInvestments,
  };
}
