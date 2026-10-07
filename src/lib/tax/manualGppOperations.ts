import type { Investment } from '@/types/investment';
import { getEquityExitTreatment, getEquityNetCapital } from '@/lib/investment/equityExit';

/**
 * Operaciones con ganancia o pérdida patrimonial (base del ahorro) que
 * Crowdfolio NO integra en el cálculo y que el usuario tiene que declarar
 * manualmente: cierres de inversiones equity por liquidación de la sociedad
 * (art. 37.1.e LIRPF), por venta (art. 37.1.b) o con pérdida.
 *
 * Se imputan al ejercicio de la fecha de cierre (actualEndDate), que es la
 * fecha de cobro que el usuario indica al cerrar (EquityExitForm).
 *
 * Valor de adquisición = capital invertido − prima de emisión devuelta
 * (capital_return). Valor de transmisión = lo cobrado al cierre como capital
 * ('principal') más la ganancia patrimonial ('capital_gain'). Los dividendos
 * quedan fuera: ya son RCM y están en el cálculo automático.
 *
 * Un cierre equity con beneficio repartido como dividendo da resultado 0
 * aquí (el beneficio ya está en el RCM) y no se lista.
 */

export interface ManualGppOperation {
  investmentId: string;
  projectName: string;
  platformLabel: string;
  acquisitionDate: string;
  acquisitionValue: number;
  transmissionDate: string;
  transmissionValue: number;
  /** Positivo = ganancia, negativo = pérdida. */
  result: number;
  reason: 'liquidation' | 'sale' | 'loss';
}

const round2 = (v: number) => Math.round(v * 100) / 100;

export function computeManualGppOperations(
  investments: Investment[],
  year: number,
  getPlatformLabel: (inv: Investment) => string,
): ManualGppOperation[] {
  const rows: ManualGppOperation[] = [];
  for (const inv of investments) {
    if (inv.incomeModel !== 'equity' || inv.status !== 'completed') continue;
    if (!inv.actualEndDate || !inv.actualEndDate.startsWith(`${year}-`)) continue;

    const acquisitionValue = getEquityNetCapital(inv);
    const transmissionValue = round2(
      (inv.payments ?? [])
        .filter(p => p.type === 'principal' || p.type === 'capital_gain')
        .reduce((sum, p) => sum + p.amount, 0),
    );
    const result = round2(transmissionValue - acquisitionValue);
    const treatment = getEquityExitTreatment(inv.equityType, inv.closeReason);

    let reason: ManualGppOperation['reason'] | null = null;
    if (treatment === 'gpp_manual') reason = inv.closeReason === 'sold' ? 'sale' : 'liquidation';
    else if (result < 0) reason = 'loss';
    if (!reason || result === 0) continue;

    rows.push({
      investmentId: inv.id,
      projectName: inv.projectName,
      platformLabel: getPlatformLabel(inv),
      acquisitionDate: inv.investmentDate,
      acquisitionValue,
      transmissionDate: inv.actualEndDate,
      transmissionValue,
      result,
      reason,
    });
  }
  return rows.sort((a, b) => a.transmissionDate.localeCompare(b.transmissionDate));
}
