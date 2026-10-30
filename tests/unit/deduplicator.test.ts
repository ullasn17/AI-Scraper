import { describe, it, expect } from 'vitest';
import { generateSlug, computeContentHash, normalizeUrl } from '../../src/scraper/deduplicator';

describe('Deduplicator & Hash Utilities', () => {
  it('should generate clean URL-safe slugs from scheme names', () => {
    expect(generateSlug('PM Kisan Samman Nidhi (PM-KISAN)')).toBe('pm-kisan-samman-nidhi-pm-kisan');
    expect(generateSlug('Karnataka Yuva Nidhi 2026')).toBe('karnataka-yuva-nidhi-2026');
  });

  it('should generate deterministic sha256 hashes for content comparison', () => {
    const hash1 = computeContentHash('Scheme Content Text');
    const hash2 = computeContentHash('scheme content text');
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
  });

  it('should normalize URLs removing tracking query parameters and trailing slashes', () => {
    const url = 'https://myscheme.gov.in/schemes/pm-kisan/?utm_source=google&utm_medium=cpc#overview';
    const normalized = normalizeUrl(url);
    expect(normalized).toBe('https://myscheme.gov.in/schemes/pm-kisan');
  });
});
