import { useMemo } from 'react';
import { Investment, InvestmentScheduleEntry } from '@/types/investment';
import { parseISO, differenceInDays } from 'date-fns';

export type AlertType = 'maturity' | 'overdue' | 'expected-payment';
export type AlertSeverity = 'warning' | 'danger' | 'info';

export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  investmentId: string;
  investmentName: string;
  platform: string;
  date: Date;
  amount: number;
  daysRemaining?: number;
}

interface UseAlertsReturn {
  alerts: Alert[];
  upcomingMaturities: Alert[];
  overdueInvestments: Alert[];
  expectedPayments: Alert[];
  alertCount: number;
  hasUrgentAlerts: boolean;
}

export function useAlerts(
  investments: Investment[],
  scheduleMap: Record<string, InvestmentScheduleEntry[]> = {},
): UseAlertsReturn {
  const alerts = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const allAlerts: Alert[] = [];

    investments.forEach(investment => {
      if (investment.status !== 'active') return;

      // Maturity alerts (within 30 days or already overdue)
      if (investment.expectedEndDate) {
        const endDate = parseISO(investment.expectedEndDate);
        const daysUntilMaturity = differenceInDays(endDate, today);

        if (daysUntilMaturity < 0) {
          allAlerts.push({
            id: `overdue-${investment.id}`,
            type: 'overdue',
            severity: 'danger',
            title: 'Inversión vencida',
            message: `Esta inversión venció hace ${Math.abs(daysUntilMaturity)} días`,
            investmentId: investment.id,
            investmentName: investment.projectName,
            platform: investment.platform,
            date: endDate,
            amount: investment.amount,
            daysRemaining: daysUntilMaturity,
          });
        } else if (daysUntilMaturity <= 30) {
          allAlerts.push({
            id: `maturity-${investment.id}`,
            type: 'maturity',
            severity: daysUntilMaturity <= 7 ? 'danger' : 'warning',
            title: daysUntilMaturity === 0 ? 'Vence hoy' : 'Vencimiento próximo',
            message: daysUntilMaturity === 0
              ? 'Esta inversión vence hoy'
              : `Vence en ${daysUntilMaturity} ${daysUntilMaturity === 1 ? 'día' : 'días'}`,
            investmentId: investment.id,
            investmentName: investment.projectName,
            platform: investment.platform,
            date: endDate,
            amount: investment.amount,
            daysRemaining: daysUntilMaturity,
          });
        }
      }

      // Expected-payment alerts from the real schedule.
      // Only fires for investments with a generated schedule (periodic_fixed, amortizing).
      // Bullet and variable_or_unknown have no schedule entries, so they're silently skipped.
      const schedule = scheduleMap[investment.id];
      if (!schedule || schedule.length === 0) return;

      for (const entry of schedule) {
        if (entry.status === 'matched' || entry.status === 'skipped') continue;

        const entryDate = parseISO(entry.expectedDate);
        // positive = days in the future; negative = days past due
        const daysFromToday = differenceInDays(entryDate, today);

        if (daysFromToday < 0 && daysFromToday >= -60) {
          // Past due within 60-day window
          const daysOverdue = Math.abs(daysFromToday);
          allAlerts.push({
            id: `payment-${investment.id}-${entry.id ?? entry.expectedDate}`,
            type: 'expected-payment',
            severity: daysOverdue > 30 ? 'warning' : 'info',
            title: 'Pago esperado pendiente',
            message: daysOverdue === 1
              ? 'Se esperaba un pago ayer'
              : `Se esperaba un pago hace ${daysOverdue} días`,
            investmentId: investment.id,
            investmentName: investment.projectName,
            platform: investment.platform,
            date: entryDate,
            amount: entry.expectedAmount,
            daysRemaining: daysFromToday,
          });
        } else if (daysFromToday >= 0 && daysFromToday <= 7) {
          // Upcoming within 7 days
          allAlerts.push({
            id: `payment-upcoming-${investment.id}-${entry.id ?? entry.expectedDate}`,
            type: 'expected-payment',
            severity: 'info',
            title: daysFromToday === 0 ? 'Pago esperado hoy' : 'Pago próximo',
            message: daysFromToday === 0
              ? `Se espera un pago hoy de ${entry.expectedAmount.toFixed(2)} €`
              : `Se espera un pago en ${daysFromToday} ${daysFromToday === 1 ? 'día' : 'días'}`,
            investmentId: investment.id,
            investmentName: investment.projectName,
            platform: investment.platform,
            date: entryDate,
            amount: entry.expectedAmount,
            daysRemaining: daysFromToday,
          });
        }
      }
    });

    // Sort by severity and date
    return allAlerts.sort((a, b) => {
      const severityOrder = { danger: 0, warning: 1, info: 2 };
      if (severityOrder[a.severity] !== severityOrder[b.severity]) {
        return severityOrder[a.severity] - severityOrder[b.severity];
      }
      return a.date.getTime() - b.date.getTime();
    });
  }, [investments, scheduleMap]);

  const upcomingMaturities = alerts.filter(a => a.type === 'maturity');
  const overdueInvestments = alerts.filter(a => a.type === 'overdue');
  const expectedPayments = alerts.filter(a => a.type === 'expected-payment');
  const hasUrgentAlerts = alerts.some(a => a.severity === 'danger');

  return {
    alerts,
    upcomingMaturities,
    overdueInvestments,
    expectedPayments,
    alertCount: alerts.length,
    hasUrgentAlerts,
  };
}
