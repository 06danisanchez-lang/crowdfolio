// Stripe configuration for Crowdfolio Pro

/**
 * Interruptor único de pagos. Mientras sea `false`, ningún botón llama a
 * create-checkout ni a customer-portal: se muestran deshabilitados con "Próximamente".
 * Para activar Stripe basta con cambiar esta línea a `true`.
 */
export const PAYMENTS_ENABLED = false;
export const PAYMENTS_DISABLED_LABEL = 'Próximamente';
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

export type PlanType = 'free' | 'monthly' | 'yearly' | 'pro';

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
  return plan === 'monthly' || plan === 'yearly' || plan === 'pro';
};

export const formatPrice = (amount: number, currency: string = 'eur'): string => {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100);
};
