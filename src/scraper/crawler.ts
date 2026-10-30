import connectDB from '../lib/mongodb';
import { Source, ISource } from '../models/Source';
import { Scheme } from '../models/Scheme';
import { CrawlJob, ICrawlJob } from '../models/CrawlJob';
import { SchemeVersion } from '../models/SchemeVersion';
import { fetchWithPolicy } from './fetcher';
import { extractCleanHtml } from './html-extractor';
import { extractTextFromPdf } from './pdf-extractor';
import { computeContentHash, generateSlug, normalizeUrl, validateSchemeQuality, findDuplicateScheme } from './deduplicator';
import { extractSchemesWithGroq, ExtractedSchemeType } from '../lib/ai/groq';

export interface CrawlOptions {
  sourceId?: string;
  targetUrl?: string;
  forceAI?: boolean;
}

export async function executeCrawl(options: CrawlOptions = {}): Promise<ICrawlJob> {
  await connectDB();

  // Find target source
  let source: ISource | null = null;
  if (options.sourceId) {
    source = await Source.findById(options.sourceId);
  } else if (options.targetUrl) {
    const urlObj = new URL(options.targetUrl);
    source = await Source.findOne({ allowedDomains: urlObj.hostname });
  } else {
    // Pick next enabled source
    source = await Source.findOne({ isEnabled: true }).sort({ lastCrawledAt: 1 });
  }

  const crawlUrl = options.targetUrl || source?.baseUrl;
  if (!crawlUrl) {
    throw new Error('No crawl URL or approved source available');
  }

  // Create initial CrawlJob record
  const job = await CrawlJob.create({
    sourceId: source?._id,
    targetUrl: crawlUrl,
    status: 'RUNNING',
    startedAt: new Date(),
    schemesFound: 0,
    schemesCreated: 0,
    schemesUpdated: 0,
    logs: [`[${new Date().toISOString()}] Started crawl on ${crawlUrl}`],
  });

  try {
    const allowedDomains = source?.allowedDomains || [new URL(crawlUrl).hostname];
    const fetchRes = await fetchWithPolicy(crawlUrl, allowedDomains, 20000);
    job.logs.push(`[${new Date().toISOString()}] Fetched HTTP ${fetchRes.statusCode} (${fetchRes.contentType})`);

    let primaryRawText = '';
    let extractedLinks: string[] = [];

    if (fetchRes.contentType.includes('application/pdf')) {
      const pdfRes = await extractTextFromPdf(fetchRes.buffer);
      primaryRawText = pdfRes.text;
      job.logs.push(`[${new Date().toISOString()}] Extracted PDF content: ${pdfRes.numPages} pages, ${primaryRawText.length} chars`);
    } else {
      const htmlRes = extractCleanHtml(fetchRes.text, fetchRes.url);
      primaryRawText = htmlRes.cleanedText;
      extractedLinks = htmlRes.links;
      job.logs.push(`[${new Date().toISOString()}] Extracted HTML content: ${primaryRawText.length} chars, ${extractedLinks.length} links`);
    }

    if (primaryRawText.length < 40) {
      throw new Error('Extracted content too short or empty');
    }

    const normalizedTarget = normalizeUrl(crawlUrl);
    const pagesToAnalyze: Array<{ url: string; text: string }> = [
      { url: normalizedTarget, text: primaryRawText }
    ];

    // Follow relevant sub-links (notifications, recruitments, schemes, admissions, exams)
    const RELEVANT_LINK_REGEX = /(scheme|yojana|recruit|notif|advt|cbt|apply|admission|cet|kset|kreis|ugcet|dcet|pgcet|alp|technician|je|ntpc|job|vacancy|post|bulletin)/i;
    const candidateLinks = extractedLinks
      .filter((link) => {
        try {
          const u = new URL(link);
          const isSameDomain = allowedDomains.some((d) => u.hostname === d || u.hostname.endsWith(`.${d}`));
          return isSameDomain && RELEVANT_LINK_REGEX.test(link) && link !== crawlUrl;
        } catch {
          return false;
        }
      })
      .slice(0, 3); // crawl top 3 most relevant sub-pages

    for (const childUrl of candidateLinks) {
      try {
        job.logs.push(`[${new Date().toISOString()}] Following sub-link: ${childUrl}`);
        const childRes = await fetchWithPolicy(childUrl, allowedDomains, 15000);
        if (childRes.contentType.includes('application/pdf')) {
          const pdfRes = await extractTextFromPdf(childRes.buffer);
          if (pdfRes.text.length > 50) {
            pagesToAnalyze.push({ url: normalizeUrl(childUrl), text: pdfRes.text });
          }
        } else {
          const childHtml = extractCleanHtml(childRes.text, childRes.url);
          if (childHtml.cleanedText.length > 50) {
            pagesToAnalyze.push({ url: normalizeUrl(childUrl), text: childHtml.cleanedText });
          }
        }
      } catch (err) {
        job.logs.push(`[${new Date().toISOString()}] Skipping sub-link ${childUrl}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // Run AI structured extraction on all collected pages
    const allDiscoveredSchemes: ExtractedSchemeType[] = [];
    for (const page of pagesToAnalyze) {
      job.logs.push(`[${new Date().toISOString()}] Analyzing page with Groq AI: ${page.url}`);
      const pageSchemes = await extractSchemesWithGroq(page.text, page.url);
      job.logs.push(`[${new Date().toISOString()}] Discovered ${pageSchemes.length} schemes/applications on ${page.url}`);
      for (const s of pageSchemes) {
        allDiscoveredSchemes.push(s);
      }
    }

    if (allDiscoveredSchemes.length === 0) {
      job.logs.push(`[${new Date().toISOString()}] No structured schemes or notifications found on this portal.`);
      job.status = 'COMPLETED';
      job.completedAt = new Date();
      await job.save();

      if (source) {
        source.lastCrawledAt = new Date();
        source.lastCrawlStatus = 'SUCCESS';
        await source.save();
      }
      return job;
    }

    job.schemesFound = allDiscoveredSchemes.length;

    // Persist discovered schemes with deduplication and quality validation
    for (const extracted of allDiscoveredSchemes) {
      // 1. Quality validation: reject empty tickers, answer keys, or notices without criteria
      const qualityCheck = validateSchemeQuality(extracted);
      if (!qualityCheck.valid) {
        job.logs.push(`[${new Date().toISOString()}] Skipping low-quality/ticker notice: "${extracted.name}" (${qualityCheck.reason})`);
        continue;
      }

      const slug = generateSlug(extracted.name);
      const contentHash = computeContentHash(extracted.name + extracted.summary + extracted.description);

      // 2. Intelligent near-duplicate lookup
      const existingScheme = await findDuplicateScheme(extracted.name, slug);

      if (existingScheme) {
        // Only update if content changed or forced
        if (existingScheme.contentHash !== contentHash || options.forceAI) {
          await SchemeVersion.create({
            schemeId: existingScheme._id,
            version: existingScheme.version,
            snapshot: existingScheme.toObject(),
            changeReason: 'Automated crawler update',
          });

          existingScheme.name = extracted.name;
          existingScheme.summary = extracted.summary;
          existingScheme.description = extracted.description;
          existingScheme.category = extracted.category;
          existingScheme.governmentLevel = extracted.governmentLevel;
          existingScheme.state = extracted.state || undefined;
          existingScheme.ministry = extracted.ministry || undefined;
          existingScheme.benefits = extracted.benefits;
          existingScheme.eligibility = extracted.eligibility;
          existingScheme.requiredDocuments = extracted.requiredDocuments;
          existingScheme.applicationSteps = extracted.applicationSteps;
          existingScheme.beneficiaryGroups = extracted.beneficiaryGroups;
          existingScheme.ageCriteria = extracted.ageCriteria;
          existingScheme.incomeCriteria = extracted.incomeCriteria;
          existingScheme.applicationUrl = extracted.applicationUrl || undefined;
          existingScheme.officialSourceUrl = extracted.officialSourceUrl;
          if (extracted.applicationStartDate) {
            existingScheme.applicationStartDate = new Date(extracted.applicationStartDate);
          }
          if (extracted.applicationEndDate) {
            existingScheme.applicationEndDate = new Date(extracted.applicationEndDate);
          }
          if (source?._id) existingScheme.sourceId = source._id;
          existingScheme.contentHash = contentHash;
          existingScheme.version += 1;
          existingScheme.lastCheckedAt = new Date();
          if (extracted.needsReview) {
            existingScheme.verificationStatus = 'PENDING';
          }
          await existingScheme.save();
          job.schemesUpdated += 1;
          job.logs.push(`[${new Date().toISOString()}] Updated scheme: ${existingScheme.name} (v${existingScheme.version})`);
        } else {
          if (source?._id && !existingScheme.sourceId) {
            existingScheme.sourceId = source._id;
          }
          existingScheme.lastCheckedAt = new Date();
          await existingScheme.save();
          job.logs.push(`[${new Date().toISOString()}] Scheme unchanged: ${existingScheme.name}`);
        }
      } else {
        // Create new scheme or recruitment application
        await Scheme.create({
          name: extracted.name,
          slug,
          summary: extracted.summary,
          description: extracted.description,
          category: extracted.category,
          governmentLevel: extracted.governmentLevel,
          state: extracted.state || undefined,
          ministry: extracted.ministry || undefined,
          benefits: extracted.benefits,
          eligibility: extracted.eligibility,
          requiredDocuments: extracted.requiredDocuments,
          applicationSteps: extracted.applicationSteps,
          beneficiaryGroups: extracted.beneficiaryGroups,
          ageCriteria: extracted.ageCriteria,
          incomeCriteria: extracted.incomeCriteria,
          applicationUrl: extracted.applicationUrl || undefined,
          officialSourceUrl: extracted.officialSourceUrl,
          applicationStartDate: extracted.applicationStartDate ? new Date(extracted.applicationStartDate) : undefined,
          applicationEndDate: extracted.applicationEndDate ? new Date(extracted.applicationEndDate) : undefined,
          contentHash,
          version: 1,
          sourceId: source?._id,
          confidenceScore: 90,
          verificationStatus: extracted.needsReview ? 'PENDING' : 'VERIFIED',
          lastCheckedAt: new Date(),
        });
        job.schemesCreated += 1;
        job.logs.push(`[${new Date().toISOString()}] Created scheme/job: ${extracted.name} (${slug})`);
      }
    }

    job.status = 'COMPLETED';
    job.completedAt = new Date();
    await job.save();

    if (source) {
      source.lastCrawledAt = new Date();
      source.lastCrawlStatus = 'SUCCESS';
      source.errorCount = 0;
      await source.save();
    }

    return job;
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    job.status = 'FAILED';
    job.completedAt = new Date();
    job.errorMessage = errorMsg;
    job.logs.push(`[${new Date().toISOString()}] ERROR: ${errorMsg}`);
    await job.save();

    if (source) {
      source.lastCrawledAt = new Date();
      source.lastCrawlStatus = 'FAILED';
      source.lastErrorMessage = errorMsg;
      source.errorCount = (source.errorCount || 0) + 1;
      await source.save();
    }

    return job;
  }
}
