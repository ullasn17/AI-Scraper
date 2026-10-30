import { describe, it, expect } from 'vitest';
import { validateSafeUrl } from '../../src/lib/security/urlValidator';

describe('SSRF Protection & URL Validation', () => {
  it('should block localhost and loopback addresses', () => {
    expect(validateSafeUrl('http://localhost:3000').isValid).toBe(false);
    expect(validateSafeUrl('http://127.0.0.1/admin').isValid).toBe(false);
    expect(validateSafeUrl('http://[::1]/').isValid).toBe(false);
  });

  it('should block cloud metadata addresses', () => {
    expect(validateSafeUrl('http://169.254.169.254/latest/meta-data/').isValid).toBe(false);
    expect(validateSafeUrl('http://metadata.google.internal/').isValid).toBe(false);
  });

  it('should block private RFC 1918 subnets', () => {
    expect(validateSafeUrl('http://10.0.0.5/internal').isValid).toBe(false);
    expect(validateSafeUrl('http://192.168.1.1/').isValid).toBe(false);
    expect(validateSafeUrl('http://172.16.0.10/').isValid).toBe(false);
  });

  it('should block non-http/https protocols', () => {
    expect(validateSafeUrl('file:///etc/passwd').isValid).toBe(false);
    expect(validateSafeUrl('ftp://server/file').isValid).toBe(false);
    expect(validateSafeUrl('javascript:alert(1)').isValid).toBe(false);
  });

  it('should accept valid official government URLs', () => {
    const res = validateSafeUrl('https://www.india.gov.in/topics/education');
    expect(res.isValid).toBe(true);
    expect(res.normalizedUrl).toBe('https://www.india.gov.in/topics/education');
  });

  it('should enforce domain allowlist when provided', () => {
    const allowed = ['india.gov.in', 'myscheme.gov.in'];
    expect(validateSafeUrl('https://www.india.gov.in/service', allowed).isValid).toBe(true);
    expect(validateSafeUrl('https://untrusted-site.com/scheme', allowed).isValid).toBe(false);
  });
});
