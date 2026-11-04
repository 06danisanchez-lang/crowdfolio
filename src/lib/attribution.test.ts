import { describe, it, expect } from 'vitest';
import { parseAttribution } from './attribution';

const now = new Date('2026-11-04T19:00:00Z');

describe('parseAttribution', () => {
  it('guarda ?ref= y utm del enlace', () => {
    const a = parseAttribution('https://www.crowdfolio.es/landing?ref=tg-pa&utm_source=telegram', '', now);
    expect(a).toMatchObject({ ref: 'tg-pa', utm_source: 'telegram', landing: '/landing', first_seen: now.toISOString() });
  });
  it('sin parámetros, guarda solo el dominio de procedencia', () => {
    const a = parseAttribution('https://www.crowdfolio.es/', 'https://www.rankia.com/foros/x?y=1', now);
    expect(a).toMatchObject({ referrer: 'rankia.com' });
    expect(a?.ref).toBeUndefined();
  });
  it('no cuenta como origen la navegación dentro de la propia web', () => {
    expect(parseAttribution('https://www.crowdfolio.es/auth', 'https://crowdfolio.es/landing', now)).toBeNull();
  });
  it('sin parámetros ni procedencia devuelve null', () => {
    expect(parseAttribution('https://www.crowdfolio.es/', '', now)).toBeNull();
  });
  it('recorta valores muy largos', () => {
    const a = parseAttribution(`https://www.crowdfolio.es/?ref=${'x'.repeat(200)}`, '', now);
    expect(a?.ref?.length).toBe(80);
  });
});
