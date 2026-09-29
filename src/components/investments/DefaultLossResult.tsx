import { format, parseISO } from 'date-fns';
import { AlertTriangle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { DefaultLossResult as DefaultLossResultData } from '@/lib/tax/defaultLoss';
import { GUIA_IMPAGOS_ROUTE } from '@/lib/guides/routes';

function formatAmountFixed(v: number): string {
  return new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
}

function formatDate(dateStr: string): string {
  return format(parseISO(dateStr), 'dd/MM/yyyy');
}

/** Enlace a la guía pública sobre impagos — desde la app siempre en pestaña
 * nueva, para no perder el cuestionario/ficha abierta. */
function GuideLink() {
  const { t } = useLanguage();
  return (
    <p className="text-xs">
      <a
        href={GUIA_IMPAGOS_ROUTE}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary underline underline-offset-2 hover:no-underline"
      >
        {t('defaultLoss.guideLink')}
      </a>
    </p>
  );
}

interface DefaultLossResultProps {
  isEquity: boolean;
  /** null cuando isEquity, o mientras no haya resultado que mostrar (not_assessed en la ficha). */
  result: DefaultLossResultData | null;
  projectName: string;
  /** Fecha de inicio de la ejecución judicial (respuesta P4 / loss_enforcement_date),
   * necesaria para el texto de pending_deadline ({startDate}). */
  enforcementDate: string | null;
}

/**
 * Composición del resultado del cuestionario de calificación fiscal (piezas
 * a-h de la Fase 3) — componente único reutilizado por DefaultLossQuestionnaire
 * (vista previa antes de guardar) y DefaultLossStatusCard (ficha, resultado ya
 * guardado), para que el texto sea siempre idéntico en los dos sitios.
 */
export function DefaultLossResult({ isEquity, result, projectName, enforcementDate }: DefaultLossResultProps) {
  const { t } = useLanguage();

  if (isEquity) {
    return (
      <div className="space-y-4">
        <p className="text-sm">{t('defaultLoss.equity.text')}</p>
        <GuideLink />
        <p className="text-xs text-muted-foreground">{t('defaultLoss.disclaimer')}</p>
      </div>
    );
  }

  if (!result) return null;

  if (result.status === 'no_loss') {
    return (
      <div className="space-y-4">
        <p className="text-sm">{t('defaultLoss.result.noLoss')}</p>
        <GuideLink />
        <p className="text-xs text-muted-foreground">{t('defaultLoss.disclaimer')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium">
        {t('defaultLoss.result.headline')
          .replace('{loss}', formatAmountFixed(result.lossAmount))
          .replace('{project}', projectName)}
      </p>

      {result.imputations.map((imp, i) => {
        const key =
          imp.trigger === 'quita' ? 'defaultLoss.result.imputation.quita'
          : imp.trigger === 'insolvency_concluded' ? 'defaultLoss.result.imputation.insolvencyConcluded'
          : 'defaultLoss.result.imputation.enforcement';
        return (
          <p key={i} className="text-sm">
            {t(key)
              .replace('{date}', formatDate(imp.triggerDate))
              .replace('{amount}', formatAmountFixed(imp.amount))
              .replace('{year}', String(imp.year))}
          </p>
        );
      })}

      {result.imputations.length > 0 && (
        <p className="text-sm text-muted-foreground">{t('defaultLoss.result.generalBaseNote')}</p>
      )}

      {result.flags.platformInitiatedEnforcement && (
        <div className="flex gap-2 rounded-lg border border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30 p-3 text-sm text-amber-800 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{t('defaultLoss.result.platformEnforcementWarning')}</span>
        </div>
      )}

      {result.pendingAmount > 0 && (
        <div className="rounded-lg border bg-muted/30 p-3 space-y-1.5">
          <p className="text-sm font-medium">
            {(result.imputations.length > 0
              ? t('defaultLoss.result.pendingHeader.withImputations')
              : t('defaultLoss.result.pendingHeader.withoutImputations')
            ).replace('{pending}', formatAmountFixed(result.pendingAmount))}
          </p>
          <p className="text-sm text-muted-foreground">
            {result.pendingReason === 'pending_deadline'
              ? t('defaultLoss.result.pending.deadline')
                  .replace('{startDate}', enforcementDate ? formatDate(enforcementDate) : '')
                  .replace('{deadline}', result.deadlineDate ? formatDate(result.deadlineDate) : '')
              : result.pendingReason === 'pending_insolvency'
              ? t('defaultLoss.result.pending.insolvency')
              : result.pendingReason === 'unknown'
              ? t('defaultLoss.result.pending.unknown')
              : t('defaultLoss.result.pending.notYet')}
          </p>
        </div>
      )}

      <GuideLink />
      <p className="text-xs text-muted-foreground">{t('defaultLoss.disclaimer')}</p>
    </div>
  );
}
