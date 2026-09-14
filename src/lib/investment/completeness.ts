/**
 * Centralized completeness logic for investments.
 * Single source of truth used by useInvestments, useIncompleteCount, useTaxSummary.
 *
 * Levels:
 *   draft            — only projectName required
 *   tracking_ready   — platform + projectName + amount>0 + investmentDate
 *                      + incomeModel + expectedReturn + expectedEndDate
 *                      + status ≠ draft
 *   forecast_ready   — tracking_ready + (bullet: nothing extra)
 *                                      + (periodic/amortizing: paymentFrequency + hasSchedule)
 *                                      + (variable_or_unknown: NEVER)
 */

import { convertToEur } from '@/lib/tax/currency';

export interface CompletionStatus {
  isTrackingReady: boolean;
  isForecastReady: boolean;
  missingFields: string[];
  /** @deprecated alias for isTrackingReady — kept for backward compat */
  isPortfolioReady: boolean;
  /** @deprecated alias for isTrackingReady — kept for backward compat */
  isComplete: boolean;
}

interface CompletenessInput {
  platform?: string | null;
  projectName?: string | null;
  amount?: number | null;
  investmentDate?: string | null;
  expectedReturn?: number | null;
  expectedEndDate?: string | null;
  incomeModel?: string | null;
  paymentFrequency?: string | null;
  hasSchedule?: boolean;
  status?: string | null;
}

export function getInvestmentCompletionStatus(inv: CompletenessInput): CompletionStatus {
  const missingFields: string[] = [];

  // Drafts are never tracking-ready
  if (inv.status === 'draft') {
    missingFields.push('investments.field.draftStatus');
    return { isTrackingReady: false, isForecastReady: false, isPortfolioReady: false, isComplete: false, missingFields };
  }

  // Tracking-ready checks
  if (!inv.platform) missingFields.push('investments.field.platform');
  if (!inv.projectName) missingFields.push('investments.field.projectName');
  if (inv.amount == null || inv.amount <= 0) missingFields.push('investments.field.amount');
  if (!inv.investmentDate) missingFields.push('investments.field.investmentDate');
  if (!inv.incomeModel) missingFields.push('investments.field.incomeModel');
  if (inv.expectedReturn == null) missingFields.push('investments.field.expectedReturn');
  if (!inv.expectedEndDate) missingFields.push('investments.field.expectedEndDate');

  // periodic_fixed / amortizing additionally require paymentFrequency + schedule
  const model = inv.incomeModel;
  if (model === 'periodic_fixed' || model === 'amortizing') {
    if (!inv.paymentFrequency) missingFields.push('investments.field.paymentFrequency');
    if (!inv.hasSchedule) missingFields.push('investments.field.schedule');
  }

  const isTrackingReady = missingFields.length === 0;

  // Forecast-ready checks (only if tracking-ready)
  let isForecastReady = false;
  if (isTrackingReady) {
    if (model === 'variable_or_unknown') {
      isForecastReady = false;
    } else if (model === 'bullet') {
      isForecastReady = true;
    } else if (model === 'periodic_fixed' || model === 'amortizing') {
      // frequency + schedule already guaranteed by tracking-ready
      isForecastReady = true;
    }
  }

  return {
    isTrackingReady,
    isForecastReady,
    isPortfolioReady: isTrackingReady,
    isComplete: isTrackingReady,
    missingFields,
  };
}

/** Backward-compatible alias — returns true if tracking_ready */
export function isInvestmentComplete(inv: CompletenessInput): boolean {
  return getInvestmentCompletionStatus(inv).isTrackingReady;
}

// ============================================================================
// Motor de completitud fiscal (inversiones extranjeras)
//
// Extiende el patrón de arriba en vez de sustituirlo: getInvestmentDataRequirements
// devuelve TODOS los huecos de una inversión (los de portfolio ya existentes +
// los nuevos fiscales), como una lista plana que la UI puede recorrer para
// pintar badges y pedir "solo lo que falta". Nunca calcula un importe: solo
// señala qué falta para poder hacerlo con seguridad.
// ============================================================================

export type RequirementSeverity = 'fiscal_blocker' | 'informative' | 'portfolio';

export interface DataRequirement {
  /** id estable de la regla, para deduplicar o enlazar con notificaciones */
  rule: string;
  severity: RequirementSeverity;
  /** texto en lenguaje normal, listo para mostrar */
  message: string;
  /** campo al que apunta el requisito, si aplica (para "pide solo lo que falta") */
  field?: string;
}

/** Metadatos de plataforma que hacen falta aquí: los mismos que PLATFORMS en types/investment.ts */
export interface PlatformFxMeta {
  country?: string;
  defaultCurrency?: string;
}

