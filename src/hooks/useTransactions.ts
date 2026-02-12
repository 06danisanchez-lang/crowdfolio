import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Transaction, TransactionRow, transactionFromRow, TransactionType } from '@/types/asset';

const FETCH_TIMEOUT_MS = 15_000;

export function useTransactions(assetId?: string, year?: number) {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const fetchTransactions = useCallback(async () => {
    if (!user) {
      setTransactions([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    const currentId = ++requestIdRef.current;

    const timeoutId = setTimeout(() => {
      if (requestIdRef.current !== currentId) return;
      setIsLoading(false);
      setError('Timeout: la carga de transacciones tardó demasiado');
    }, FETCH_TIMEOUT_MS);

    try {
      setIsLoading(true);
      setError(null);

      let query = supabase
        .from('transactions')
        .select(`*, assets!inner(user_id)`)
        .eq('assets.user_id', user.id)
        .order('date', { ascending: false });

      if (assetId) query = query.eq('asset_id', assetId);
      if (year) {
        query = query.gte('date', `${year}-01-01`).lte('date', `${year}-12-31`);
      }

      const { data, error: dbError } = await query;

      clearTimeout(timeoutId);
      if (requestIdRef.current !== currentId) return;
      if (dbError) throw dbError;

      const mappedTransactions = (data as (TransactionRow & { assets: { user_id: string } })[])
        .map((row) => transactionFromRow(row));
      setTransactions(mappedTransactions);
    } catch (err) {
      clearTimeout(timeoutId);
      if (requestIdRef.current !== currentId) return;
      console.error('Error fetching transactions:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar transacciones');
      toast({ title: 'Error', description: 'No se pudieron cargar las transacciones', variant: 'destructive' });
    } finally {
      clearTimeout(timeoutId);
      if (requestIdRef.current === currentId) {
        setIsLoading(false);
      }
    }
  }, [user, assetId, year]);

  useEffect(() => {
    fetchTransactions();
    return () => { ++requestIdRef.current; };
  }, [fetchTransactions]);

  const addTransaction = async (transaction: Omit<Transaction, 'id' | 'createdAt'>) => {
    try {
      const { data, error } = await supabase.from('transactions').insert({
        asset_id: transaction.assetId, date: transaction.date,
        type: transaction.type as TransactionType, gross_amount: transaction.grossAmount,
        withholding_amount: transaction.withholdingAmount,
        currency: transaction.currency, notes: transaction.notes || null,
      }).select().single();
      if (error) throw error;
      const newTransaction = transactionFromRow(data as TransactionRow);
      setTransactions((prev) => [newTransaction, ...prev]);
      toast({ title: 'Transacción añadida', description: 'La transacción ha sido registrada correctamente' });
      return newTransaction;
    } catch (error) {
      console.error('Error adding transaction:', error);
      toast({ title: 'Error', description: 'No se pudo añadir la transacción', variant: 'destructive' });
      return null;
    }
  };

  const updateTransaction = async (id: string, updates: Partial<Omit<Transaction, 'id' | 'createdAt'>>) => {
    try {
      const updateData: Record<string, unknown> = {};
      if (updates.assetId !== undefined) updateData.asset_id = updates.assetId;
      if (updates.date !== undefined) updateData.date = updates.date;
      if (updates.type !== undefined) updateData.type = updates.type;
      if (updates.grossAmount !== undefined) updateData.gross_amount = updates.grossAmount;
      if (updates.withholdingAmount !== undefined) updateData.withholding_amount = updates.withholdingAmount;
      if (updates.currency !== undefined) updateData.currency = updates.currency;
      if (updates.notes !== undefined) updateData.notes = updates.notes;

      const { data, error } = await supabase.from('transactions').update(updateData).eq('id', id).select().single();
      if (error) throw error;
      const updatedTransaction = transactionFromRow(data as TransactionRow);
      setTransactions((prev) => prev.map((t) => (t.id === id ? updatedTransaction : t)));
      toast({ title: 'Transacción actualizada', description: 'Los cambios se han guardado correctamente' });
      return updatedTransaction;
    } catch (error) {
      console.error('Error updating transaction:', error);
      toast({ title: 'Error', description: 'No se pudo actualizar la transacción', variant: 'destructive' });
      return null;
    }
  };

  const deleteTransaction = async (id: string) => {
    try {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) throw error;
      setTransactions((prev) => prev.filter((t) => t.id !== id));
      toast({ title: 'Transacción eliminada', description: 'La transacción ha sido eliminada correctamente' });
      return true;
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast({ title: 'Error', description: 'No se pudo eliminar la transacción', variant: 'destructive' });
      return false;
    }
  };

  const interestTransactions = transactions.filter((t) => t.type === 'INTEREST');
  const dividendTransactions = transactions.filter((t) => t.type === 'DIVIDEND');
  const saleTransactions = transactions.filter((t) => t.type === 'SALE');
  const lossTransactions = transactions.filter((t) => t.type === 'LOSS');
  const totalInterest = interestTransactions.reduce((sum, t) => sum + t.grossAmount, 0);
  const totalDividends = dividendTransactions.reduce((sum, t) => sum + t.grossAmount, 0);
  const totalSales = saleTransactions.reduce((sum, t) => sum + t.grossAmount, 0);
  const totalLosses = lossTransactions.reduce((sum, t) => sum + Math.abs(t.grossAmount), 0);
  const totalWithholdings = transactions.reduce((sum, t) => sum + t.withholdingAmount, 0);

  return {
    transactions, isLoading, error,
    addTransaction, updateTransaction, deleteTransaction,
    refetch: fetchTransactions,
    interestTransactions, dividendTransactions, saleTransactions, lossTransactions,
    totalInterest, totalDividends, totalSales, totalLosses, totalWithholdings,
  };
}
