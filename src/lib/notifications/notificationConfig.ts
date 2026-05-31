import type { CSSProperties } from 'react';

export type NotificationType =
  | 'payment_due'
  | 'maturity_soon'
  | 'maturity_overdue'
  | 'weekly_summary';

export interface NotificationRenderConfig {
  /** Tailwind classes for the card wrapper */
  cardClass: string;
  /** Optional inline styles (for brand hex colors not in Tailwind palette) */
  cardStyle?: CSSProperties;
  /** Icon color class */
  iconClass: string;
  /** Title text color class */
  titleClass: string;
  /** Body/description text color class */
  textClass: string;
  /** Dot indicator in the bell popover */
  dotClass: string;
  /** Lucide icon name */
  icon: 'Banknote' | 'Clock' | 'AlertTriangle' | 'BarChart3';
}

const CONFIG: Record<NotificationType, NotificationRenderConfig> = {
  payment_due: {
    cardClass: 'border rounded-lg',
    cardStyle: { background: '#e8f4fd', borderColor: '#79c6fa' },
    iconClass: 'text-[#79c6fa]',
    titleClass: 'text-[#253765]',
    textClass: 'text-[#253765]/70',
    dotClass: 'bg-[#79c6fa]',
    icon: 'Banknote',
  },
  maturity_soon: {
    cardClass: 'bg-amber-50 border border-amber-200 rounded-lg',
    iconClass: 'text-amber-500',
    titleClass: 'text-amber-800',
    textClass: 'text-amber-800/80',
    dotClass: 'bg-amber-400',
    icon: 'Clock',
  },
  maturity_overdue: {
    cardClass: 'bg-orange-50 border border-orange-300 rounded-lg',
    iconClass: 'text-orange-500',
    titleClass: 'text-orange-800',
    textClass: 'text-orange-800/80',
    dotClass: 'bg-orange-400',
    icon: 'AlertTriangle',
  },
  weekly_summary: {
    cardClass: 'border rounded-lg',
    cardStyle: { background: '#f5f1ea', borderColor: '#e4ddcf' },
    iconClass: 'text-[#253765]',
    titleClass: 'text-[#3f3623]',
    textClass: 'text-[#3f3623]/70',
    dotClass: 'bg-[#253765]',
    icon: 'BarChart3',
  },
};

export function getNotifConfig(type: string): NotificationRenderConfig {
  return CONFIG[type as NotificationType] ?? CONFIG.payment_due;
}
