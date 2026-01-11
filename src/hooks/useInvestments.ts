import { useState, useEffect, useCallback } from 'react';
import { Investment, InvestmentSummary, Platform, InvestmentStatus, Payment } from '@/types/investment';

const STORAGE_KEY = 'crowdfunding-investments';

export function useInvestments() {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setInvestments(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading investments:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save to localStorage whenever investments change
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(investments));
    }
  }, [investments, isLoading]);

  const addInvestment = useCallback((investment: Omit<Investment, 'id' | 'createdAt' | 'updatedAt' | 'payments'>) => {
    const newInvestment: Investment = {
      ...investment,
      id: crypto.randomUUID(),
      payments: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setInvestments(prev => [...prev, newInvestment]);
    return newInvestment;
  }, []);

  const updateInvestment = useCallback((id: string, updates: Partial<Investment>) => {
    setInvestments(prev => prev.map(inv => 
      inv.id === id 
        ? { ...inv, ...updates, updatedAt: new Date().toISOString() }
        : inv
    ));
  }, []);

  const deleteInvestment = useCallback((id: string) => {
    setInvestments(prev => prev.filter(inv => inv.id !== id));
  }, []);

  const addPayment = useCallback((investmentId: string, payment: Omit<Payment, 'id'>) => {
    const newPayment: Payment = {
      ...payment,
      id: crypto.randomUUID(),
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

  const deletePayment = useCallback((investmentId: string, paymentId: string) => {
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

  const importInvestments = useCallback((newInvestments: Investment[], replace: boolean = false) => {
    if (replace) {
      setInvestments(newInvestments);
    } else {
      setInvestments(prev => [...prev, ...newInvestments]);
    }
  }, []);

  const exportInvestments = useCallback(() => {
    return JSON.stringify(investments, null, 2);
  }, [investments]);

  const clearAllInvestments = useCallback(() => {
    setInvestments([]);
  }, []);

  // Calculate summary statistics
  const summary: InvestmentSummary = {
    totalInvested: investments.reduce((sum, inv) => sum + inv.amount, 0),
    totalReturns: investments.reduce((sum, inv) => 
      sum + inv.payments.reduce((pSum, p) => pSum + p.amount, 0), 0
    ),
    expectedReturns: investments.reduce((sum, inv) => 
      sum + (inv.amount * inv.expectedReturn / 100), 0
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
  };

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
  };
}
