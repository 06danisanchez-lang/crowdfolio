// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { attributionMetadata, captureAttribution, parseAttribution, readAttribution } from './attribution';

describe('attribution', () => {
  beforeEach(() => localStorage.clear());

  it('lee utm_source, utm_campaign y ref', () => {
    expect(parseAttribution('?utm_source=ig&utm_campaign=cartera&x=1', 5)).toEqual({
      source: 'ig', campaign: 'cartera', ref: null, at: 5,
    });
  });

  it('sin etiquetas no guarda nada', () => {
    captureAttribution('?modo=registro', 1);
    expect(readAttribution(2)).toBeNull();
  });

  it('el último enlace sustituye al anterior', () => {
    captureAttribution('?utm_source=telegram', 1);
    captureAttribution('?utm_source=ig&utm_campaign=cartera', 2);
    expect(attributionMetadata(3)).toEqual({ signup_source: 'ig', signup_campaign: 'cartera' });
  });

  it('una visita sin etiquetas no borra la procedencia', () => {
    captureAttribution('?utm_source=ig', 1);
    captureAttribution('', 2);
    expect(attributionMetadata(3)).toEqual({ signup_source: 'ig' });
  });

  it('caduca a los 30 días', () => {
    captureAttribution('?ref=tg-pa', 0);
    expect(attributionMetadata(31 * 24 * 60 * 60 * 1000)).toBeNull();
  });
});
