import { describe, it, expect } from 'vitest';
import { parseSpanishNumber, formatSpanishNumber } from './parseSpanishNumber';

describe('parseSpanishNumber — Importe', () => {
  it('"1500" → 1500', () => {
    expect(parseSpanishNumber('1500')).toEqual({ value: 1500 });
  });

  it('"1.500" → 1500 (punto de millares, NO 1,5)', () => {
    expect(parseSpanishNumber('1.500')).toEqual({ value: 1500 });
  });

  it('"1.500,50" → 1500,50', () => {
    expect(parseSpanishNumber('1.500,50')).toEqual({ value: 1500.5 });
  });

  it('"1500,50" → 1500,50', () => {
    expect(parseSpanishNumber('1500,50')).toEqual({ value: 1500.5 });
  });

  it('"7089" → 7089', () => {
    expect(parseSpanishNumber('7089')).toEqual({ value: 7089 });
  });

  it('"10.000" → 10000', () => {
    expect(parseSpanishNumber('10.000')).toEqual({ value: 10000 });
  });

  it('"1.500.000" → 1500000 (varios puntos de millares)', () => {
    expect(parseSpanishNumber('1.500.000')).toEqual({ value: 1500000 });
  });
});

describe('parseSpanishNumber — Rentabilidad', () => {
  it('"9,5" → 9,5', () => {
    expect(parseSpanishNumber('9,5')).toEqual({ value: 9.5 });
  });

  it('"12" → 12', () => {
    expect(parseSpanishNumber('12')).toEqual({ value: 12 });
  });

  it('"9.5" → se interpreta como 9,5: un solo punto con 1 dígito detrás no puede ser agrupación de miles (le faltarían 2 dígitos), así que se trata como coma decimal escrita por error en formato inglés', () => {
    expect(parseSpanishNumber('9.5')).toEqual({ value: 9.5 });
  });

  it('"12,50" → 12,5 (dos decimales)', () => {
    expect(parseSpanishNumber('12,50')).toEqual({ value: 12.5 });
  });
});

describe('parseSpanishNumber — entradas ambiguas o inválidas: error explícito, nunca un valor adivinado', () => {
  it('"1,500.50" (formato inglés: coma de millares + punto decimal) → error', () => {
    const result = parseSpanishNumber('1,500.50');
    expect(result.value).toBeNull();
    expect(result.error).toBeTruthy();
  });

  it('"abc" → error', () => {
    const result = parseSpanishNumber('abc');
    expect(result.value).toBeNull();
    expect(result.error).toBeTruthy();
  });

  it('"1..5" (puntos consecutivos) → error', () => {
    const result = parseSpanishNumber('1..5');
    expect(result.value).toBeNull();
    expect(result.error).toBeTruthy();
  });

  it('dos comas → error', () => {
    const result = parseSpanishNumber('1,5,6');
    expect(result.value).toBeNull();
    expect(result.error).toBeTruthy();
  });

  it('coma sin dígitos detrás ("1500,") → error', () => {
    const result = parseSpanishNumber('1500,');
    expect(result.value).toBeNull();
    expect(result.error).toBeTruthy();
  });

  it('agrupación de miles inválida ("1.50" — el grupo final no tiene 3 dígitos ni 1-2 de un decimal simple) → interpretado como decimal 1,50', () => {
    // "1.50": un solo punto, 2 dígitos detrás → cae en la misma regla que
    // "9.5": no puede ser agrupación de miles (le falta un dígito), se
    // interpreta como decimal.
    expect(parseSpanishNumber('1.50')).toEqual({ value: 1.5 });
  });

  it('agrupación de miles realmente inválida ("1.5.50") → error', () => {
    const result = parseSpanishNumber('1.5.50');
    expect(result.value).toBeNull();
    expect(result.error).toBeTruthy();
  });

  it('grupo de millares con más de 3 dígitos ("1.5000") → error', () => {
    const result = parseSpanishNumber('1.5000');
    expect(result.value).toBeNull();
    expect(result.error).toBeTruthy();
  });

  it('cadena vacía o solo espacios → sin error, valor null (campo vacío, no inválido)', () => {
    expect(parseSpanishNumber('')).toEqual({ value: null });
    expect(parseSpanishNumber('   ')).toEqual({ value: null });
  });

  it('espacios internos → error (no es un formato reconocido)', () => {
    const result = parseSpanishNumber('1 500');
    expect(result.value).toBeNull();
    expect(result.error).toBeTruthy();
  });
});

describe('formatSpanishNumber', () => {
  it('1500 → "1.500,00"', () => {
    expect(formatSpanishNumber(1500)).toBe('1.500,00');
  });

  it('1234.56 → "1.234,56"', () => {
    expect(formatSpanishNumber(1234.56)).toBe('1.234,56');
  });

  it('9.5 con 2 decimales → "9,50"', () => {
    expect(formatSpanishNumber(9.5)).toBe('9,50');
  });
});
