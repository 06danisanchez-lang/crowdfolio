import { useState, useEffect, useCallback } from 'react';
import {
  Bell, X, CalendarClock, CheckCircle, ExternalLink,
  AlertTriangle, Clock, BarChart3, Banknote,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useFutureReminders } from '@/hooks/useFutureReminders';
import { useFutureInvestments } from '@/hooks/useFutureInvestments';
import { Notification } from '@/hooks/useNotifications';
import { useLanguage } from '@/contexts/LanguageContext';
import { getNotifConfig } from '@/lib/notifications/notificationConfig';

const ICONS = { Banknote, Clock, AlertTriangle, BarChart3 } as const;

const phaseIcon = (phase: string) => {
  if (phase === 'open') return '🟢';
  if (phase === '1h' || phase === 'today') return '🔵';
  if (phase === '2d') return '🟠';
  return '🔵';
};

interface NotificationBellProps {
  notifications?: Notification[];
  unreadCount?: number;
  onMarkAsRead?: (id: string) => void;
  onAddPayment?: (
    investmentId: string,
    payment: { date: string; amount: number; type: 'interest' },
  ) => Promise<void>;
  onOpenInvestment?: (investmentId: string) => void;
}

export function NotificationBell({
  notifications = [],
  unreadCount = 0,
  onMarkAsRead,
  onAddPayment,
  onOpenInvestment,
}: NotificationBellProps) {
  const { lang } = useLanguage();
  const [, forceUpdate] = useState(0);
  const [savingId, setSavingId] = useState<string | null>(null);

  const { futureInvestments } = useFutureInvestments();
  const { reminders, activeCount, dismiss } = useFutureReminders(futureInvestments, lang);

  useEffect(() => {
    const handler = () => forceUpdate(n => n + 1);
    window.addEventListener('reminders-updated', handler);
    return () => window.removeEventListener('reminders-updated', handler);
  }, []);

  const handleDismissReminder = useCallback(
    (e: React.MouseEvent, id: string) => { e.stopPropagation(); dismiss(id); },
    [dismiss],
  );

  const handlePaid = async (n: Notification) => {
    if (!onAddPayment || !onMarkAsRead) return;
    setSavingId(n.id);
    const data = n.data as Record<string, unknown>;
    try {
      await onAddPayment(data.investmentId as string, {
        date: new Date(data.scheduleEntryDate as string).toISOString(),
        amount: data.expectedAmount as number,
        type: 'interest',
      });
      onMarkAsRead(n.id);
    } finally {
      setSavingId(null);
    }
  };

  const handleViewInvestment = (n: Notification) => {
    if (!onMarkAsRead) return;
    onMarkAsRead(n.id);
    const data = n.data as Record<string, unknown>;
    onOpenInvestment?.(data.investmentId as string);
  };

  const paymentDue    = notifications.filter(n => n.type === 'payment_due');
  const maturityNtfs  = notifications.filter(n => n.type === 'maturity_soon' || n.type === 'maturity_overdue');
  const weeklySummary = notifications.find(n => n.type === 'weekly_summary');

  const totalCount = unreadCount + activeCount;
  const hasContent = notifications.length > 0 || reminders.length > 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {totalCount > 0 && (
            <Badge className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center bg-[#253765] text-white border-0">
              {totalCount > 9 ? '9+' : totalCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="font-semibold text-sm">
            {lang === 'es' ? 'Notificaciones' : 'Notifications'}
          </h3>
          {totalCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {totalCount} {lang === 'es' ? 'pendientes' : 'pending'}
            </Badge>
          )}
        </div>

        <ScrollArea className="max-h-[480px]">
          {!hasContent ? (
            <div className="p-8 text-center">
              <CalendarClock className="mx-auto h-8 w-8 text-muted-foreground/50" />
              <p className="mt-2 text-sm text-muted-foreground">
                {lang === 'es' ? 'Sin notificaciones' : 'No notifications'}
              </p>
            </div>
          ) : (
            <div className="divide-y">

              {/* ── Resumen semanal ─────────────────────────────── */}
              {weeklySummary && (() => {
                const cfg = getNotifConfig('weekly_summary');
                return (
                  <div className="px-4 py-3">
                    <div className={cn('p-3 space-y-1.5', cfg.cardClass)} style={cfg.cardStyle}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <BarChart3 className={cn('h-3.5 w-3.5 shrink-0', cfg.iconClass)} />
                          <p className={cn('text-xs font-semibold', cfg.titleClass)}>{weeklySummary.title}</p>
                        </div>
                        {onMarkAsRead && (
                          <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0" onClick={() => onMarkAsRead(weeklySummary.id)}>
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      <p className={cn('text-xs leading-snug', cfg.textClass)}>{weeklySummary.message}</p>
                    </div>
                  </div>
                );
              })()}

              {/* ── Cobros esperados ─────────────────────────────── */}
              {paymentDue.length > 0 && (
                <div>
                  <p className="px-4 pt-3 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {lang === 'es' ? 'Cobros esperados' : 'Expected payments'}
                  </p>
                  {paymentDue.map(n => {
                    const cfg = getNotifConfig(n.type);
                    const isSaving = savingId === n.id;
                    return (
                      <div key={n.id} className={cn('px-4 py-2.5 space-y-2', cfg.cardClass)} style={cfg.cardStyle}>
                        <div className="flex items-start gap-2">
                          <div className={cn('mt-1.5 h-1.5 w-1.5 rounded-full shrink-0', cfg.dotClass)} />
                          <div className="min-w-0">
                            <p className={cn('text-sm font-medium leading-tight', cfg.titleClass)}>{n.title}</p>
                            <p className={cn('text-xs mt-0.5', cfg.textClass)}>{n.message}</p>
                          </div>
                        </div>
                        {(onAddPayment || onOpenInvestment) && (
                          <div className="flex gap-2 pl-3.5">
                            {onAddPayment && (
                              <Button size="sm" className="h-7 text-xs bg-[#253765] hover:bg-[#1a2847] text-white" disabled={isSaving} onClick={() => handlePaid(n)}>
                                <CheckCircle className="mr-1 h-3 w-3" />
                                {lang === 'es' ? 'Sí, cobrado' : 'Yes, received'}
                              </Button>
                            )}
                            {onOpenInvestment && (
                              <Button size="sm" variant="outline" className="h-7 text-xs" disabled={isSaving} onClick={() => { onMarkAsRead?.(n.id); onOpenInvestment?.((n.data as Record<string, unknown>).investmentId as string); }}>
                                <ExternalLink className="mr-1 h-3 w-3" />
                                {lang === 'es' ? 'No fue así' : 'Not quite'}
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── Vencimientos ─────────────────────────────────── */}
              {maturityNtfs.length > 0 && (
                <div>
                  <p className="px-4 pt-3 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {lang === 'es' ? 'Vencimientos' : 'Maturities'}
                  </p>
                  {maturityNtfs.map(n => {
                    const cfg = getNotifConfig(n.type);
                    const IconComp = ICONS[cfg.icon];
                    return (
                      <div key={n.id} className={cn('px-4 py-2.5 space-y-2', cfg.cardClass)} style={cfg.cardStyle}>
                        <div className="flex items-start gap-2">
                          <IconComp className={cn('h-4 w-4 mt-0.5 shrink-0', cfg.iconClass)} />
                          <div className="min-w-0">
                            <p className={cn('text-sm font-medium leading-tight', cfg.titleClass)}>{n.title}</p>
                            <p className={cn('text-xs mt-0.5', cfg.textClass)}>{n.message}</p>
                          </div>
                        </div>
                        {onOpenInvestment && (
                          <div className="pl-6">
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleViewInvestment(n)}>
                              <ExternalLink className="mr-1 h-3 w-3" />
                              {lang === 'es' ? 'Ver inversión' : 'View investment'}
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── Recordatorios de inversiones futuras ────────── */}
              {reminders.length > 0 && (
                <div>
                  <p className="px-4 pt-3 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {lang === 'es' ? 'Recordatorios' : 'Reminders'}
                  </p>
                  {reminders.map(reminder => (
                    <div key={reminder.futureInvestmentId} className="flex w-full items-start gap-3 px-4 py-2.5">
                      <span className="mt-0.5 text-base shrink-0">{phaseIcon(reminder.phase)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{reminder.projectName}</p>
                        <p className="text-xs text-muted-foreground">{reminder.message}</p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={e => handleDismissReminder(e, reminder.futureInvestmentId)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
