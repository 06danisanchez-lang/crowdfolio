import { useMemo } from 'react';
import { Investment } from '@/types/investment';
import { parseISO, differenceInDays, addMonths, isAfter, isBefore } from 'date-fns';

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

export function useAlerts(investments: Investment[]): UseAlertsReturn {
  const alerts = useMemo(() => {
    const now = new Date();
    const allAlerts: Alert[] = [];

    investments.forEach(investment => {
      if (investment.status !== 'active') return;

      // Check for upcoming maturities (within 30 days)
      if (investment.expectedEndDate) {
        const endDate = parseISO(investment.expectedEndDate);
        const daysUntilMaturity = differenceInDays(endDate, now);

        if (daysUntilMaturity < 0) {
          // Overdue investment
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
          // Upcoming maturity within 30 days
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

      // Check for expected payments based on investment duration
      // Estimate quarterly payments for active investments older than 3 months
      const investmentDate = parseISO(investment.investmentDate);
      const monthsSinceInvestment = Math.floor(differenceInDays(now, investmentDate) / 30);
      
      if (monthsSinceInvestment >= 3) {
        // Calculate expected number of quarterly payments
        const expectedPaymentsCount = Math.floor(monthsSinceInvestment / 3);
        const actualPaymentsCount = investment.payments.length;
        
        if (expectedPaymentsCount > actualPaymentsCount) {
          // Missing expected payment
          const expectedPaymentDate = addMonths(investmentDate, (actualPaymentsCount + 1) * 3);
          const daysSinceExpected = differenceInDays(now, expectedPaymentDate);
          
          if (daysSinceExpected >= 0 && daysSinceExpected <= 60) {
            const expectedAmount = (investment.amount * investment.expectedReturn / 100) / 4; // Quarterly
            
            allAlerts.push({
              id: `payment-${investment.id}-${actualPaymentsCount + 1}`,
              type: 'expected-payment',
              severity: daysSinceExpected > 30 ? 'warning' : 'info',
              title: 'Pago esperado pendiente',
              message: daysSinceExpected === 0 
                ? 'Se esperaba un pago hoy'
                : `Se esperaba un pago hace ${daysSinceExpected} días`,
              investmentId: investment.id,
              investmentName: investment.projectName,
              platform: investment.platform,
              date: expectedPaymentDate,
              amount: expectedAmount,
              daysRemaining: -daysSinceExpected,
            });
          }
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
  }, [investments]);

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
