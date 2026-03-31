import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface AdminUserInvestment {
  id: string;
  projectName: string;
  platformName: string;
  amount: number;
  status: string;
}

export interface AdminUser {
  userId: string;
  fullName: string | null;
  email: string | null;
  plan: 'free' | 'monthly' | 'yearly';
  subscriptionStatus: string;
  subscriptionEnd: string | null;
  totalInvested: number;
  investments: AdminUserInvestment[];
  investmentCount: number;
  averageTicket: number;
}

export interface AdminDashboardData {
  totalUsers: number;
  proUsers: number;
  totalVolume: number;
  users: AdminUser[];
  platformMarketShare: { name: string; value: number }[];
}

export function useAdminDashboard() {
  const { user, isAdmin } = useAuth();

  return useQuery<AdminDashboardData>({
    queryKey: ['admin-dashboard', user?.id],
    enabled: !!user && isAdmin,
    queryFn: async () => {
      const [profilesRes, subscriptionsRes, investmentsRes] = await Promise.all([
        supabase.from('profiles').select('id, email, full_name'),
        supabase.from('subscriptions').select('user_id, plan, status, current_period_end'),
        supabase.from('investments').select('id, user_id, amount, platform, custom_platform_name, project_name, status'),
      ]);

      if (profilesRes.error) throw profilesRes.error;
      if (subscriptionsRes.error) throw subscriptionsRes.error;
      if (investmentsRes.error) throw investmentsRes.error;

      const profiles = profilesRes.data ?? [];
      const subscriptions = subscriptionsRes.data ?? [];
      const investments = investmentsRes.data ?? [];

      // Index subscriptions by user_id
      const subsByUser = new Map(
        subscriptions.map((s) => [s.user_id, s])
      );

      // Group investments per user
      const investmentsByUser = new Map<string, AdminUserInvestment[]>();
      for (const inv of investments) {
        const list = investmentsByUser.get(inv.user_id) ?? [];
        list.push({
          id: inv.id,
          projectName: inv.project_name,
          platformName: inv.custom_platform_name || inv.platform,
          amount: Number(inv.amount),
          status: inv.status,
        });
        investmentsByUser.set(inv.user_id, list);
      }

      // Build user list
      const users: AdminUser[] = profiles.map((p) => {
        const sub = subsByUser.get(p.id);
        const userInvestments = investmentsByUser.get(p.id) ?? [];
        const totalInvested = userInvestments.reduce((sum, i) => sum + i.amount, 0);
        const investmentCount = userInvestments.length;

        return {
          userId: p.id,
          fullName: p.full_name,
          email: p.email,
          plan: (sub?.plan ?? 'free') as AdminUser['plan'],
          subscriptionStatus: sub?.status ?? 'free',
          subscriptionEnd: sub?.current_period_end ?? null,
          totalInvested,
          investments: userInvestments,
          investmentCount,
          averageTicket: investmentCount > 0 ? totalInvested / investmentCount : 0,
        };
      });

      const proUsers = users.filter((u) => u.subscriptionStatus === 'active').length;
      const totalVolume = users.reduce((sum, u) => sum + u.totalInvested, 0);

      // --- Analytics: Platform Market Share (investments only) ---
      const platformMap = new Map<string, number>();
      for (const inv of investments) {
        const name = inv.custom_platform_name || inv.platform;
        platformMap.set(name, (platformMap.get(name) ?? 0) + Number(inv.amount));
      }
      const platformMarketShare = Array.from(platformMap.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

      return {
        totalUsers: profiles.length,
        proUsers,
        totalVolume,
        users,
        platformMarketShare,
      };
    },
  });
}
