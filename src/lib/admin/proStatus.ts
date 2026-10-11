import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Estado de Pro de un usuario tal como lo ve el panel de admin.
// Misma regla que la app (SubscriptionContext):
//   Pro = suscripción activa con fecha de fin futura  O  (is_beta_pro y pro_until futuro).

export interface SubscriptionRow {
  plan: string | null;
  status: string | null;
  current_period_end: string | null;
  is_beta_pro: boolean | null;
  pro_until: string | null;
}

export interface AdminProStatus {
  isPro: boolean;
  /** 'subscription' = plan con fecha de fin; 'free' = Pro de prueba o dado a mano. */
  kind: 'subscription' | 'free' | null;
  /** Hasta cuándo es Pro (la fecha más lejana de las vigentes). */
  proEnd: string | null;
  /** Si no es Pro pero lo fue gratis: cuándo terminó. */
  expiredFreeProEnd: string | null;
}

const PAID_PLANS = new Set(['monthly', 'yearly', 'pro']);

export function getAdminProStatus(sub: SubscriptionRow | null | undefined, now: Date = new Date()): AdminProStatus {
  if (!sub) return { isPro: false, kind: null, proEnd: null, expiredFreeProEnd: null };

  const nowMs = now.getTime();
  const subscriptionActive =
    (sub.status === 'active' || sub.status === 'trialing') &&
    !!sub.plan && PAID_PLANS.has(sub.plan) &&
    !!sub.current_period_end && new Date(sub.current_period_end).getTime() > nowMs;
  const freeProActive =
    !!sub.is_beta_pro && !!sub.pro_until && new Date(sub.pro_until).getTime() > nowMs;

  if (subscriptionActive && freeProActive) {
    const end = new Date(sub.current_period_end!).getTime() >= new Date(sub.pro_until!).getTime()
      ? sub.current_period_end
      : sub.pro_until;
    return { isPro: true, kind: end === sub.pro_until ? 'free' : 'subscription', proEnd: end, expiredFreeProEnd: null };
  }
  if (subscriptionActive) {
    return { isPro: true, kind: 'subscription', proEnd: sub.current_period_end, expiredFreeProEnd: null };
  }
  if (freeProActive) {
    return { isPro: true, kind: 'free', proEnd: sub.pro_until, expiredFreeProEnd: null };
  }
  return {
    isPro: false,
    kind: null,
    proEnd: null,
    expiredFreeProEnd: sub.is_beta_pro && sub.pro_until ? sub.pro_until : null,
  };
}

/** Fecha corta para el panel: «04 nov 2026». */
export function formatAdminDate(iso: string): string {
  return format(new Date(iso), 'dd MMM yyyy', { locale: es });
}
