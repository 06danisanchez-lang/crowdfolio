// Stripe configuration for CrowdFolio Pro
export const STRIPE_PRICES = {
  monthly: {
    priceId: 'price_1Sojl3QUWwNtRMNN31qri8TI',
    productId: 'prod_TmILDXzjeP7RY2',
    amount: 599, // cents
    currency: 'eur',
    interval: 'month' as const,
    label: 'Pro Mensual',
    savings: null,
  },
  yearly: {
    priceId: 'price_1SojlIQUWwNtRMNNdCIqvHwD',
    productId: 'prod_TmILACrcuLThuR',
    amount: 5900, // cents
    currency: 'eur',
    interval: 'year' as const,
    label: 'Pro Anual',
    savings: 'Ahorra 2 meses',
  },
} as const;

export type PlanType = 'free' | 'monthly' | 'yearly';

export const PLAN_FEATURES = {
  free: {
    investments: 3,
    importsPerMonth: 1,
    alerts: 'read-only',
    taxExport: false,
    support: 'community',
  },
  pro: {
    investments: Infinity,
    importsPerMonth: Infinity,
    alerts: 'configurable',
    taxExport: true,
    support: 'priority',
  },
} as const;

export const isPro = (plan: PlanType): boolean => {
  return plan === 'monthly' || plan === 'yearly';
};

export const formatPrice = (amount: number, currency: string = 'eur'): string => {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100);
};
