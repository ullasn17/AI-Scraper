import crypto from 'crypto';
import { Scheme, IScheme } from '../models/Scheme';

export function computeContentHash(content: string): string {
  return crypto.createHash('sha256').update(content.trim().toLowerCase()).digest('hex');
}

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function normalizeUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    url.hash = '';
    // Sort search parameters for deterministic URL comparison
    const params = Array.from(url.searchParams.entries()).sort(([a], [b]) => a.localeCompare(b));
    url.search = '';
    for (const [k, v] of params) {
      // Omit tracking analytics parameters
      if (!k.startsWith('utm_') && k !== 'fbclid' && k !== 'gclid') {
        url.searchParams.append(k, v);
      }
    }
    // Remove trailing slash
    return url.toString().replace(/\/$/, '');
  } catch {
    return rawUrl.trim();
  }
}

/**
 * Normalizes title for fuzzy deduplication comparison
 * Strips punctuation, years, and common connective words.
 */
export function normalizeTitleForDeduplication(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(202[0-9]|examination|notification|posts|post|scheme|yojana|recruitment)\b/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Validates that an extracted scheme has real, substantive content and is not
 * a vague flash news item, answer key alert, or empty ticket.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function validateSchemeQuality(item: any): { valid: boolean; reason?: string } {
  if (!item.name || item.name.trim().length < 5) {
    return { valid: false, reason: 'Name is too short or missing' };
  }

  const nameLower = item.name.toLowerCase();

  // Blacklist trivial tickers, answer key notices, or provisional lists
  const junkPatterns = [
    /upcoming recruitment/i,
    /examination notification$/i,
    /provisional answer key/i,
    /objection portal/i,
    /stray vacancy round/i,
    /seat allocation notification/i,
    /project profiles$/i,
  ];

  for (const pattern of junkPatterns) {
    if (pattern.test(nameLower)) {
      return { valid: false, reason: `Matches junk ticker pattern: ${pattern.source}` };
    }
  }

  // Must have at least one eligibility criterion or substantive benefit
  const hasEligibility = Array.isArray(item.eligibility) && item.eligibility.length > 0;
  const hasBenefits = Array.isArray(item.benefits) && item.benefits.length > 0;

  if (!hasEligibility && !hasBenefits) {
    return { valid: false, reason: 'Lacks substantive eligibility and benefits criteria' };
  }

  // Ensure summary or description is informative
  const textLen = (item.summary || '').length + (item.description || '').length;
  if (textLen < 60) {
    return { valid: false, reason: 'Summary and description too brief' };
  }

  return { valid: true };
}

/**
 * Finds an existing scheme in MongoDB that is identical or a near-duplicate
 */
export async function findDuplicateScheme(name: string, slug: string): Promise<IScheme | null> {
  // 1. Direct slug or name match
  const directMatch = await Scheme.findOne({
    $or: [{ slug }, { name: new RegExp(`^${name.trim()}$`, 'i') }],
  });
  if (directMatch) return directMatch;

  // 2. Normalized core title match
  const coreTitle = normalizeTitleForDeduplication(name);
  if (coreTitle.length >= 4) {
    const candidates = await Scheme.find({}, { name: 1, slug: 1 }).lean();
    for (const cand of candidates) {
      const candCore = normalizeTitleForDeduplication(cand.name);
      if (candCore.length >= 4 && (coreTitle === candCore || coreTitle.includes(candCore) || candCore.includes(coreTitle))) {
        // Double check words overlap
        const wordsA = new Set(coreTitle.split(' '));
        const wordsB = new Set(candCore.split(' '));
        const intersection = [...wordsA].filter((w) => wordsB.has(w) && w.length >= 3);
        if (intersection.length >= 2 || coreTitle === candCore) {
          const fullScheme = await Scheme.findById(cand._id);
          if (fullScheme) return fullScheme;
        }
      }
    }
  }

  return null;
}