export interface RequirementsPayment {
  id?: string;
  type: string;
  amount: number;
  originalCurrency?: string | null;
  exchangeRate?: number | null;
  amountEur?: number | null;
  foreignWithholdingAmount?: number | null;
  foreignWithholdingCurrency?: string | null;
}

export interface RequirementsInvestment extends CompletenessInput {
  currency?: string | null;
  country?: string | null;
  /** Principal en divisa extranjera (Fase 4.5) — mismo patrón que RequirementsPayment */
  exchangeRate?: number | null;
  amountEur?: number | null;
  /** Importe recuperado de un impago — NO tiene conversión propia (ver regla informativa abajo) */
  amountRecovered?: number | null;
}

/**
 * Requisitos de datos de UNA inversión (huecos de portfolio + huecos fiscales).
 * `platform` son los metadatos de catálogo de su plataforma (país/divisa por
 * defecto) — pásale `PLATFORMS.find(p => p.value === investment.platform)`.
 */
export function getInvestmentDataRequirements(
  investment: RequirementsInvestment,
  payments: RequirementsPayment[],
  platform?: PlatformFxMeta,
): DataRequirement[] {
  const requirements: DataRequirement[] = [];

  // 0. Huecos de portfolio ya existentes (Fase 4, Decisión: extender, no duplicar).
  const completion = getInvestmentCompletionStatus(investment);
  for (const field of completion.missingFields) {
    requirements.push({ rule: `portfolio:${field}`, severity: 'portfolio', message: field, field });
  }

  const effectiveCurrency = investment.currency || platform?.defaultCurrency || 'EUR';
  const effectiveCountry = investment.country || platform?.country || 'ES';

  // capital_return (prima de emisión) no tributa — se excluye de los cálculos
  // fiscales en todo el proyecto (useTaxSummary), así que tampoco bloquea aquí.
  const taxablePayments = payments.filter(p => p.type !== 'capital_return');

  // 1. Divisa != EUR y algún pago sin exchange_rate/amount_eur → fiscal_blocker.
  //    En la práctica esto ya lo impide el formulario de pago (Fase 3, el botón
  //    "Añadir" se deshabilita sin tipo de cambio) — esta regla es la red de
  //    seguridad para datos que hayan entrado por otra vía (import, edición
  //    directa en BD, etc.).
  if (effectiveCurrency !== 'EUR') {
    const unresolved = taxablePayments.filter(p => p.amountEur == null || p.exchangeRate == null);
    if (unresolved.length > 0) {
      requirements.push({
        rule: 'missing_exchange_rate',
        severity: 'fiscal_blocker',
        message: unresolved.length === 1
          ? `Falta el tipo de cambio de un pago en ${effectiveCurrency}. Sin él no podemos calcular su importe en euros con seguridad.`
          : `Faltan el tipo de cambio de ${unresolved.length} pagos en ${effectiveCurrency}. Sin él no podemos calcular sus importes en euros con seguridad.`,
        field: 'exchangeRate',
      });
    }

    // 1b. Simétrica de la regla 1, pero para el PRINCIPAL de la inversión
    //     (Fase 4.5): mismo motivo — el formulario ya lo bloquea al guardar,
    //     esto es la red de seguridad para datos entrados por otra vía.
    if (investment.amountEur == null || investment.exchangeRate == null) {
      requirements.push({
        rule: 'missing_exchange_rate_principal',
        severity: 'fiscal_blocker',
        message: `Falta el tipo de cambio del importe invertido (en ${effectiveCurrency}). Sin él no podemos calcular el principal en euros con seguridad.`,
        field: 'exchangeRate',
      });
    }
  }

  // 2. Retención en origen sin base bruta en euros coherente → fiscal_blocker.
  //    "Coherente" = existe una base en EUR para ese pago Y la retención
  //    (convertida a EUR) no la supera — una retención mayor que el bruto es
  //    un dato imposible, no algo que debamos intentar calcular.
  for (const p of taxablePayments) {
    if (p.foreignWithholdingAmount == null || p.foreignWithholdingAmount <= 0) continue;

    const grossBaseEur = effectiveCurrency !== 'EUR' ? p.amountEur : p.amount;
    if (grossBaseEur == null) {
      requirements.push({
        rule: 'withholding_without_base',
        severity: 'fiscal_blocker',
        message: 'Hay una retención en origen registrada en un pago sin importe bruto en euros calculado. No podemos verificar la deducción por doble imposición sin él.',
        field: 'amountEur',
      });
      continue;
    }

    const withholdingCurrency = p.foreignWithholdingCurrency || effectiveCurrency;
    const withholdingEur = withholdingCurrency !== 'EUR' && p.exchangeRate
      ? convertToEur(p.foreignWithholdingAmount, p.exchangeRate)
      : p.foreignWithholdingAmount;

    if (withholdingEur > grossBaseEur) {
      requirements.push({
        rule: 'withholding_exceeds_gross',
        severity: 'fiscal_blocker',
        message: 'La retención en origen registrada es mayor que el importe bruto del pago. Revisa esos datos — no podemos calcular la deducción con un valor así.',
        field: 'foreignWithholdingAmount',
      });
    }
  }

  // 4. Retención en origen presente → informative (recordatorio de convenio).
  const hasForeignWithholding = taxablePayments.some(p => p.foreignWithholdingAmount != null && p.foreignWithholdingAmount > 0);
  if (hasForeignWithholding) {
    requirements.push({
      rule: 'foreign_withholding_treaty_check',
      severity: 'informative',
      message: `Verifica el tipo del convenio de doble imposición con ${effectiveCountry}: el exceso sobre el convenio no es deducible en España.`,
      field: 'foreignWithholdingAmount',
    });
  }

  // 5. Importe recuperado de un impago en una inversión en divisa extranjera
  //    → informative. amount_recovered no tiene columna de conversión propia
  //    (retrofit deliberadamente fuera de alcance, caso triple-raro: impago +
  //    recuperación parcial + divisa extranjera) y se trata como EUR por
  //    convención. Este aviso es lo que hace esa convención honesta en vez de
  //    un supuesto silencioso.
  if (effectiveCurrency !== 'EUR' && investment.amountRecovered != null && investment.amountRecovered !== 0) {
    requirements.push({
      rule: 'amount_recovered_assumed_eur',
      severity: 'informative',
      message: `El importe recuperado de este impago se está tratando como EUR. Si en realidad lo recuperaste en ${effectiveCurrency}, verifícalo — Crowdfolio no convierte este campo todavía.`,
      field: 'amountRecovered',
    });
  }

  return requirements;
}

