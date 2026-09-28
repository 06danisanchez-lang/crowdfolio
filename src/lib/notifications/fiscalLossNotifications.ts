import { addMonths, differenceInCalendarMonths, parseISO, format } from 'date-fns';
import type { Investment } from '@/types/investment';
import { assessDefaultLoss } from '@/lib/tax/defaultLoss';
import { investmentToDefaultLossInput } from '@/lib/tax/investmentToDefaultLossInput';
import { toDateOnlyString } from '@/lib/dateOnly';

export type FiscalLossNotificationType = 'fiscal_loss_ready' | 'fiscal_loss_review' | 'fiscal_loss_incomplete';

export interface FiscalLossNotificationDraft {
  type: FiscalLossNotificationType;
  title: string;
  message: string;
  data: { investmentId: string; investmentName: string; reviewDate?: string };
  read: false;
}

interface ExistingNotificationLike {
  type: string;
  data: unknown;
}

/**
 * Último aniversario trimestral de assessedAtIso que ya se ha cumplido hoy
 * (p.ej. assessedAt 2026-10-01, today 2027-01-15 → '2027-01-01'), o null si
 * aún no ha pasado ni un trimestre completo. Sirve de "reviewDate" para
 * deduplicar: cambia cada 3 meses, así que cada trimestre genera como mucho
 * una notificación por inversión.
 */
function getQuarterlyReviewDate(assessedAtIso: string, today: Date): string | null {
  const assessedDate = parseISO(assessedAtIso);
  const quarters = Math.floor(differenceInCalendarMonths(today, assessedDate) / 3);
  if (quarters < 1) return null;
  return format(addMonths(assessedDate, quarters * 3), 'yyyy-MM-dd');
}

/**
 * Calcula qué notificaciones fiscales del impago (Fase 4, punto 8) hay que
 * insertar hoy, ya deduplicadas contra las existentes. Función pura, sin
 * Supabase — useNotificationGenerator.ts solo le añade user_id e inserta.
 *
 * - fiscal_loss_ready: se cumple el año desde el inicio de la ejecución
 *   judicial — no se puede comparar result.status === 'pending_deadline' con
 *   deadlineDate <= todayStr (si el plazo ya se cumplió, assessDefaultLoss
 *   clasifica la inversión como deductible/partially_deductible, nunca sigue
 *   en pending_deadline con esa fecha ya pasada). Se detecta en su lugar
 *   comprobando si hay una imputación con trigger 'enforcement_one_year' —
 *   pero solo avisa si esa fecha (triggerDate, el día en que se cumplió el
 *   año) es POSTERIOR a loss_assessed_at: si el plazo ya se había cumplido
 *   al rellenar el cuestionario, la ficha ya mostraba "deductible" desde el
 *   primer momento y no hay nada nuevo que avisar.
 * - fiscal_loss_review: cada 3 meses desde loss_assessed_at, para
 *   not_yet/unknown/pending_insolvency — result.nextReviewDate de
 *   assessDefaultLoss NO sirve para esto: siempre se calcula como
 *   todayStr + 3 meses (es un "vuelve a revisar el día X" de cara al usuario,
 *   siempre en el futuro respecto al today con el que se llamó), así que
 *   nextReviewDate <= todayStr es, otra vez, una imposibilidad lógica. Aquí se
 *   calcula el propio calendario trimestral desde loss_assessed_at
 *   (getQuarterlyReviewDate) para saber si hoy toca una revisión.
 * - fiscal_loss_incomplete: una sola vez, para not_assessed.
 *
 * Equity queda fuera siempre: assessDefaultLoss nunca la marca not_assessed
 * ni le calcula deadline/nextReviewDate (not_applicable_equity).
 */
export function computeFiscalLossNotifications(
  investments: Investment[],
  existingNotifications: ExistingNotificationLike[],
  today: Date = new Date(),
): FiscalLossNotificationDraft[] {
  const drafts: FiscalLossNotificationDraft[] = [];

  const defaultedNonEquity = investments.filter((i) => i.status === 'defaulted' && i.incomeModel !== 'equity');

  for (const inv of defaultedNonEquity) {
    const result = assessDefaultLoss(investmentToDefaultLossInput(inv), today);

    const enforcementImputation = result.imputations.find((imp) => imp.trigger === 'enforcement_one_year');
    if (enforcementImputation && inv.lossAssessedAt) {
      const assessedDateStr = toDateOnlyString(new Date(inv.lossAssessedAt));
      const becameReadyAfterAssessment = enforcementImputation.triggerDate > assessedDateStr;

      if (becameReadyAfterAssessment) {
        const exists = existingNotifications.some(
          (n) => n.type === 'fiscal_loss_ready' && (n.data as Record<string, unknown>)?.investmentId === inv.id,
        );
        if (!exists) {
          drafts.push({
            type: 'fiscal_loss_ready',
            title: `Pérdida declarable: ${inv.projectName}`,
            message: `Ya puedes declarar la pérdida de ${inv.projectName}: se ha cumplido un año desde el inicio de la ejecución judicial sin cobro. Entra para ver los detalles.`,
            data: { investmentId: inv.id, investmentName: inv.projectName },
            read: false,
          });
        }
      }
    }

    if (
      (result.status === 'not_yet' || result.status === 'unknown' || result.status === 'pending_insolvency') &&
      inv.lossAssessedAt
    ) {
      const reviewDate = getQuarterlyReviewDate(inv.lossAssessedAt, today);
      if (reviewDate) {
        const exists = existingNotifications.some(
          (n) => n.type === 'fiscal_loss_review' &&
            (n.data as Record<string, unknown>)?.investmentId === inv.id &&
            (n.data as Record<string, unknown>)?.reviewDate === reviewDate,
        );
        if (!exists) {
          drafts.push({
            type: 'fiscal_loss_review',
            title: `Revisa la situación de ${inv.projectName}`,
            message: `¿Ha cambiado algo en ${inv.projectName}? Si la sociedad ha terminado el concurso, se ha aprobado una quita o se ha iniciado una ejecución judicial, actualízalo para saber si ya puedes declarar la pérdida.`,
            data: { investmentId: inv.id, investmentName: inv.projectName, reviewDate },
            read: false,
          });
        }
      }
    }

    if (result.status === 'not_assessed') {
      const exists = existingNotifications.some(
        (n) => n.type === 'fiscal_loss_incomplete' && (n.data as Record<string, unknown>)?.investmentId === inv.id,
      );
      if (!exists) {
        drafts.push({
          type: 'fiscal_loss_incomplete',
          title: 'Cuestionario fiscal sin completar',
          message: 'Tienes una pérdida por impago sin completar su situación fiscal. Responde unas preguntas para saber si puedes declararla.',
          data: { investmentId: inv.id, investmentName: inv.projectName },
          read: false,
        });
      }
    }
  }

  return drafts;
}
