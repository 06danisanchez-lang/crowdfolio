/**
 * Inversiones y cobros en otra divisa.
 *
 * CONVENCIÓN ÚNICA (columnas exchange_rate de investments y payments):
 *   exchange_rate = euros por 1 unidad de la divisa
 *   importe en euros = importe original × exchange_rate
 * Es el inverso de cómo publica el BCE ("1 EUR = X divisa"). La Edge Function
 * `exchange-rate` ya devuelve `rate` en esta convención.
 *
 * `amount` (inversión y cobro) es SIEMPRE euros y es lo único que usan los
 * cálculos de cartera y el informe fiscal. Los campos de divisa son el
 * rastro de cómo se llegó a esos euros.
 *
 * Toda conversión pasa por convertToEur: la fórmula vive en un solo sitio
 * para que no pueda quedar invertida en ningún punto.
 */
import type { ExchangeRateSource, Investment, Payment, Platform } from '@/types/investment';
import { PLATFORMS } from '@/types/investment';
import { formatSpanishNumber } from '@/lib/investment/parseSpanishNumber';

export const EUR = 'EUR';

/** Divisas con tipo de referencia diario del BCE (las que la Edge Function sabe resolver). */
export const ECB_CURRENCIES: { code: string; label: string }[] = [
  { code: 'EUR', label: 'EUR — Euro' },
  { code: 'GBP', label: 'GBP — Libra esterlina' },
  { code: 'USD', label: 'USD — Dólar estadounidense' },
  { code: 'CHF', label: 'CHF — Franco suizo' },
  { code: 'SEK', label: 'SEK — Corona sueca' },
  { code: 'DKK', label: 'DKK — Corona danesa' },
  { code: 'NOK', label: 'NOK — Corona noruega' },
  { code: 'PLN', label: 'PLN — Zloty polaco' },
  { code: 'CZK', label: 'CZK — Corona checa' },
  { code: 'HUF', label: 'HUF — Forinto húngaro' },
  { code: 'RON', label: 'RON — Leu rumano' },
  { code: 'CAD', label: 'CAD — Dólar canadiense' },
  { code: 'AUD', label: 'AUD — Dólar australiano' },
  { code: 'JPY', label: 'JPY — Yen japonés' },
  { code: 'MXN', label: 'MXN — Peso mexicano' },
  { code: 'BRL', label: 'BRL — Real brasileño' },
];

const round2 = (v: number) => Math.round(v * 100) / 100;

export function isForeignCurrency(currency: string | null | undefined): currency is string {
  return !!currency && currency !== EUR;
}

/** Divisa que se propone al elegir plataforma en una inversión nueva. */
export function getPlatformDefaultCurrency(platform: Platform | null | undefined): string {
  return PLATFORMS.find(p => p.value === platform)?.defaultCurrency ?? EUR;
}

/** Importe en euros, redondeado a céntimos. Lanza si el tipo no es un número > 0. */
export function convertToEur(originalAmount: number, exchangeRate: number): number {
  if (!Number.isFinite(exchangeRate) || exchangeRate <= 0) {
    throw new Error(`convertToEur: tipo de cambio inválido (${exchangeRate}); debe ser euros por unidad de divisa, > 0`);
  }
  return round2(originalAmount * exchangeRate);
}

/** Lo que el usuario rellena para un importe en otra divisa. */
export interface ForeignAmountInput {
  originalAmount: number | null;
  exchangeRate: number | null;
  exchangeRateDate: string | null;
  exchangeRateSource: ExchangeRateSource | null;
}

export const EMPTY_FOREIGN_AMOUNT: ForeignAmountInput = {
  originalAmount: null, exchangeRate: null, exchangeRateDate: null, exchangeRateSource: null,
};

/** Euros del importe, o null si falta el importe o el tipo de cambio. */
export function foreignAmountToEur(input: ForeignAmountInput): number | null {
  if (input.originalAmount == null || !(input.originalAmount > 0)) return null;
  if (input.exchangeRate == null || !(input.exchangeRate > 0)) return null;
  return convertToEur(input.originalAmount, input.exchangeRate);
}

/**
 * Campos de un cobro en otra divisa listos para guardar. `amount` (euros) es el
 * que entra en todos los cálculos. Devuelve null si falta algún dato.
 */
export function buildForeignPaymentFields(
  currency: string,
  input: ForeignAmountInput,
  fallbackRateDate: string,
): Pick<Payment, 'amount' | 'originalAmount' | 'originalCurrency' | 'exchangeRate' | 'exchangeRateDate' | 'exchangeRateSource' | 'amountEur'> | null {
  const eur = foreignAmountToEur(input);
  if (eur == null || input.originalAmount == null || input.exchangeRate == null) return null;
  return {
    amount: eur,
    amountEur: eur,
    originalAmount: round2(input.originalAmount),
    originalCurrency: currency,
    exchangeRate: input.exchangeRate,
    exchangeRateDate: input.exchangeRateDate ?? fallbackRateDate,
    exchangeRateSource: input.exchangeRateSource ?? 'manual',
  };
}

/**
 * Reparte en la divisa original unos cobros calculados en euros (p. ej. el
 * cierre de un equity: capital + beneficio). Todos comparten el tipo del día.
 */