// ── Radar Modelo 720 (regla 3: aviso por umbral, sin generar el formulario) ──

const RADAR_720_WARNING_THRESHOLD = 40_000; // "acercándose" a 50.000€
const RADAR_720_LIMIT = 50_000;

export interface Foreign720RadarInvestment {
  id: string;
  amount?: number | null;
  currency?: string | null;
  country?: string | null;
  status?: string | null;
}

export interface Foreign720RadarResult {
  totalForeignEur: number;
  thresholdReached: boolean;
  limitExceeded: boolean;
  requirement?: DataRequirement;
}

/**
 * Radar de cartera para el Modelo 720: SOLO avisa por umbral (Decisión ya
 * tomada — nunca genera el formulario). Suma el importe invertido de las
 * posiciones activas/pendientes/completadas en plataformas fuera de España.
 *
 * `investment.amount` es siempre EUR (Fase 4.5: el principal en divisa
 * extranjera se trata igual que un pago — se guarda `amount = amountEur`,
 * y `originalAmount`/`exchangeRate` quedan como rastro auditable aparte),
 * así que sumar `inv.amount` directamente es correcto: no hace falta
 * convertir nada aquí.
 */
export function getForeign720Radar(
  investments: Foreign720RadarInvestment[],
  resolvePlatform: (platformValue: string | null | undefined) => PlatformFxMeta | undefined,
  investmentPlatforms: Record<string, string | null | undefined>,
): Foreign720RadarResult {
  const totalForeignEur = investments
    // Solo posiciones que siguen "puestas" fuera de España: activa/pendiente
    // de confirmación. Completadas (capital ya devuelto) y defaults/borradores
    // no cuentan como posición al cierre — es un radar aproximado, no el 720 real.
    .filter(inv => inv.status === 'active' || inv.status === 'pending')
    .filter(inv => {
      const meta = resolvePlatform(investmentPlatforms[inv.id]);
      const country = inv.country || meta?.country || 'ES';
      const currency = inv.currency || meta?.defaultCurrency || 'EUR';
      return country !== 'ES' || currency !== 'EUR';
    })
    .reduce((sum, inv) => sum + (inv.amount ?? 0), 0);

  const thresholdReached = totalForeignEur >= RADAR_720_WARNING_THRESHOLD;
  const limitExceeded = totalForeignEur >= RADAR_720_LIMIT;

  if (!thresholdReached) {
    return { totalForeignEur, thresholdReached, limitExceeded };
  }

  const formatted = totalForeignEur.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const message = limitExceeded
    ? `Tus inversiones en plataformas extranjeras suman ${formatted} € — has superado el umbral de 50.000 € del Modelo 720. Revisa si tienes que declararlo (Crowdfolio no genera el formulario).`
    : `Tus inversiones en plataformas extranjeras suman ${formatted} € y se acercan al umbral de 50.000 € del Modelo 720.`;

  return {
    totalForeignEur,
    thresholdReached,
    limitExceeded,
    requirement: { rule: 'foreign_720_radar', severity: 'informative', message },
  };
}
