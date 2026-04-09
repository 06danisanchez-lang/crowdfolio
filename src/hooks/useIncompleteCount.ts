import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { isInvestmentComplete } from '@/lib/investment/completeness';

/**
 * Lightweight hook for AppLayout badge.
 * Uses the same isInvestmentComplete function as useInvestments.
 */
export function useIncompleteCount() {
  const { user } = useAuth();
  const [incompleteCount, setIncompleteCount] = useState(0);

  const fetch = useCallback(async () => {
    if (!user) { setIncompleteCount(0); return; }

    const { data, error } = await supabase
      .from('investments')
      .select('id, platform, project_name, amount, investment_date')
      .eq('user_id', user.id);

    if (error || !data) { setIncompleteCount(0); return; }

    const count = data.filter(row => !isInvestmentComplete({
      platform: row.platform,
      projectName: row.project_name,
      amount: row.amount != null ? Number(row.amount) : null,
      investmentDate: row.investment_date,
    })).length;

    setIncompleteCount(count);
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);

  return { incompleteCount, refetch: fetch };
}
