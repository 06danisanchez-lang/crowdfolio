import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Asset, AssetRow, assetFromRow, Transaction, TransactionRow, transactionFromRow, TaxYear, TaxYearRow, taxYearFromRow } from '@/types/asset';
import { TaxCalculationResult, TaxDashboardSummary, TaxAlert, SPAIN_TAX_BRACKETS_2025 } from '@/types/taxCalculation';
import { 
  calculateProgressiveTax2025, 
  calculateEffectiveRate, 
  calculateCrossBucketCompensation,
  calculateDoubleTaxationDeduction,
  getTaxBreakdown2025,
  isModelo720Required,
} from '@/lib/tax/calculations2025';

interface TransactionWithAssetRow extends TransactionRow {
  assets: AssetRow;
}

export function useTaxCalculation(year: number) {
  const { user } = useAuth();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [transactions, setTransactions] = useState<(Transaction & { asset: Asset })[]>([]);
  const [taxYear, setTaxYear] = useState<TaxYear | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user) {
      setAssets([]);
      setTransactions([]);
      setTaxYear(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // Fetch all user's assets
      const { data: assetsData, error: assetsError } = await supabase
        .from('assets')
        .select('*')
        .eq('user_id', user.id);

      if (assetsError) throw assetsError;

      const mappedAssets = (assetsData as AssetRow[]).map(assetFromRow);
      setAssets(mappedAssets);

      // Fetch transactions for the year with asset info
      const startDate = `${year}-01-01`;
      const endDate = `${year}-12-31`;
      
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .select(`
          *,
          assets!inner(*)
        `)
        .eq('assets.user_id', user.id)
        .gte('date', startDate)
        .lte('date', endDate);

      if (transactionsError) throw transactionsError;

      const mappedTransactions = (transactionsData as TransactionWithAssetRow[]).map((row) => ({
        ...transactionFromRow(row),
        asset: assetFromRow(row.assets),
      }));
      setTransactions(mappedTransactions);

      // Fetch or create tax year record
      const { data: taxYearData, error: taxYearError } = await supabase
        .from('tax_years')
        .select('*')
        .eq('user_id', user.id)
        .eq('year', year)
        .maybeSingle();

      if (taxYearError) throw taxYearError;

      if (taxYearData) {
        setTaxYear(taxYearFromRow(taxYearData as TaxYearRow));
      } else {
        setTaxYear(null);
      }
    } catch (error) {
      console.error('Error fetching tax data:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los datos fiscales',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, year]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Calculate tax result
  const taxResult = useMemo((): TaxCalculationResult | null => {
    if (transactions.length === 0 && assets.length === 0) return null;

    // 1. CLASSIFICATION - RCM (Rendimientos Capital Mobiliario)
    const interestIncome = transactions
      .filter((t) => t.type === 'INTEREST')
      .reduce((sum, t) => sum + t.grossAmount, 0);
    
    const dividendIncome = transactions
      .filter((t) => t.type === 'DIVIDEND')
      .reduce((sum, t) => sum + t.grossAmount, 0);

    const rcmGross = interestIncome + dividendIncome;
    const rcmDeductible = 0; // TODO: Add deductible expenses if needed
    const rcmNet = rcmGross - rcmDeductible;

    // 2. CLASSIFICATION - GPP (Ganancias y Pérdidas Patrimoniales)
    const saleTransactions = transactions.filter((t) => t.type === 'SALE');
    const lossTransactions = transactions.filter((t) => t.type === 'LOSS');

    // For SALE: grossAmount is the gain/loss (sale price - acquisition cost already calculated)
    const gppGains = saleTransactions
      .filter((t) => t.grossAmount > 0)
      .reduce((sum, t) => sum + t.grossAmount, 0);
    
    const gppLosses = saleTransactions
      .filter((t) => t.grossAmount < 0)
      .reduce((sum, t) => sum + Math.abs(t.grossAmount), 0)
      + lossTransactions.reduce((sum, t) => sum + Math.abs(t.grossAmount), 0);

    const gppGross = gppGains - gppLosses;

    // 3. INTRA-BUCKET COMPENSATION (already done in calculations above)
    const rcmAfterIntra = rcmNet; // Positive interest compensates negative from defaults
    const gppAfterIntra = gppGross; // Sales gains compensate losses

    // 4. Apply losses from previous years
    const previousRcmLosses = taxYear?.rcmLossesCarried ?? 0;
    const previousGppLosses = taxYear?.gppLossesCarried ?? 0;

    let rcmAfterPrevious = rcmAfterIntra;
    let gppAfterPrevious = gppAfterIntra;
    let usedPreviousRcm = 0;
    let usedPreviousGpp = 0;

    if (rcmAfterIntra > 0 && previousRcmLosses > 0) {
      usedPreviousRcm = Math.min(rcmAfterIntra, previousRcmLosses);
      rcmAfterPrevious = rcmAfterIntra - usedPreviousRcm;
    }

    if (gppAfterIntra > 0 && previousGppLosses > 0) {
      usedPreviousGpp = Math.min(gppAfterIntra, previousGppLosses);
      gppAfterPrevious = gppAfterIntra - usedPreviousGpp;
    }

    // 5. CROSS-BUCKET COMPENSATION (25% rule)
    const crossCompensation = calculateCrossBucketCompensation(rcmAfterPrevious, gppAfterPrevious);

    const finalRcm = crossCompensation.newRcmBalance;
    const finalGpp = crossCompensation.newGppBalance;

    // 6. Calculate losses to carry forward
    const rcmLossesToCarry = finalRcm < 0 ? Math.abs(finalRcm) : 0;
    const gppLossesToCarry = finalGpp < 0 ? Math.abs(finalGpp) : 0;

    // 7. TAXABLE BASE (only positive amounts)
    const taxableBase = Math.max(0, finalRcm) + Math.max(0, finalGpp);

    // 8. CALCULATE GROSS TAX (progressive 2025 brackets)
    const grossTax = calculateProgressiveTax2025(taxableBase);

    // 9. DOUBLE TAXATION DEDUCTION
    const foreignTransactions = transactions.filter((t) => t.asset.countryCode !== 'ES');
    const foreignIncome = foreignTransactions.reduce((sum, t) => sum + t.grossAmount, 0);
    const foreignWithholdings = foreignTransactions.reduce((sum, t) => sum + t.withholdingAmount, 0);
    const effectiveRate = calculateEffectiveRate(taxableBase, grossTax) / 100;
    const doubleTaxationDeduction = calculateDoubleTaxationDeduction(
      foreignIncome,
      foreignWithholdings,
      effectiveRate
    );

    // 10. WITHHOLDINGS
    const spanishWithholdings = transactions
      .filter((t) => t.asset.countryCode === 'ES')
      .reduce((sum, t) => sum + t.withholdingAmount, 0);
    const totalWithholdings = spanishWithholdings + foreignWithholdings;

    // 11. NET TAX
    const netTax = Math.max(0, grossTax - doubleTaxationDeduction);
    const result = netTax - totalWithholdings;

    // 12. BREAKDOWN
    const bracketBreakdown = getTaxBreakdown2025(taxableBase);

    return {
      year,
      rcm: {
        interestIncome,
        dividendIncome,
        deductibleExpenses: rcmDeductible,
        grossBalance: rcmGross,
        netBalance: finalRcm,
      },
      gpp: {
        gains: gppGains,
        losses: gppLosses,
        grossBalance: gppGross,
        netBalance: finalGpp,
      },
      compensation: {
        intraBucketRCM: 0,
        intraBucketGPP: gppLosses,
        crossBucketAmount: crossCompensation.compensatedAmount,
        crossBucketDirection: crossCompensation.direction,
        maxCrossBucket: crossCompensation.maxAllowed,
      },
      lossesCarried: {
        fromPreviousYears: {
          rcm: previousRcmLosses,
          gpp: previousGppLosses,
        },
        toNextYears: {
          rcm: rcmLossesToCarry,
          gpp: gppLossesToCarry,
        },
      },
      taxableBase,
      grossTax,
      doubleTaxation: {
        foreignIncome,
        foreignWithholdings,
        effectiveRate: effectiveRate * 100,
        deduction: doubleTaxationDeduction,
      },
      totalWithholdings: {
        spanish: spanishWithholdings,
        foreign: foreignWithholdings,
        total: totalWithholdings,
      },
      netTax,
      result,
      effectiveRate: calculateEffectiveRate(taxableBase, grossTax),
      bracketBreakdown,
    };
  }, [transactions, assets, taxYear, year]);

  // Dashboard summary
  const summary = useMemo((): TaxDashboardSummary => {
    const totalInvested = assets.reduce((sum, a) => sum + a.acquisitionCost, 0);
    const lendingAmount = assets
      .filter((a) => a.assetType === 'LENDING')
      .reduce((sum, a) => sum + a.acquisitionCost, 0);
    const equityAmount = assets
      .filter((a) => a.assetType === 'EQUITY')
      .reduce((sum, a) => sum + a.acquisitionCost, 0);
    const foreignAmount = assets
      .filter((a) => a.countryCode !== 'ES')
      .reduce((sum, a) => sum + a.acquisitionCost, 0);
    
    const grossProfit = transactions.reduce((sum, t) => sum + t.grossAmount, 0);
    const withholdingsPaid = transactions.reduce((sum, t) => sum + t.withholdingAmount, 0);

    return {
      totalInvested,
      grossProfit,
      estimatedTax: taxResult?.netTax ?? 0,
      withholdingsPaid,
      lendingAmount,
      equityAmount,
      foreignAmount,
    };
  }, [assets, transactions, taxResult]);

  // Alerts
  const alerts = useMemo((): TaxAlert[] => {
    const alertList: TaxAlert[] = [];

    // Modelo 720 alert
    const foreignValue = assets
      .filter((a) => a.countryCode !== 'ES')
      .reduce((sum, a) => sum + a.acquisitionCost, 0);
    
    if (isModelo720Required(foreignValue)) {
      alertList.push({
        type: 'MODELO_720',
        severity: 'error',
        title: 'Obligación Modelo 720',
        message: `Tienes más de 50.000€ (${foreignValue.toLocaleString('es-ES')}€) invertidos en el extranjero. Estás obligado a presentar el Modelo 720 de declaración de bienes en el extranjero.`,
        threshold: 50000,
        currentValue: foreignValue,
      });
    }

    // Losses expiring alert
    if (taxYear) {
      const totalPreviousLosses = taxYear.rcmLossesCarried + taxYear.gppLossesCarried;
      if (totalPreviousLosses > 0) {
        alertList.push({
          type: 'LOSSES_EXPIRING',
          severity: 'warning',
          title: 'Pérdidas pendientes de compensar',
          message: `Tienes ${totalPreviousLosses.toLocaleString('es-ES')}€ en pérdidas de años anteriores. Recuerda que solo puedes compensarlas durante 4 años.`,
          currentValue: totalPreviousLosses,
        });
      }
    }

    // High tax alert
    if (taxResult && taxResult.effectiveRate > 25) {
      alertList.push({
        type: 'HIGH_TAX',
        severity: 'info',
        title: 'Tipo efectivo elevado',
        message: `Tu tipo efectivo es del ${taxResult.effectiveRate.toFixed(2)}%. Considera estrategias de optimización fiscal.`,
        currentValue: taxResult.effectiveRate,
      });
    }

    return alertList;
  }, [assets, taxYear, taxResult]);

  // Save losses to carry forward
  const saveLossesCarried = async (rcmLosses: number, gppLosses: number) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('tax_years')
        .upsert({
          user_id: user.id,
          year: year,
          rcm_losses_carried: rcmLosses,
          gpp_losses_carried: gppLosses,
        }, {
          onConflict: 'user_id,year',
        });

      if (error) throw error;

      toast({
        title: 'Pérdidas guardadas',
        description: 'Las pérdidas a compensar han sido actualizadas',
      });

      await fetchData();
      return true;
    } catch (error) {
      console.error('Error saving losses:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron guardar las pérdidas',
        variant: 'destructive',
      });
      return false;
    }
  };

  // Get available years
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  
  useEffect(() => {
    async function fetchYears() {
      if (!user) return;
      
      const { data } = await supabase
        .from('transactions')
        .select('date, assets!inner(user_id)')
        .eq('assets.user_id', user.id);

      if (data) {
        const years = [...new Set(data.map((t) => new Date(t.date).getFullYear()))];
        years.sort((a, b) => b - a);
        if (years.length === 0) {
          years.push(new Date().getFullYear());
        }
        setAvailableYears(years);
      }
    }
    fetchYears();
  }, [user]);

  return {
    assets,
    transactions,
    taxYear,
    taxResult,
    summary,
    alerts,
    isLoading,
    saveLossesCarried,
    availableYears,
    refetch: fetchData,
  };
}
