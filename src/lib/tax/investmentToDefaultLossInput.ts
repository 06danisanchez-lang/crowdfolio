import type { Investment } from '@/types/investment';
import type { DefaultLossInput, DefaultLossPayment } from './defaultLoss';
import type { DefaultLossAnswers } from './answersToLossColumns';

/**
 * Convierte una Investment (con sus columnas loss_* ya guardadas) en el
 * DefaultLossInput que espera assessDefaultLoss. Usado tanto por la ficha
 * (DefaultLossStatusCard) como por las notificaciones fiscales.
 */
export function investmentToDefaultLossInput(investment: Investment): DefaultLossInput {
  const payments: DefaultLossPayment[] = (investment.payments ?? []).map((p) => ({
    type: p.type,
    amount: p.amount,
    date: p.date,
  }));

  return {
    incomeModel: investment.incomeModel,
    amountInvested: investment.amount,
    payments,
    lossAssessedAt: investment.lossAssessedAt ?? null,
    insolvencyStatus: investment.lossInsolvencyStatus ?? null,
    insolvencyConcludedDate: investment.lossInsolvencyConcludedDate ?? null,
    quitaAmount: investment.lossQuitaAmount ?? null,
    quitaDate: investment.lossQuitaDate ?? null,
    enforcementStarted: investment.lossEnforcementStarted ?? null,
    enforcementDate: investment.lossEnforcementDate ?? null,
    enforcementInitiator: investment.lossEnforcementInitiator ?? null,
  };
}

/**
 * Respuestas guardadas de una inversión ya evaluada, para reabrir
 * DefaultLossQuestionnaire con `initialAnswers` precargado ("Actualizar
 * situación"). null si todavía no se evaluó (not_assessed) o si es equity
 * (no hay cuestionario que reabrir).
 */
export function investmentToDefaultLossAnswers(investment: Investment): DefaultLossAnswers | null {
  if (investment.incomeModel === 'equity') return null;
  if (!investment.lossAssessedAt || !investment.lossInsolvencyStatus) return null;

  const enforcementStarted = investment.lossEnforcementStarted ?? false;

  return {
    insolvencyStatus: investment.lossInsolvencyStatus,
    insolvencyConcludedDate: investment.lossInsolvencyConcludedDate ?? null,
    quitaAmount: investment.lossQuitaAmount ?? null,
    quitaDate: investment.lossQuitaDate ?? null,
    enforcementStarted,
    enforcementDate: enforcementStarted ? (investment.lossEnforcementDate ?? null) : null,
    enforcementInitiator: enforcementStarted ? (investment.lossEnforcementInitiator ?? null) : null,
  };
}
