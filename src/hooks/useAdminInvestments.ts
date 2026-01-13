import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Investment, Platform, InvestmentStatus, Payment } from '@/types/investment';

interface UserInvestments {
  userId: string;
  email: string;
  investments: Investment[];
  totalInvested: number;
  totalReturns: number;
  investmentCount: number;
}

interface AdminInvestmentsSummary {
  totalUsers: number;
  totalInvestments: number;
  totalInvested: number;
  totalReturns: number;
}

export function useAdminInvestments() {
  const { user } = useAuth();
  const [userInvestments, setUserInvestments] = useState<UserInvestments[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Check if current user is admin
  const checkAdminRole = useCallback(async () => {
    if (!user) {
      setIsAdmin(false);
      return false;
    }

    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (error) {
        console.error('Error checking admin role:', error);
        setIsAdmin(false);
        return false;
      }

      const hasAdminRole = !!data;
      setIsAdmin(hasAdminRole);
      return hasAdminRole;
    } catch (error) {
      console.error('Error checking admin role:', error);
      setIsAdmin(false);
      return false;
    }
  }, [user]);

  // Fetch all investments (only works for admins due to RLS)
  const fetchAllInvestments = useCallback(async () => {
    if (!user) {
      setUserInvestments([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // First check if user is admin
      const adminStatus = await checkAdminRole();
      if (!adminStatus) {
        setUserInvestments([]);
        setIsLoading(false);
        return;
      }

      // Fetch all investments
      const { data: investmentsData, error: investmentsError } = await supabase
        .from('investments')
        .select('*')
        .order('created_at', { ascending: false });

      if (investmentsError) throw investmentsError;

      // Get unique user IDs
      const userIds = [...new Set(investmentsData?.map(inv => inv.user_id) || [])];

      // Fetch payments for all investments
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

      // Fetch user emails using the secure function
      const userEmails: Record<string, string> = {};
      for (const userId of userIds) {
        const { data: emailData } = await supabase.rpc('get_user_email', { _user_id: userId });
        userEmails[userId] = emailData || 'Usuario desconocido';
      }

      // Group investments by user
      const investmentsByUser: Record<string, Investment[]> = {};
      
      for (const inv of investmentsData || []) {
        const mappedInvestment: Investment = {
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
              type: p.type as Payment['type'],
              notes: p.notes || undefined,
            })),
        };

        if (!investmentsByUser[inv.user_id]) {
          investmentsByUser[inv.user_id] = [];
        }
        investmentsByUser[inv.user_id].push(mappedInvestment);
      }

      // Create user summaries
      const userSummaries: UserInvestments[] = userIds.map(userId => {
        const investments = investmentsByUser[userId] || [];
        const totalInvested = investments.reduce((sum, inv) => sum + inv.amount, 0);
        const totalReturns = investments.reduce((sum, inv) => 
          sum + inv.payments.reduce((pSum, p) => pSum + p.amount, 0), 0
        );

        return {
          userId,
          email: userEmails[userId],
          investments,
          totalInvested,
          totalReturns,
          investmentCount: investments.length,
        };
      });

      // Sort by total invested descending
      userSummaries.sort((a, b) => b.totalInvested - a.totalInvested);

      setUserInvestments(userSummaries);
    } catch (error) {
      console.error('Error fetching admin investments:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, checkAdminRole]);

  useEffect(() => {
    fetchAllInvestments();
  }, [fetchAllInvestments]);

  // Calculate summary
  const summary: AdminInvestmentsSummary = {
    totalUsers: userInvestments.length,
    totalInvestments: userInvestments.reduce((sum, u) => sum + u.investmentCount, 0),
    totalInvested: userInvestments.reduce((sum, u) => sum + u.totalInvested, 0),
    totalReturns: userInvestments.reduce((sum, u) => sum + u.totalReturns, 0),
  };

  return {
    userInvestments,
    isLoading,
    isAdmin,
    summary,
    refetch: fetchAllInvestments,
    checkAdminRole,
  };
}
