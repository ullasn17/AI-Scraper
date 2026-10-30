import { URL } from 'url';

const DISALLOWED_HOSTNAMES = [
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  '[::1]',
  '169.254.169.254', // AWS/GCP instance metadata
  'metadata.google.internal',
];

const PRIVATE_IP_RANGES = [
  /^10\./, // 10.0.0.0/8
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12
  /^192\.168\./, // 192.168.0.0/16
  /^127\./, // 127.0.0.0/8
  /^169\.254\./, // Link-local
];

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  normalizedUrl?: string;
}

export function validateSafeUrl(rawUrl: string, allowedDomains?: string[]): ValidationResult {
  try {
    const parsed = new URL(rawUrl);

    // Only allow HTTP/HTTPS
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { isValid: false, error: `Invalid protocol: ${parsed.protocol}. Only http and https are permitted.` };
    }

    const hostname = parsed.hostname.toLowerCase();

    // Check disallowed hostnames
    if (DISALLOWED_HOSTNAMES.includes(hostname)) {
      return { isValid: false, error: `Disallowed hostname: ${hostname}` };
    }

    // Check private IP ranges
    for (const range of PRIVATE_IP_RANGES) {
      if (range.test(hostname)) {
        return { isValid: false, error: `Private IP address access denied: ${hostname}` };
      }
    }

    // Optional domain allowlist check
    if (allowedDomains && allowedDomains.length > 0) {
      const isAllowed = allowedDomains.some((d) => {
        const cleanDomain = d.trim().toLowerCase();
        return hostname === cleanDomain || hostname.endsWith(`.${cleanDomain}`);
      });

      if (!isAllowed) {
        return {
          isValid: false,
          error: `Domain ${hostname} is not in the source allowlist (${allowedDomains.join(', ')})`,
        };
      }
    }

    // Normalize URL: remove trailing slashes and tracking params
    parsed.hash = '';
    return {
      isValid: true,
      normalizedUrl: parsed.toString(),
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { isValid: false, error: `Malformed URL: ${msg}` };
  }
}
