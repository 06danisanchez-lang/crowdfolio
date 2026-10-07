import type { PaymentType, Platform } from '@/types/investment';

/**
 * Retención a cuenta del IRPF sobre los rendimientos del capital mobiliario.
 *
 * Las plataformas españolas de financiación participativa retienen el 19 % de
 * los intereses y dividendos que pagan a residentes en España (art. 101.4 LIRPF
 * y art. 99 RIRPF). Las extranjeras no practican retención española.
 *
 * Esto es solo el valor por defecto que se propone al registrar un cobro: el
 * usuario lo puede cambiar, y nunca se aplica a cobros ya guardados.
 */

export const SPANISH_WITHHOLDING_RATE = 0.19;

/** Plataformas del catálogo con sede en España (retienen el 19 %). */
const SPANISH_PLATFORMS: ReadonlySet<Platform> = new Set<Platform>([
  'urbanitae', 'housers', 'brickstarter', 'wecity',
]);

/** Solo intereses y dividendos llevan retención. El capital devuelto, la prima
 * de emisión y las ganancias patrimoniales por liquidación o venta no. */
export function isWithholdingApplicable(type: PaymentType): boolean {
  return type === 'interest' || type === 'dividend';
}

/** 0,19 en plataformas españolas conocidas. 0 en extranjeras y en 'other',
 * porque no sabemos si la plataforma es española. */
export function getDefaultWithholdingRate(platform: Platform | null | undefined): number {
  return platform && SPANISH_PLATFORMS.has(platform) ? SPANISH_WITHHOLDING_RATE : 0;
}

export function isSpanishPlatform(platform: Platform | null | undefined): boolean {
  return !!platform && SPANISH_PLATFORMS.has(platform);
}

const round2 = (v: number) => Math.round(v * 100) / 100;

/** Retención propuesta para un cobro, en euros. */
export function getDefaultWithholding(
  amount: number,
  type: PaymentType,
  platform: Platform | null | undefined,
): number {
  if (!Number.isFinite(amount) || amount <= 0 || !isWithholdingApplicable(type)) return 0;
  return round2(amount * getDefaultWithholdingRate(platform));
}

/** Valida una retención introducida a mano: entre 0 y el importe bruto. */
export function validateWithholding(withholding: number, amount: number): string | null {
  if (!Number.isFinite(withholding) || withholding < 0) return 'La retención no puede ser negativa.';
  if (withholding > amount) return 'La retención no puede ser mayor que el importe bruto.';
  return null;
}

export interface MissingWithholdingSummary {
  /** Cobros de intereses o dividendos de plataformas españolas sin retención. */
  count: number;
  /** Suma de sus importes brutos. */
  amount: number;
  /** Inversiones afectadas, para que el usuario sepa dónde corregir. */
  investmentIds: string[];
}

/**
 * Cobros que probablemente tienen retención pero no la tienen registrada:
 * intereses o dividendos de una plataforma española con retención 0. Hasta
 * oct 2026 la app no guardaba la retención de ningún cobro, así que los datos
 * anteriores están todos así. No se corrigen solos: solo se avisa.
 */
export function findIncomeWithoutWithholding(
  payments: { investment_id: string; type: string; amount: number; withholding_applied: number | null }[],
  platformByInvestment: Map<string, Platform | null | undefined>,
): MissingWithholdingSummary {
  const missing = payments.filter(p =>
    (p.type === 'interest' || p.type === 'dividend') &&
    !(p.withholding_applied && p.withholding_applied > 0) &&
    isSpanishPlatform(platformByInvestment.get(p.investment_id)),
  );
  return {
    count: missing.length,
    amount: round2(missing.reduce((s, p) => s + p.amount, 0)),
    investmentIds: [...new Set(missing.map(p => p.investment_id))],
  };
}
