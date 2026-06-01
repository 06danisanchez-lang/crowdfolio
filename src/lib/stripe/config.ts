// Stripe configuration for Crowdfolio Pro
// Production Price IDs
export const STRIPE_PRICES = {
  monthly: {
    priceId: 'price_1SwtR9QaxtKtYFASkIW4VGNl',
    productId: 'prod_TnQ71KYMnm4v1a',
    amount: 599, // cents
    currency: 'eur',
    interval: 'month' as const,
    label: 'Pro Mensual',
    savings: null,
  },
  yearly: {
    priceId: 'price_1SwsPQQaxtKtYFASptg5zqXs',
    productId: 'prod_TnPWRPKu6evzqz',
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
    investments: 3,       // active + pending only; completed/default don't count
    futureInvestments: 1,
    taxExport: false,
  },
  pro: {
    investments: Infinity,
    futureInvestments: Infinity,
    taxExport: true,
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
