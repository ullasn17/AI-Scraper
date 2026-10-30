import { validateSafeUrl } from '../lib/security/urlValidator';

export interface FetchResult {
  url: string;
  contentType: string;
  buffer: Buffer;
  text: string;
  statusCode: number;
}

// Allow connection to Indian Government websites with internal NIC / state intermediate certificates
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const DEFAULT_USER_AGENT = 
  process.env.SCRAPER_USER_AGENT || 
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 (compatible; SchemeSathiBot/1.0; +https://schemesathi.gov.in)';

export async function fetchWithPolicy(
  targetUrl: string,
  allowedDomains?: string[],
  timeoutMs = 25000
): Promise<FetchResult> {
  const validation = validateSafeUrl(targetUrl, allowedDomains);
  if (!validation.isValid || !validation.normalizedUrl) {
    throw new Error(`Security validation failed: ${validation.error}`);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(validation.normalizedUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': DEFAULT_USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/pdf,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,hi;q=0.8',
      },
      redirect: 'follow',
    });

    clearTimeout(timeoutId);

    // Verify redirected URL as well for SSRF safety
    if (response.url !== validation.normalizedUrl) {
      const redirectCheck = validateSafeUrl(response.url, allowedDomains);
      if (!redirectCheck.isValid) {
        throw new Error(`Redirect blocked: destination ${response.url} violates security policies`);
      }
    }

    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || 'text/html';
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const text = buffer.toString('utf-8');

    return {
      url: response.url,
      contentType,
      buffer,
      text,
      statusCode: response.status,
    };
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(`Fetch failed for ${targetUrl}: ${msg}`);
  }
}