export function withForeignFields<T extends { amount: number }>(
  payments: T[],
  currency: string,
  exchangeRate: number,
  exchangeRateDate: string,
  exchangeRateSource: ExchangeRateSource,
): (T & Pick<Payment, 'originalAmount' | 'originalCurrency' | 'exchangeRate' | 'exchangeRateDate' | 'exchangeRateSource' | 'amountEur'>)[] {
  return payments.map(p => ({
    ...p,
    originalAmount: round2(p.amount / exchangeRate),
    originalCurrency: currency,
    exchangeRate,
    exchangeRateDate,
    exchangeRateSource,
    amountEur: p.amount,
  }));
}

/** ¿Le faltan a este cobro los datos de divisa que necesita su inversión? */
export function isMissingForeignData(
  investmentCurrency: string | null | undefined,
  payment: Pick<Payment, 'originalAmount' | 'exchangeRate'>,
): boolean {
  if (!isForeignCurrency(investmentCurrency)) return false;
  return !(payment.originalAmount != null && payment.exchangeRate != null && payment.exchangeRate > 0);
}

/** Retención en origen de un cobro, en euros (con el tipo de cambio del propio cobro). */
export function foreignWithholdingEur(payment: Pick<Payment, 'foreignWithholdingAmount' | 'foreignWithholdingCurrency' | 'exchangeRate'>): number {
  const amount = payment.foreignWithholdingAmount;
  if (!amount || amount <= 0) return 0;
  if (!isForeignCurrency(payment.foreignWithholdingCurrency)) return round2(amount);
  if (!payment.exchangeRate || payment.exchangeRate <= 0) return 0;
  return convertToEur(amount, payment.exchangeRate);
}

/** Formato "1.000,00 GBP". */
export function formatForeignAmount(amount: number, currency: string): string {
  return `${formatSpanishNumber(amount)} ${currency}`;
}

/** Formato "1 GBP = 1,1532 €". */
export function formatExchangeRate(rate: number, currency: string): string {
  // Hasta 6 decimales, sin ceros de relleno por la derecha más allá del 4.º
  const text = formatSpanishNumber(rate, 6).replace(/(,\d{4}\d*?)0+$/, '$1');
  return `1 ${currency} = ${text} €`;
}

export interface ExchangeDifference {
  investmentId: string;
  projectName: string;
  currency: string;
  paymentDate: string;
  /** Capital devuelto en la divisa. */
  originalAmount: number;
  /** Lo que costó ese capital en euros, al tipo del día de la inversión. */
  acquisitionValue: number;
  /** Lo que vale en euros al tipo del día del cobro. */
  transmissionValue: number;
  /** Positivo = ganancia, negativo = pérdida. */
  result: number;
}

/**
 * Diferencias de cambio al recuperar capital de un préstamo en otra divisa.
 * Si prestas 1.000 GBP a 1,15 € (1.150 €) y te devuelven 1.000 GBP a 1,10 €
 * (1.100 €), hay 50 € de pérdida por tipo de cambio. Crowdfolio no la integra
 * en el cálculo: la lista para revisarla y declararla a mano, porque el
 * momento en que se realiza depende de qué hagas con esas libras.
 *
 * Solo préstamos: en equity el resultado del cierre ya se calcula en euros
 * (manualGppOperations) e incluye el efecto del tipo de cambio.
 */
export function computeExchangeDifferences(
  investments: Pick<Investment, 'id' | 'projectName' | 'incomeModel' | 'currency' | 'exchangeRate' | 'payments'>[],
  year: number,
): ExchangeDifference[] {
  const rows: ExchangeDifference[] = [];
  for (const inv of investments) {
    if (!isForeignCurrency(inv.currency) || inv.incomeModel === 'equity') continue;
    if (!inv.exchangeRate || inv.exchangeRate <= 0) continue;
    for (const p of inv.payments ?? []) {
      if (p.type !== 'principal' || !p.date.startsWith(`${year}-`)) continue;
      if (p.originalAmount == null || !p.exchangeRate) continue;
      const acquisitionValue = convertToEur(p.originalAmount, inv.exchangeRate);
      const transmissionValue = round2(p.amount);
      const result = round2(transmissionValue - acquisitionValue);
      if (result === 0) continue;
      rows.push({
        investmentId: inv.id,
        projectName: inv.projectName,
        currency: inv.currency,
        paymentDate: p.date,
        originalAmount: p.originalAmount,
        acquisitionValue,
        transmissionValue,
        result,
      });
    }
  }
  return rows.sort((a, b) => a.paymentDate.localeCompare(b.paymentDate));
}

export interface ForeignIncomeSummary {
  /** Intereses y dividendos de inversiones en otra divisa, en euros. */
  foreignCurrencyIncomeEur: number;
  /** Retención practicada en origen, en euros (art. 80 LIRPF). */
  foreignWithholdingEur: number;
  /** Cobros de inversiones en otra divisa sin tipo de cambio guardado. */
  paymentsMissingFx: number;
}

export function summarizeForeignIncome(
  payments: Pick<Payment, 'type' | 'amount' | 'originalAmount' | 'exchangeRate' | 'foreignWithholdingAmount' | 'foreignWithholdingCurrency'>[],
  currencyOf: (p: (typeof payments)[number]) => string | null | undefined,
): ForeignIncomeSummary {
  let income = 0;
  let withholding = 0;
  let missing = 0;
  for (const p of payments) {
    withholding += foreignWithholdingEur(p);
    const currency = currencyOf(p);
    if (!isForeignCurrency(currency)) continue;
    if (isMissingForeignData(currency, p)) missing++;
    if (p.type === 'interest' || p.type === 'dividend') income += p.amount;
  }
  return {
    foreignCurrencyIncomeEur: round2(income),
    foreignWithholdingEur: round2(withholding),
    paymentsMissingFx: missing,
  };
}
