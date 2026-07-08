import { describe, it, expect } from 'vitest';
import { resolveCaptureUrl } from '../../src/extension/services/ScreenshotService';

const BASE = 'http://localhost:5174';

describe('resolveCaptureUrl', () => {
  it('returns the base URL for empty input or "/"', () => {
    expect(resolveCaptureUrl(BASE, '')).toBe(BASE);
    expect(resolveCaptureUrl(BASE, '  ')).toBe(BASE);
    expect(resolveCaptureUrl(BASE, '/')).toBe(BASE);
  });

  it('joins absolute paths onto the server origin', () => {
    expect(resolveCaptureUrl(BASE, '/login')).toBe('http://localhost:5174/login');
    expect(resolveCaptureUrl(`${BASE}/`, '/login')).toBe('http://localhost:5174/login');
  });

  it('supports bare relative paths and hash routes', () => {
    expect(resolveCaptureUrl(BASE, 'login')).toBe('http://localhost:5174/login');
    expect(resolveCaptureUrl(BASE, '#/dashboard')).toBe('http://localhost:5174/#/dashboard');
  });

  it('passes full URLs through untouched', () => {
    expect(resolveCaptureUrl(BASE, 'http://localhost:3000/admin')).toBe(
      'http://localhost:3000/admin',
    );
    expect(resolveCaptureUrl(BASE, 'HTTPS://example.test/x')).toBe('HTTPS://example.test/x');
  });

  it('keeps query strings', () => {
    expect(resolveCaptureUrl(BASE, '/products?sort=new')).toBe(
      'http://localhost:5174/products?sort=new',
    );
  });
});
