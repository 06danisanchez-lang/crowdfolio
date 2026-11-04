import { describe, it, expect } from 'vitest';
import { sanitizeAnalyticsUrl } from './analyticsBeforeSend';

describe('sanitizeAnalyticsUrl', () => {
  it('quita tokens del hash y de la query', () => {
    expect(sanitizeAnalyticsUrl('https://www.crowdfolio.es/reset-password?code=abc#access_token=xyz'))
      .toBe('https://www.crowdfolio.es/reset-password');
  });
  it('conserva ref y utm', () => {
    expect(sanitizeAnalyticsUrl('https://www.crowdfolio.es/?ref=tg-pa&utm_source=telegram&x=1'))
      .toBe('https://www.crowdfolio.es/?ref=tg-pa&utm_source=telegram');
  });
});
