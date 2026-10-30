import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/session';
import { executeCrawl } from '@/scraper/crawler';
import connectDB from '@/lib/mongodb';
import { AuditLog } from '@/models/AuditLog';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    const body = await req.json();
    const { sourceId, targetUrl, forceAI } = body;

    await connectDB();

    // Trigger crawl execution
    const job = await executeCrawl({
      sourceId,
      targetUrl,
      forceAI: Boolean(forceAI),
    });

    await AuditLog.create({
      action: 'TRIGGER_CRAWL',
      actorId: admin.userId,
      actorEmail: admin.email,
      targetType: 'CRAWL_JOB',
      targetId: String(job._id),
      details: { sourceId, targetUrl, status: job.status },
    });

    return NextResponse.json({ success: true, job });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error in crawler execution';
    const status = message === 'FORBIDDEN' ? 403 : message === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
