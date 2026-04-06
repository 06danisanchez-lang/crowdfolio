import { useState, useEffect, useCallback } from 'react';
import { Bell, X, CalendarClock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useFutureReminders, FutureReminder } from '@/hooks/useFutureReminders';
import { FutureInvestment } from '@/types/futureInvestment';
import { useLanguage } from '@/contexts/LanguageContext';

interface NotificationBellProps {
  futureInvestments: FutureInvestment[];
}

export function NotificationBell({ futureInvestments }: NotificationBellProps) {
  const { lang } = useLanguage();
  const [, forceUpdate] = useState(0);

  const { reminders, activeCount, dismiss } = useFutureReminders(
    futureInvestments,
    lang
  );

  // Listen for dismiss events to force re-render
  useEffect(() => {
    const handler = () => forceUpdate(n => n + 1);
    window.addEventListener('reminders-updated', handler);
    return () => window.removeEventListener('reminders-updated', handler);
  }, []);

  const handleDismiss = useCallback((e: React.MouseEvent, futureInvestmentId: string) => {
    e.stopPropagation();
    dismiss(futureInvestmentId);
  }, [dismiss]);

  const phaseIcon = (phase: string) => {
    if (phase === 'open') return '🟢';
    if (phase === '1h' || phase === 'today') return '🔴';
    if (phase === '2d') return '🟠';
    return '🔵';
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {activeCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
            >
              {activeCount > 9 ? '9+' : activeCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="font-semibold text-sm">
            {lang === 'es' ? 'Recordatorios' : 'Reminders'}
          </h3>
        </div>
        
        <ScrollArea className="max-h-80">
          {activeCount === 0 ? (
            <div className="p-8 text-center">
              <CalendarClock className="mx-auto h-8 w-8 text-muted-foreground/50" />
              <p className="mt-2 text-sm text-muted-foreground">
                {lang === 'es' ? 'No hay recordatorios' : 'No reminders'}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {reminders.map((reminder) => (
                <div
                  key={reminder.futureInvestmentId}
                  className="flex w-full items-start gap-3 p-4"
                >
                  <span className="mt-0.5 text-base shrink-0">
                    {phaseIcon(reminder.phase)}
                  </span>
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <p className="text-sm font-medium truncate">
                      {reminder.projectName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {reminder.message}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    onClick={(e) => handleDismiss(e, reminder.futureInvestmentId)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
