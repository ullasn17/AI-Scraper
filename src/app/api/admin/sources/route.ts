import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { Source } from '@/models/Source';
import { AuditLog } from '@/models/AuditLog';
import { requireAdmin } from '@/lib/auth/session';
import { validateSafeUrl } from '@/lib/security/urlValidator';
import { executeCrawl } from '@/scraper/crawler';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    await connectDB();

    const sources = await Source.find().sort({ createdAt: -1 }).lean();
    return NextResponse.json({ sources });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    const status = message === 'FORBIDDEN' ? 403 : message === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    const body = await req.json();
    const { name, baseUrl, allowedDomains, governmentLevel, state, ministry, crawlFrequencyHours, permissionNotes } = body;

    if (!name || !baseUrl) {
      return NextResponse.json({ error: 'Name and baseUrl are required' }, { status: 400 });
    }

    // SSRF URL validation
    const urlValidation = validateSafeUrl(baseUrl);
    if (!urlValidation.isValid) {
      return NextResponse.json({ error: `Invalid or unsafe Base URL: ${urlValidation.error}` }, { status: 400 });
    }

    await connectDB();

    const host = new URL(baseUrl).hostname;
    const domains = allowedDomains && allowedDomains.length > 0 ? allowedDomains : [host];

    const source = await Source.create({
      name,
      baseUrl: urlValidation.normalizedUrl,
      allowedDomains: domains,
      governmentLevel: governmentLevel || 'CENTRAL',
      state: state || undefined,
      ministry: ministry || undefined,
      crawlFrequencyHours: crawlFrequencyHours || 24,
      permissionNotes: permissionNotes || 'Official open government website',
      isEnabled: true,
    });

    await AuditLog.create({
      action: 'CREATE_SOURCE',
      actorId: admin.userId,
      actorEmail: admin.email,
      targetType: 'SOURCE',
      targetId: String(source._id),
      details: { name: source.name, baseUrl: source.baseUrl },
    });

    // Automatically trigger immediate background crawl & analysis on newly added source
    executeCrawl({
      sourceId: String(source._id),
      targetUrl: source.baseUrl,
      forceAI: true,
    }).catch((err) => {
      console.error(`[AutoCrawl] Error analyzing newly added source ${source.name}:`, err);
    });

    return NextResponse.json({ success: true, source });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    const status = message === 'FORBIDDEN' ? 403 : message === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
