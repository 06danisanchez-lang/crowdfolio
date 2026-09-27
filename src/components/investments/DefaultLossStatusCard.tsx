import { format, parseISO } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import type { Investment } from '@/types/investment';
import { assessDefaultLoss, DefaultLossStatus } from '@/lib/tax/defaultLoss';
import { investmentToDefaultLossInput } from '@/lib/tax/investmentToDefaultLossInput';
import { DefaultLossResult } from './DefaultLossResult';

interface DefaultLossStatusCardProps {
  investment: Investment;
  /** Abre DefaultLossQuestionnaire en modo 'update' para esta inversión — usado
   * tanto por "Actualizar situación" como por "Completar" (aviso not_assessed). */
  onUpdateFiscalStatus: (investment: Investment) => void;
}

function statusLabel(status: DefaultLossStatus, deadlineDate: string | null, t: (key: string) => string): string {
  switch (status) {
    case 'deductible': return t('defaultLoss.status.deductible');
    case 'partially_deductible': return t('defaultLoss.status.partiallyDeductible');
    case 'pending_deadline':
      return t('defaultLoss.status.pendingDeadline').replace(
        '{deadline}',
        deadlineDate ? format(parseISO(deadlineDate), 'dd/MM/yyyy') : '',
      );
    case 'pending_insolvency': return t('defaultLoss.status.pendingInsolvency');
    case 'not_yet': return t('defaultLoss.status.notYet');
    case 'unknown': return t('defaultLoss.status.unknown');
    case 'not_assessed': return t('defaultLoss.status.notAssessed');
    case 'no_loss': return t('defaultLoss.status.noLoss');
    case 'not_applicable_equity': return t('defaultLoss.status.notApplicableEquity');
  }
}

export function DefaultLossStatusCard({ investment, onUpdateFiscalStatus }: DefaultLossStatusCardProps) {
  const { t } = useLanguage();
  const result = assessDefaultLoss(investmentToDefaultLossInput(investment));
  const isEquity = result.status === 'not_applicable_equity';

  return (
    <div className="rounded-lg border bg-card p-4 space-y-4">
      <div>
        <p className="text-xs text-muted-foreground">{t('defaultLoss.status.label')}</p>
        <p className="font-semibold">{statusLabel(result.status, result.deadlineDate, t)}</p>
      </div>

      {result.status === 'not_assessed' ? (
        <div className="space-y-3 rounded-lg border border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30 p-3">
          <p className="text-sm text-amber-800 dark:text-amber-300">{t('defaultLoss.notAssessedBanner.text')}</p>
          <Button size="sm" onClick={() => onUpdateFiscalStatus(investment)}>
            {t('defaultLoss.notAssessedBanner.button')}
          </Button>
        </div>
      ) : (
        <>
          <DefaultLossResult
            isEquity={isEquity}
            result={isEquity ? null : result}
            projectName={investment.projectName}
            enforcementDate={investment.lossEnforcementDate ?? null}
          />
          {!isEquity && (
            <Button size="sm" variant="outline" onClick={() => onUpdateFiscalStatus(investment)}>
              {t('defaultLoss.status.updateButton')}
            </Button>
          )}
        </>
      )}
    </div>
  );
}
