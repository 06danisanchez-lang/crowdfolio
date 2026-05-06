import { useEffect, useRef } from 'react';
import { format, parseISO, subDays, addDays, getISOWeek, getISOWeekYear, startOfWeek, endOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Investment, InvestmentScheduleEntry } from '@/types/investment';
import { Notification } from './useNotifications';
import { calculateAccruedReturn } from '@/lib/investment/calculations';

function getWeekKey(date: Date): string {
  const year = getISOWeekYear(date);
  const week = getISOWeek(date);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

export function useNotificationGenerator(
  investments: Investment[],
  scheduleMap: Record<string, InvestmentScheduleEntry[]>,
  existingNotifications: Notification[],
  notificationsLoaded: boolean,
) {
  const { user } = useAuth();
  const runningRef = useRef(false);

  useEffect(() => {
    if (!user || !notificationsLoaded || investments.length === 0) return;
    if (runningRef.current) return;
    runningRef.current = true;

    const generate = async () => {
      const todayDate = new Date();
      todayDate.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const toInsert: object[] = [];
      const activeInvs = investments.filter(i => i.status === 'active');

      // ── 1. payment_due ─────────────────────────────────────────────
      const paymentWindowStart = subDays(todayDate, 7);
      for (const inv of activeInvs) {
        const schedule = scheduleMap[inv.id] ?? [];
        for (const entry of schedule) {
          if (entry.type !== 'interest') continue;
          if (entry.matchedPaymentId) continue;
          const entryDate = parseISO(entry.expectedDate);
          if (entryDate < paymentWindowStart || entryDate > todayDate) continue;

          const alreadyExists = existingNotifications.some(
            n => n.type === 'payment_due' &&
              (n.data as any).investmentId === inv.id &&
              (n.data as any).scheduleEntryDate === entry.expectedDate,
          );
          if (alreadyExists) continue;

          const dateStr = format(entryDate, "d 'de' MMMM", { locale: es });
          const amountStr = entry.expectedAmount.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          toInsert.push({
            user_id: user.id,
            type: 'payment_due',
            title: `Cobro esperado en ${inv.projectName}`,
            message: `Según lo previsto, el ${dateStr} deberías haber recibido ${amountStr} €. ¿Lo has cobrado?`,
            data: { investmentId: inv.id, scheduleEntryDate: entry.expectedDate, expectedAmount: entry.expectedAmount, investmentName: inv.projectName },
            read: false,
          });
        }
      }

      // ── 2. maturity_soon (vence en ≤7 días) ────────────────────────
      for (const inv of activeInvs) {
        if (!inv.expectedEndDate) continue;
        const maturityDate = parseISO(inv.expectedEndDate);
        const daysUntil = Math.round((maturityDate.getTime() - todayDate.getTime()) / 86_400_000);
        if (daysUntil < 0 || daysUntil > 7) continue;

        const alreadyExists = existingNotifications.some(
          n => n.type === 'maturity_soon' && (n.data as any).investmentId === inv.id,
        );
        if (alreadyExists) continue;

        const dateStr = format(maturityDate, "d 'de' MMMM", { locale: es });
        toInsert.push({
          user_id: user.id,
          type: 'maturity_soon',
          title: `Vencimiento próximo: ${inv.projectName}`,
          message: `Tu inversión vence el ${dateStr}. Cuando cobres, ciérrala desde el detalle.`,
          data: { investmentId: inv.id, investmentName: inv.projectName, maturityDate: inv.expectedEndDate },
          read: false,
        });
      }

      // ── 3. maturity_overdue (superó fecha sin cobro principal) ─────
      for (const inv of activeInvs) {
        if (!inv.expectedEndDate) continue;
        const maturityDate = parseISO(inv.expectedEndDate);
        if (maturityDate >= todayDate) continue;

        // Exclude if there is already a principal payment on or after the maturity date
        const hasSettlement = inv.payments.some(
          p => p.type === 'principal' && parseISO(p.date) >= maturityDate,
        );
        if (hasSettlement) continue;

        const alreadyExists = existingNotifications.some(
          n => n.type === 'maturity_overdue' && (n.data as any).investmentId === inv.id,
        );
        if (alreadyExists) continue;

        const dateStr = format(maturityDate, "d 'de' MMMM", { locale: es });
        toInsert.push({
          user_id: user.id,
          type: 'maturity_overdue',
          title: `¿Ha vencido ${inv.projectName}?`,
          message: `Tu inversión debería haber vencido el ${dateStr}. Si ya cobraste, ciérrala desde el detalle.`,
          data: { investmentId: inv.id, investmentName: inv.projectName, maturityDate: inv.expectedEndDate },
          read: false,
        });
      }

      // ── 4. weekly_summary (solo lunes) ────────────────────────────
      if (todayDate.getDay() === 1) {
        const weekKey = getWeekKey(todayDate);
        const alreadyExists = existingNotifications.some(
          n => n.type === 'weekly_summary' && (n.data as any).weekKey === weekKey,
        );

        if (!alreadyExists) {
          const sevenDaysAgo = subDays(todayDate, 7);
          let accruedToday = 0;
          let accruedLastWeek = 0;
          for (const inv of activeInvs) {
            const schedule = scheduleMap[inv.id] ?? [];
            accruedToday += calculateAccruedReturn(inv, schedule, todayEnd);
            accruedLastWeek += calculateAccruedReturn(inv, schedule, sevenDaysAgo);
          }
          const accruedThisWeek = Math.max(accruedToday - accruedLastWeek, 0);

          const weekStart = startOfWeek(todayDate, { weekStartsOn: 1 });
          const weekEnd = endOfWeek(todayDate, { weekStartsOn: 1 });
          let expectedPaymentsCount = 0;
          for (const inv of activeInvs) {
            const schedule = scheduleMap[inv.id] ?? [];
            expectedPaymentsCount += schedule.filter(e => {
              if (e.type !== 'interest' || e.matchedPaymentId) return false;
              const d = parseISO(e.expectedDate);
              return d >= weekStart && d <= weekEnd;
            }).length;
          }

          const in30days = addDays(todayDate, 30);
          const upcomingMaturitiesCount = activeInvs.filter(inv => {
            if (!inv.expectedEndDate) return false;
            const d = parseISO(inv.expectedEndDate);
            return d >= todayDate && d <= in30days;
          }).length;

          const accruedStr = accruedThisWeek.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          toInsert.push({
            user_id: user.id,
            type: 'weekly_summary',
            title: 'Resumen semanal de tu cartera',
            message: `Esta semana tu cartera ha acumulado ${accruedStr} €. Tienes ${expectedPaymentsCount} cobros esperados y ${upcomingMaturitiesCount} vencimientos en los próximos 30 días.`,
            data: { weekKey, accruedThisWeek, expectedPaymentsCount, upcomingMaturitiesCount },
            read: false,
          });
        }
      }

      if (toInsert.length > 0) {
        const { error } = await supabase.from('notifications').insert(toInsert);
        if (error) console.error('Error inserting notifications:', error);
      }

      runningRef.current = false;
    };

    generate();
  }, [user, investments, scheduleMap, existingNotifications, notificationsLoaded]);
}
