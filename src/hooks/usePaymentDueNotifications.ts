import { useEffect, useRef } from 'react';
import { format, parseISO, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Investment, InvestmentScheduleEntry } from '@/types/investment';
import { Notification } from './useNotifications';

export function usePaymentDueNotifications(
  investments: Investment[],
  scheduleMap: Record<string, InvestmentScheduleEntry[]>,
  existingNotifications: Notification[],
  notificationsLoaded: boolean,
) {
  const { user } = useAuth();
  // Prevent double-run in StrictMode and across trivial re-renders
  const runningRef = useRef(false);

  useEffect(() => {
    if (!user || !notificationsLoaded || investments.length === 0) return;
    if (runningRef.current) return;
    runningRef.current = true;

    const check = async () => {
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      const windowStart = subDays(today, 7);
      windowStart.setHours(0, 0, 0, 0);

      const toInsert: object[] = [];

      for (const inv of investments) {
        if (inv.status !== 'active') continue;
        const schedule = scheduleMap[inv.id] ?? [];

        for (const entry of schedule) {
          if (entry.type !== 'interest') continue;
          if (entry.matchedPaymentId) continue;

          const entryDate = parseISO(entry.expectedDate);
          if (entryDate < windowStart || entryDate > today) continue;

          const alreadyExists = existingNotifications.some(
            n =>
              n.type === 'payment_due' &&
              (n.data as any).investmentId === inv.id &&
              (n.data as any).scheduleEntryDate === entry.expectedDate,
          );
          if (alreadyExists) continue;

          const dateStr = format(entryDate, "d 'de' MMMM", { locale: es });
          const amountStr = entry.expectedAmount.toLocaleString('es-ES', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          });

          toInsert.push({
            user_id: user.id,
            type: 'payment_due',
            title: `Cobro esperado en ${inv.projectName}`,
            message: `Según lo previsto, el ${dateStr} deberías haber recibido ${amountStr} €. ¿Lo has cobrado?`,
            data: {
              investmentId: inv.id,
              scheduleEntryDate: entry.expectedDate,
              expectedAmount: entry.expectedAmount,
              investmentName: inv.projectName,
            },
            read: false,
          });
        }
      }

      if (toInsert.length > 0) {
        const { error } = await supabase.from('notifications').insert(toInsert);
        if (error) console.error('Error inserting payment_due notifications:', error);
      }

      runningRef.current = false;
    };

    check();
  }, [user, investments, scheduleMap, existingNotifications, notificationsLoaded]);
}
