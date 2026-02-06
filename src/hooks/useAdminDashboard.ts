import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface AdminUser {
  userId: string;
  fullName: string | null;
  email: string | null;
  plan: 'free' | 'monthly' | 'yearly';
  subscriptionStatus: string;
  subscriptionEnd: string | null;
  totalInvested: number;
}

export interface AdminDashboardData {
  totalUsers: number;
  proUsers: number;
  totalVolume: number;
  users: AdminUser[];
}

export function useAdminDashboard() {
  const { user, isAdmin } = useAuth();

  return useQuery<AdminDashboardData>({
    queryKey: ['admin-dashboard', user?.id],
    enabled: !!user && isAdmin,
    queryFn: async () => {
      // Fetch all data in parallel
      const [profilesRes, subscriptionsRes, investmentsRes, assetsRes] = await Promise.all([
        supabase.from('profiles').select('id, email, full_name'),
        supabase.from('subscriptions').select('user_id, plan, status, current_period_end'),
        supabase.from('investments').select('user_id, amount'),
        supabase.from('assets').select('user_id, acquisition_cost'),
      ]);

      if (profilesRes.error) throw profilesRes.error;
      if (subscriptionsRes.error) throw subscriptionsRes.error;
      if (investmentsRes.error) throw investmentsRes.error;
      if (assetsRes.error) throw assetsRes.error;

      const profiles = profilesRes.data ?? [];
      const subscriptions = subscriptionsRes.data ?? [];
      const investments = investmentsRes.data ?? [];
      const assets = assetsRes.data ?? [];

      // Index subscriptions by user_id
      const subsByUser = new Map(
        subscriptions.map((s) => [s.user_id, s])
      );

      // Sum investments per user
      const investmentVolume = new Map<string, number>();
      for (const inv of investments) {
        investmentVolume.set(inv.user_id, (investmentVolume.get(inv.user_id) ?? 0) + Number(inv.amount));
      }
      for (const asset of assets) {
        investmentVolume.set(asset.user_id, (investmentVolume.get(asset.user_id) ?? 0) + Number(asset.acquisition_cost));
      }

      // Build user list
      const users: AdminUser[] = profiles.map((p) => {
        const sub = subsByUser.get(p.id);
        return {
          userId: p.id,
          fullName: p.full_name,
          email: p.email,
          plan: (sub?.plan ?? 'free') as AdminUser['plan'],
          subscriptionStatus: sub?.status ?? 'free',
          subscriptionEnd: sub?.current_period_end ?? null,
          totalInvested: investmentVolume.get(p.id) ?? 0,
        };
      });

      const proUsers = users.filter((u) => u.subscriptionStatus === 'active').length;
      const totalVolume = users.reduce((sum, u) => sum + u.totalInvested, 0);

      return {
        totalUsers: users.length,
        proUsers,
        totalVolume,
        users,
      };
    },
  });
}
