import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// IRPF 2025 Spanish savings income tax brackets
const SPAIN_TAX_BRACKETS_2025 = [
  { min: 0, max: 6000, rate: 0.19 },
  { min: 6000, max: 50000, rate: 0.21 },
  { min: 50000, max: 200000, rate: 0.23 },
  { min: 200000, max: 300000, rate: 0.27 },
  { min: 300000, max: Infinity, rate: 0.30 },
];

function calculateProgressiveTax(taxableBase: number): number {
  if (taxableBase <= 0) return 0;
  
  let remainingBase = taxableBase;
  let totalTax = 0;
  
  for (const bracket of SPAIN_TAX_BRACKETS_2025) {
    if (remainingBase <= 0) break;
    
    const bracketSize = bracket.max - bracket.min;
    const taxableInBracket = Math.min(remainingBase, bracketSize);
    
    totalTax += taxableInBracket * bracket.rate;
    remainingBase -= taxableInBracket;
  }
  
  return Math.round(totalTax * 100) / 100;
}

function calculateCrossBucketCompensation(rcmBalance: number, gppBalance: number) {
  if ((rcmBalance >= 0 && gppBalance >= 0) || (rcmBalance <= 0 && gppBalance <= 0)) {
    return {
      compensatedAmount: 0,
      direction: 'NONE',
      maxAllowed: 0,
      newRcmBalance: rcmBalance,
      newGppBalance: gppBalance,
    };
  }
  
  if (rcmBalance < 0 && gppBalance > 0) {
    const maxCompensation = gppBalance * 0.25;
    const compensatedAmount = Math.min(Math.abs(rcmBalance), maxCompensation);
    
    return {
      compensatedAmount,
      direction: 'GPP_TO_RCM',
      maxAllowed: maxCompensation,
      newRcmBalance: rcmBalance + compensatedAmount,
      newGppBalance: gppBalance - compensatedAmount,
    };
  }
  
  if (gppBalance < 0 && rcmBalance > 0) {
    const maxCompensation = rcmBalance * 0.25;
    const compensatedAmount = Math.min(Math.abs(gppBalance), maxCompensation);
    
    return {
      compensatedAmount,
      direction: 'RCM_TO_GPP',
      maxAllowed: maxCompensation,
      newRcmBalance: rcmBalance - compensatedAmount,
      newGppBalance: gppBalance + compensatedAmount,
    };
  }
  
  return {
    compensatedAmount: 0,
    direction: 'NONE',
    maxAllowed: 0,
    newRcmBalance: rcmBalance,
    newGppBalance: gppBalance,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user from token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { year } = await req.json();
    
    if (!year || typeof year !== 'number') {
      return new Response(
        JSON.stringify({ error: 'Year is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Calculating tax for user ${user.id}, year ${year}`);

    // Fetch assets
    const { data: assets, error: assetsError } = await supabase
      .from('assets')
      .select('*')
      .eq('user_id', user.id);

    if (assetsError) {
      console.error('Assets fetch error:', assetsError);
      throw assetsError;
    }

    // Fetch transactions for the year
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;
    
    const { data: transactions, error: transactionsError } = await supabase
      .from('transactions')
      .select(`*, assets!inner(*)`)
      .eq('assets.user_id', user.id)
      .gte('date', startDate)
      .lte('date', endDate);

    if (transactionsError) {
      console.error('Transactions fetch error:', transactionsError);
      throw transactionsError;
    }

    // Fetch tax year for previous losses
    const { data: taxYear } = await supabase
      .from('tax_years')
      .select('*')
      .eq('user_id', user.id)
      .eq('year', year)
      .maybeSingle();

    // Calculate RCM
    const interestIncome = transactions
      .filter((t: any) => t.type === 'INTEREST')
      .reduce((sum: number, t: any) => sum + Number(t.gross_amount), 0);
    
    const dividendIncome = transactions
      .filter((t: any) => t.type === 'DIVIDEND')
      .reduce((sum: number, t: any) => sum + Number(t.gross_amount), 0);

    const rcmGross = interestIncome + dividendIncome;

    // Calculate GPP
    const saleTransactions = transactions.filter((t: any) => t.type === 'SALE');
    const lossTransactions = transactions.filter((t: any) => t.type === 'LOSS');

    const gppGains = saleTransactions
      .filter((t: any) => Number(t.gross_amount) > 0)
      .reduce((sum: number, t: any) => sum + Number(t.gross_amount), 0);
    
    const gppLosses = saleTransactions
      .filter((t: any) => Number(t.gross_amount) < 0)
      .reduce((sum: number, t: any) => sum + Math.abs(Number(t.gross_amount)), 0)
      + lossTransactions.reduce((sum: number, t: any) => sum + Math.abs(Number(t.gross_amount)), 0);

    const gppGross = gppGains - gppLosses;

    // Apply previous year losses
    const previousRcmLosses = taxYear?.rcm_losses_carried ?? 0;
    const previousGppLosses = taxYear?.gpp_losses_carried ?? 0;

    let rcmAfterPrevious = rcmGross;
    let gppAfterPrevious = gppGross;

    if (rcmGross > 0 && previousRcmLosses > 0) {
      rcmAfterPrevious = Math.max(0, rcmGross - previousRcmLosses);
    }

    if (gppGross > 0 && previousGppLosses > 0) {
      gppAfterPrevious = Math.max(0, gppGross - previousGppLosses);
    }

    // Cross-bucket compensation
    const crossCompensation = calculateCrossBucketCompensation(rcmAfterPrevious, gppAfterPrevious);

    const finalRcm = crossCompensation.newRcmBalance;
    const finalGpp = crossCompensation.newGppBalance;

    // Taxable base
    const taxableBase = Math.max(0, finalRcm) + Math.max(0, finalGpp);

    // Calculate tax
    const grossTax = calculateProgressiveTax(taxableBase);

    // Double taxation deduction
    const foreignTransactions = transactions.filter((t: any) => t.assets.country_code !== 'ES');
    const foreignIncome = foreignTransactions.reduce((sum: number, t: any) => sum + Number(t.gross_amount), 0);
    const foreignWithholdings = foreignTransactions.reduce((sum: number, t: any) => sum + Number(t.withholding_amount), 0);
    
    const effectiveRate = taxableBase > 0 ? grossTax / taxableBase : 0;
    const doubleTaxationDeduction = Math.min(foreignWithholdings, foreignIncome * effectiveRate);

    // Withholdings
    const spanishWithholdings = transactions
      .filter((t: any) => t.assets.country_code === 'ES')
      .reduce((sum: number, t: any) => sum + Number(t.withholding_amount), 0);
    const totalWithholdings = spanishWithholdings + foreignWithholdings;

    // Net tax
    const netTax = Math.max(0, grossTax - doubleTaxationDeduction);
    const result = netTax - totalWithholdings;

    // Losses to carry forward
    const rcmLossesToCarry = finalRcm < 0 ? Math.abs(finalRcm) : 0;
    const gppLossesToCarry = finalGpp < 0 ? Math.abs(finalGpp) : 0;

    const response = {
      year,
      rcm: {
        interestIncome,
        dividendIncome,
        deductibleExpenses: 0,
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
        crossBucketAmount: crossCompensation.compensatedAmount,
        crossBucketDirection: crossCompensation.direction,
        maxCrossBucket: crossCompensation.maxAllowed,
      },
      lossesCarried: {
        fromPreviousYears: { rcm: previousRcmLosses, gpp: previousGppLosses },
        toNextYears: { rcm: rcmLossesToCarry, gpp: gppLossesToCarry },
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
      effectiveRate: taxableBase > 0 ? (grossTax / taxableBase) * 100 : 0,
    };

    console.log('Tax calculation result:', response);

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error calculating tax:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
