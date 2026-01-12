import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { TaxExpense, TaxExpenseCategory } from '@/types/tax';
import { toast } from 'sonner';

export function useTaxExpenses(year?: number) {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<TaxExpense[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchExpenses = useCallback(async () => {
    if (!user) {
      setExpenses([]);
      setIsLoading(false);
      return;
    }

    try {
      let query = supabase
        .from('tax_expenses')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (year) {
        query = query.eq('year', year);
      }

      const { data, error } = await query;

      if (error) throw error;

      const mappedExpenses: TaxExpense[] = (data || []).map((expense) => ({
        id: expense.id,
        userId: expense.user_id,
        year: expense.year,
        category: expense.category as TaxExpenseCategory,
        description: expense.description,
        amount: Number(expense.amount),
        date: expense.date,
        investmentId: expense.investment_id || undefined,
        notes: expense.notes || undefined,
        createdAt: expense.created_at,
        updatedAt: expense.updated_at,
      }));

      setExpenses(mappedExpenses);
    } catch (error) {
      console.error('Error fetching tax expenses:', error);
      toast.error('Error al cargar los gastos deducibles');
    } finally {
      setIsLoading(false);
    }
  }, [user, year]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const addExpense = async (expense: Omit<TaxExpense, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('tax_expenses')
        .insert({
          user_id: user.id,
          year: expense.year,
          category: expense.category,
          description: expense.description,
          amount: expense.amount,
          date: expense.date,
          investment_id: expense.investmentId || null,
          notes: expense.notes || null,
        })
        .select()
        .single();

      if (error) throw error;

      const newExpense: TaxExpense = {
        id: data.id,
        userId: data.user_id,
        year: data.year,
        category: data.category as TaxExpenseCategory,
        description: data.description,
        amount: Number(data.amount),
        date: data.date,
        investmentId: data.investment_id || undefined,
        notes: data.notes || undefined,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      setExpenses((prev) => [newExpense, ...prev]);
      toast.success('Gasto deducible añadido');
    } catch (error) {
      console.error('Error adding tax expense:', error);
      toast.error('Error al añadir el gasto');
    }
  };

  const updateExpense = async (id: string, updates: Partial<Omit<TaxExpense, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>) => {
    if (!user) return;

    try {
      const updateData: Record<string, unknown> = {};
      if (updates.year !== undefined) updateData.year = updates.year;
      if (updates.category !== undefined) updateData.category = updates.category;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.amount !== undefined) updateData.amount = updates.amount;
      if (updates.date !== undefined) updateData.date = updates.date;
      if (updates.investmentId !== undefined) updateData.investment_id = updates.investmentId || null;
      if (updates.notes !== undefined) updateData.notes = updates.notes || null;

      const { error } = await supabase
        .from('tax_expenses')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setExpenses((prev) =>
        prev.map((expense) =>
          expense.id === id ? { ...expense, ...updates, updatedAt: new Date().toISOString() } : expense
        )
      );
      toast.success('Gasto actualizado');
    } catch (error) {
      console.error('Error updating tax expense:', error);
      toast.error('Error al actualizar el gasto');
    }
  };

  const deleteExpense = async (id: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('tax_expenses')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setExpenses((prev) => prev.filter((expense) => expense.id !== id));
      toast.success('Gasto eliminado');
    } catch (error) {
      console.error('Error deleting tax expense:', error);
      toast.error('Error al eliminar el gasto');
    }
  };

  const totalByCategory = expenses.reduce((acc, expense) => {
    acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
    return acc;
  }, {} as Record<TaxExpenseCategory, number>);

  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  return {
    expenses,
    isLoading,
    addExpense,
    updateExpense,
    deleteExpense,
    totalByCategory,
    totalExpenses,
    refetch: fetchExpenses,
  };
}
