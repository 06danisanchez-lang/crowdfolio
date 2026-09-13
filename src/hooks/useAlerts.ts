import { useMemo } from 'react';
import { Investment, InvestmentScheduleEntry } from '@/types/investment';
import { parseISO, differenceInDays } from 'date-fns';
import { getPendingScheduleEntries } from '@/lib/investment/pendingPayments';

export type AlertType = 'maturity' | 'overdue' | 'expected-payment';
export type AlertSeverity = 'warning' | 'danger' | 'info';

/**
 * Clasifica la urgencia de un vencimiento según días restantes (umbral de 30 días).
 * Mismo criterio que las alertas de vencimiento de este hook — se exporta para que
 * otras vistas (ej. la columna "Vencimiento" de InvestmentList) usen exactamente la
 * misma clasificación en vez de reimplementar el umbral.
 * null = fuera de ventana de alerta (más de 30 días o sin fecha), sin urgencia que marcar.
 */
export function getMaturitySeverity(daysUntilMaturity: number): 'danger' | 'warning' | null {
  if (daysUntilMaturity < 0) return 'danger';
  if (daysUntilMaturity <= 7) return 'danger';
  if (daysUntilMaturity <= 30) return 'warning';
  return null;
}

export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  investmentId: string;
  investmentName: string;
  platform: string;
  customPlatformName?: string;
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
            severity: getMaturitySeverity(daysUntilMaturity)!,
            title: 'Inversión vencida',
            message: `Esta inversión venció hace ${Math.abs(daysUntilMaturity)} días`,
            investmentId: investment.id,
            investmentName: investment.projectName,
            platform: investment.platform,
            customPlatformName: investment.customPlatformName,
            date: endDate,
            amount: investment.amount,
            daysRemaining: daysUntilMaturity,
          });
        } else if (daysUntilMaturity <= 30) {
          allAlerts.push({
            id: `maturity-${investment.id}`,
            type: 'maturity',
            severity: getMaturitySeverity(daysUntilMaturity)!,
            title: daysUntilMaturity === 0 ? 'Vence hoy' : 'Vencimiento próximo',
            message: daysUntilMaturity === 0
              ? 'Esta inversión vence hoy'
              : `Vence en ${daysUntilMaturity} ${daysUntilMaturity === 1 ? 'día' : 'días'}`,
            investmentId: investment.id,
            investmentName: investment.projectName,
            platform: investment.platform,
            customPlatformName: investment.customPlatformName,
            date: endDate,
            amount: investment.amount,
            daysRemaining: daysUntilMaturity,
          });
        }
      }

      // Expected-payment alerts from the real schedule.
      // Periodic_fixed / amortizing use matchedPaymentId; equity rentas check capital_return payments.
      // Bullet and variable_or_unknown have no schedule entries, so they're silently skipped.
      const schedule = scheduleMap[investment.id];
      if (!schedule || schedule.length === 0) return;

      const isEquityRentas = investment.incomeModel === 'equity' && investment.equityType === 'rentas';
      const pendingEntries = getPendingScheduleEntries(investment, schedule, today);

      for (const { entry, date: entryDate, daysFromToday } of pendingEntries) {
        if (daysFromToday < 0 && daysFromToday >= -60) {
          const daysOverdue = Math.abs(daysFromToday);
          allAlerts.push({
            id: `payment-${investment.id}-${entry.id ?? entry.expectedDate}`,
            type: 'expected-payment',
            severity: daysOverdue > 30 ? 'warning' : 'info',
            title: isEquityRentas ? 'Renta trimestral pendiente' : 'Pago esperado pendiente',
            message: isEquityRentas
              ? `Registra la renta trimestral de ${investment.projectName} cuando la recibas`
              : daysOverdue === 1
                ? 'Se esperaba un pago ayer'
                : `Se esperaba un pago hace ${daysOverdue} días`,
            investmentId: investment.id,
            investmentName: investment.projectName,
            platform: investment.platform,
            customPlatformName: investment.customPlatformName,
            date: entryDate,
            amount: entry.expectedAmount,
            daysRemaining: daysFromToday,
          });
        } else if (daysFromToday >= 0 && daysFromToday <= 7) {
          allAlerts.push({
            id: `payment-upcoming-${investment.id}-${entry.id ?? entry.expectedDate}`,
            type: 'expected-payment',
            severity: 'info',
            title: isEquityRentas
              ? (daysFromToday === 0 ? 'Renta trimestral esperada hoy' : 'Renta trimestral próxima')
              : (daysFromToday === 0 ? 'Pago esperado hoy' : 'Pago próximo'),
            message: isEquityRentas
              ? (daysFromToday === 0
                ? `Hoy toca registrar la renta trimestral de ${investment.projectName}`
                : `Renta trimestral de ${investment.projectName} en ${daysFromToday} ${daysFromToday === 1 ? 'día' : 'días'}`)
              : (daysFromToday === 0
                ? `Se espera un pago hoy de ${entry.expectedAmount.toFixed(2)} €`
                : `Se espera un pago en ${daysFromToday} ${daysFromToday === 1 ? 'día' : 'días'}`),
            investmentId: investment.id,
            investmentName: investment.projectName,
            platform: investment.platform,
            customPlatformName: investment.customPlatformName,
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
