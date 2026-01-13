import { useMemo } from 'react';
import { Asset } from '@/types/asset';
import { TaxCalculationResult, TaxAlert } from '@/types/taxCalculation';

export function useTaxAlerts(
  assets: Asset[],
  taxResult: TaxCalculationResult | null
): TaxAlert[] {
  return useMemo(() => {
    const alerts: TaxAlert[] = [];

    // Check Modelo 720 requirement (foreign assets > 50,000€)
    const foreignAssetsValue = assets
      .filter(a => a.countryCode !== 'ES')
      .reduce((sum, a) => sum + a.acquisitionCost, 0);

    if (foreignAssetsValue > 50000) {
      alerts.push({
        type: 'MODELO_720',
        severity: 'error',
        title: 'Obligación Modelo 720',
        message: `Tienes ${new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(foreignAssetsValue)} invertidos en el extranjero. Estás obligado a presentar el Modelo 720 (Declaración de bienes en el extranjero).`,
        threshold: 50000,
        currentValue: foreignAssetsValue,
      });
    }

    if (taxResult) {
      // Check withholding deficit
      const withholdingDeficit = taxResult.netTax;
      if (withholdingDeficit > 100) {
        alerts.push({
          type: 'WITHHOLDING_FOREIGN',
          severity: 'warning',
          title: 'Pago Adicional Estimado',
          message: `Deberás pagar aproximadamente ${new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(withholdingDeficit)} adicionales en tu declaración de la renta. Esto suele ocurrir cuando tienes rendimientos de plataformas extranjeras sin retención.`,
          currentValue: withholdingDeficit,
        });
      }

      // Check refund
      if (withholdingDeficit < -50) {
        alerts.push({
          type: 'WITHHOLDING_FOREIGN',
          severity: 'info',
          title: 'Devolución Estimada',
          message: `Te corresponde una devolución aproximada de ${new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(Math.abs(withholdingDeficit))} en tu declaración de la renta.`,
          currentValue: Math.abs(withholdingDeficit),
        });
      }

      // Check losses carried forward
      const totalLossesCarried = 
        taxResult.lossesCarried.toNextYears.rcm + 
        taxResult.lossesCarried.toNextYears.gpp;
      
      if (totalLossesCarried > 0) {
        alerts.push({
          type: 'LOSSES_EXPIRING',
          severity: 'info',
          title: 'Pérdidas Pendientes de Compensar',
          message: `Tienes ${new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(totalLossesCarried)} de pérdidas que podrás compensar en los próximos 4 años. Recuerda que las pérdidas no compensadas en ese plazo se pierden.`,
          currentValue: totalLossesCarried,
        });
      }

      // Check high effective rate
      if (taxResult.effectiveRate > 23) {
        alerts.push({
          type: 'HIGH_TAX',
          severity: 'info',
          title: 'Tipo Efectivo Elevado',
          message: `Tu tipo efectivo del ${taxResult.effectiveRate.toFixed(1)}% supera el 23%. Esto indica que una parte importante de tus rendimientos tributan en tramos altos. Considera estrategias de diferimiento o diversificación.`,
          currentValue: taxResult.effectiveRate,
          threshold: 23,
        });
      }

      // Check previous year losses being used
      const totalPreviousLosses = 
        taxResult.lossesCarried.fromPreviousYears.rcm + 
        taxResult.lossesCarried.fromPreviousYears.gpp;
      
      if (totalPreviousLosses > 0) {
        alerts.push({
          type: 'LOSSES_EXPIRING',
          severity: 'info',
          title: 'Pérdidas de Ejercicios Anteriores Aplicadas',
          message: `Se han aplicado ${new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(totalPreviousLosses)} de pérdidas de años anteriores para reducir tu base imponible.`,
          currentValue: totalPreviousLosses,
        });
      }
    }

    // Check for assets in defaulted status
    const defaultedAssets = assets.filter(a => a.status === 'defaulted');
    if (defaultedAssets.length > 0) {
      const defaultedValue = defaultedAssets.reduce((sum, a) => sum + a.acquisitionCost, 0);
      alerts.push({
        type: 'LOSSES_EXPIRING',
        severity: 'warning',
        title: 'Activos en Fallido',
        message: `Tienes ${defaultedAssets.length} activo(s) marcados como fallidos por valor de ${new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(defaultedValue)}. Asegúrate de registrar las pérdidas correspondientes para poder compensarlas fiscalmente.`,
        currentValue: defaultedValue,
      });
    }

    return alerts;
  }, [assets, taxResult]);
}
