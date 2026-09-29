import { describe, it, expect } from 'vitest';
import { getPlatformLabel } from './labels';

describe('getPlatformLabel', () => {
  it('plataforma conocida → etiqueta del catálogo, nunca el identificador en minúsculas', () => {
    expect(getPlatformLabel('urbanitae')).toBe('Urbanitae');
    expect(getPlatformLabel('wecity')).toBe('Wecity');
    expect(getPlatformLabel('crowdcube')).toBe('Crowdcube');
    expect(getPlatformLabel('brickstarter')).toBe('Brickstarter');
  });

  it("platform 'other' con nombre personalizado → el nombre personalizado", () => {
    expect(getPlatformLabel('other', 'Civislend')).toBe('Civislend');
  });

  it("platform 'other' sin nombre personalizado → la etiqueta del catálogo ('Otra')", () => {
    expect(getPlatformLabel('other')).toBe('Otra');
    expect(getPlatformLabel('other', undefined)).toBe('Otra');
  });

  // Regresión del bug en useTaxSummary.ts: comprobaba `platform === 'custom'`,
  // un valor que Platform nunca tiene (el tipo usa 'other') — así que el
  // nombre personalizado nunca se sustituía y siempre se mostraba el
  // identificador en bruto.
  it("platform 'custom' no es un valor real — nunca debe confundirse con 'other'", () => {
    // Sin coincidencia en el catálogo (no hay 'custom' en PLATFORMS) y sin nombre
    // personalizado, cae al fallback capitalizado — nunca al identificador en bruto.
    expect(getPlatformLabel('custom')).toBe('Custom');
    expect(getPlatformLabel('custom')).not.toBe('custom');
  });

  it('plataforma desconocida sin nombre personalizado → capitalizada, nunca en minúsculas', () => {
    expect(getPlatformLabel('somenewplatform')).toBe('Somenewplatform');
  });
});
