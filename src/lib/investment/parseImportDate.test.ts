import { describe, it, expect } from 'vitest';
import { parseImportDate } from './parseImportDate';

// vitest.config.ts fija TZ=Europe/Madrid (offset positivo, con horario de verano).
describe('parseImportDate', () => {
  it('YYYY-MM-DD se guarda tal cual (antes restaba un día)', () => {
    expect(parseImportDate('2024-01-01')).toBe('2024-01-01');
    expect(parseImportDate('2024-07-31')).toBe('2024-07-31');
  });

  it('dd/mm/yyyy se interpreta con el día primero', () => {
    expect(parseImportDate('01/02/2024')).toBe('2024-02-01');
    expect(parseImportDate('13/01/2024')).toBe('2024-01-13');
    expect(parseImportDate('1/1/2024')).toBe('2024-01-01');
    expect(parseImportDate('31-12-2025')).toBe('2025-12-31');
    expect(parseImportDate('15.03.2026')).toBe('2026-03-15');
  });

  it('fecha y hora ISO en UTC: el día local que eligió el usuario', () => {
    // Medianoche del 1 de enero en Madrid (CET, UTC+1) guardada en UTC.
    expect(parseImportDate('2023-12-31T23:00:00.000Z')).toBe('2024-01-01');
    // Medianoche del 1 de julio en Madrid (CEST, UTC+2).
    expect(parseImportDate('2024-06-30T22:00:00.000Z')).toBe('2024-07-01');
  });

  it('rechaza fechas inexistentes o ambiguas, sin adivinar', () => {
    expect(parseImportDate('31/02/2024')).toBeNull();
    expect(parseImportDate('2024-13-01')).toBeNull();
    expect(parseImportDate('01/01/24')).toBeNull();
    expect(parseImportDate('enero 2024')).toBeNull();
    expect(parseImportDate('')).toBeNull();
    expect(parseImportDate(undefined)).toBeNull();
  });
});
