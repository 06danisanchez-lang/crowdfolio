import { useEffect, useRef } from 'react';
import { format, parseISO, subDays, addDays, getISOWeek, getISOWeekYear, startOfWeek, endOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Investment, InvestmentScheduleEntry, PLATFORMS } from '@/types/investment';
import { Notification } from './useNotifications';
import { calculateAccruedReturn } from '@/lib/investment/calculations';
import { getInvestmentDataRequirements, getForeign720Radar } from '@/lib/investment/completeness';

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
        // Equity handled in its own block below
        if (inv.incomeModel === 'equity') continue;
        const schedule = scheduleMap[inv.id] ?? [];
        for (const entry of schedule) {
          if (entry.type !== 'interest') continue;
          if (entry.matchedPaymentId) continue;
          const entryDate = parseISO(entry.expectedDate);
          if (entryDate < paymentWindowStart || entryDate > todayDate) continue;

          const alreadyExists = existingNotifications.some(
            n => n.type === 'payment_due' &&
              (n.data as Record<string, unknown>).investmentId === inv.id &&
              (n.data as Record<string, unknown>).scheduleEntryDate === entry.expectedDate,
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

      // ── 1b. payment_due para equity rentas ────────────────────────
      // Genera una notificación por cada entrada trimestral vencida sin capital_return registrado.
      const equityRentasInvs = activeInvs.filter(i => i.incomeModel === 'equity' && i.equityType === 'rentas');
      const equityWindowStart = subDays(todayDate, 180);
      for (const inv of equityRentasInvs) {
        const schedule = scheduleMap[inv.id] ?? [];
        for (const entry of schedule) {
          if (entry.type !== 'interest') continue;
          const entryDate = parseISO(entry.expectedDate);
          if (entryDate > todayDate || entryDate < equityWindowStart) continue;

          // Check if a capital_return payment has been registered on or after this entry date
          const hasPaid = inv.payments.some(
            p => p.type === 'capital_return' && parseISO(p.date) >= entryDate,
          );
          if (hasPaid) continue;

          const alreadyExists = existingNotifications.some(
            n => n.type === 'payment_due' &&
              (n.data as Record<string, unknown>).investmentId === inv.id &&
              (n.data as Record<string, unknown>).scheduleEntryDate === entry.expectedDate,
          );
          if (alreadyExists) continue;

          toInsert.push({
            user_id: user.id,
            type: 'payment_due',
            title: `¿Has recibido la renta trimestral de ${inv.projectName}?`,
            message: `Recuerda registrar la renta trimestral en Crowdfolio cuando la recibas.`,
            data: { investmentId: inv.id, scheduleEntryDate: entry.expectedDate, expectedAmount: 0, investmentName: inv.projectName, isEquityRent: true },
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
          n => n.type === 'maturity_soon' && (n.data as Record<string, unknown>).investmentId === inv.id,
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
      // Includes pending: investments auto-transitioned to pending also need this notification.
      const overdueInvs = investments.filter(i => i.status === 'active' || i.status === 'pending');
      for (const inv of overdueInvs) {
        if (!inv.expectedEndDate) continue;
        const maturityDate = parseISO(inv.expectedEndDate);
        if (maturityDate >= todayDate) continue;

        // Equity settlements are registered as 'dividend'; all others use 'principal'
        const settlementType = inv.incomeModel === 'equity' ? 'dividend' : 'principal';
        const hasSettlement = inv.payments.some(
          p => p.type === settlementType && parseISO(p.date) >= maturityDate,
        );
        if (hasSettlement) continue;

        const alreadyExists = existingNotifications.some(
          n => n.type === 'maturity_overdue' && (n.data as Record<string, unknown>).investmentId === inv.id,
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
          n => n.type === 'weekly_summary' && (n.data as Record<string, unknown>).weekKey === weekKey,
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

      // ── 5. fiscal_blocker (Fase 4 — inversiones extranjeras) ────────
      // Una notificación por inversión con algún bloqueo fiscal pendiente
      // (p.ej. un pago en divisa sin tipo de cambio). Dedupe por investmentId,
      // igual que maturity_overdue: no se repite mientras siga bloqueada.
      for (const inv of investments) {
        const platformMeta = PLATFORMS.find(p => p.value === inv.platform);
        const requirements = getInvestmentDataRequirements(inv, inv.payments, platformMeta);
        const blockers = requirements.filter(r => r.severity === 'fiscal_blocker');
        if (blockers.length === 0) continue;

        const alreadyExists = existingNotifications.some(
          n => n.type === 'fiscal_blocker' && (n.data as Record<string, unknown>).investmentId === inv.id,
        );
        if (alreadyExists) continue;

        toInsert.push({
          user_id: user.id,
          type: 'fiscal_blocker',
          title: `Revisar datos fiscales: ${inv.projectName}`,
          message: blockers[0].message,
          data: { investmentId: inv.id, investmentName: inv.projectName, rules: blockers.map(b => b.rule) },
          read: false,
        });
      }

      // ── 6. foreign_720_radar (Fase 4 — SOLO aviso por umbral) ───────
      // No genera el Modelo 720 (fuera de alcance). Dedupe por si ya se
      // notificó exactamente este nivel (acercándose vs. superado), para
      // avisar una vez al acercarse y otra vez al superar 50.000€.
      const radar = getForeign720Radar(
        investments,
        (platformValue) => PLATFORMS.find(p => p.value === platformValue),
        Object.fromEntries(investments.map(inv => [inv.id, inv.platform])),
      );
      if (radar.requirement) {
        const alreadyExists = existingNotifications.some(
          n => n.type === 'foreign_720_radar' && (n.data as Record<string, unknown>).limitExceeded === radar.limitExceeded,
        );
        if (!alreadyExists) {
          toInsert.push({
            user_id: user.id,
            type: 'foreign_720_radar',
            title: radar.limitExceeded ? 'Umbral del Modelo 720 superado' : 'Cerca del umbral del Modelo 720',
            message: radar.requirement.message,
            data: { totalForeignEur: radar.totalForeignEur, limitExceeded: radar.limitExceeded },
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
