import { useState, useCallback } from 'react';
import { useSubscription as useSubscriptionContext } from '@/contexts/SubscriptionContext';
import { PLAN_FEATURES, isPro as isPlanPro } from '@/lib/stripe/config';

interface UseSubscriptionReturn {
  isPro: boolean;
  subscription: ReturnType<typeof useSubscriptionContext>['subscription'];
  isLoading: boolean;
  requirePro: (feature: string, callback?: () => void) => boolean;
  openUpgradeModal: (feature?: string) => void;
  upgradeModalOpen: boolean;
  upgradeModalFeature: string;
  closeUpgradeModal: () => void;
  checkInvestmentLimit: (currentCount: number) => boolean;
  checkFutureInvestmentLimit: (currentCount: number) => boolean;
  checkImportLimit: (importsThisMonth: number) => boolean;
  canExportTax: boolean;
}

export function useSubscriptionHook(): UseSubscriptionReturn {
  const { subscription, isLoading, isPro, openCheckout, openCustomerPortal } = useSubscriptionContext();
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [upgradeModalFeature, setUpgradeModalFeature] = useState('default');

  const openUpgradeModal = useCallback((feature: string = 'default') => {
    setUpgradeModalFeature(feature);
    setUpgradeModalOpen(true);
  }, []);

  const closeUpgradeModal = useCallback(() => {
    setUpgradeModalOpen(false);
  }, []);

  const requirePro = useCallback((feature: string, callback?: () => void): boolean => {
    if (isPro) {
      callback?.();
      return true;
    }
    openUpgradeModal(feature);
    return false;
  }, [isPro, openUpgradeModal]);

  const checkInvestmentLimit = useCallback((currentCount: number): boolean => {
    if (isPro) return true;
    return currentCount < PLAN_FEATURES.free.investments;
  }, [isPro]);

  const checkFutureInvestmentLimit = useCallback((currentCount: number): boolean => {
    if (isPro) return true;
    return currentCount < PLAN_FEATURES.free.futureInvestments;
  }, [isPro]);

  const checkImportLimit = useCallback((importsThisMonth: number): boolean => {
    if (isPro) return true;
    return importsThisMonth < PLAN_FEATURES.free.importsPerMonth;
  }, [isPro]);

  const canExportTax = isPro;

  return {
    isPro,
    subscription,
    isLoading,
    requirePro,
    openUpgradeModal,
    upgradeModalOpen,
    upgradeModalFeature,
    closeUpgradeModal,
    checkInvestmentLimit,
    checkFutureInvestmentLimit,
    checkImportLimit,
    canExportTax,
  };
}
