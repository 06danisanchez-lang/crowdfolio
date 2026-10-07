import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

/**
 * Regresión del 07/10/2026: con la política RLS «Admins can view all
 * investments», un admin veía en su panel las inversiones de todos los
 * usuarios porque useInvestments no filtraba por user_id. La consulta debe
 * filtrar siempre por el usuario, sin depender de RLS.
 */

const USER_ID = 'user-123';

type Call = { table: string; method: string; args: unknown[] };
const calls: Call[] = [];

function builder(table: string) {
  const result = { data: [], error: null };
  const chain: Record<string, unknown> = {};
  for (const method of ['select', 'eq', 'in', 'order', 'update', 'gte', 'lte']) {
    chain[method] = (...args: unknown[]) => {
      calls.push({ table, method, args });
      return chain;
    };
  }
  // La cadena es "thenable" como el query builder real de supabase-js.
  chain.then = (resolve: (v: typeof result) => unknown) => Promise.resolve(result).then(resolve);
  return chain;
}

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (table: string) => builder(table) },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: USER_ID } }),
}));

import { useInvestments } from './useInvestments';

describe('useInvestments', () => {
  beforeEach(() => {
    calls.length = 0;
  });

  it('filtra las inversiones por el usuario actual aunque RLS deje leer más', async () => {
    const { result } = renderHook(() => useInvestments());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const investmentCalls = calls.filter(c => c.table === 'investments');
    expect(investmentCalls.some(c => c.method === 'select')).toBe(true);
    expect(investmentCalls).toContainEqual({ table: 'investments', method: 'eq', args: ['user_id', USER_ID] });
  });
});
